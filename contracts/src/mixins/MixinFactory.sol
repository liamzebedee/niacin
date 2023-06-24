// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Internal references
import {AddressProvider} from "../AddressProvider.sol";
import {
    ProxyStorage,
    ProxyStore,
    
    ImplStorage,
    ImplStore
} from "../ProxyStorage.sol";
import {MixinResolverStatic} from "../lib/MixinResolverStatic.sol";

abstract contract MixinFactory is 
    ImplStorage,
    MixinResolverStatic
{
    /* ========== MODIFIERS ========== */

    /* ========== VIRTUAL FUNCTIONS ========== */

    /* ========== PUBLIC FUNCTIONS ========== */

    function createInstance() external returns (address) {
        // instance -> proxytakemarket -> implementation
        FactoryInstance instance = new FactoryInstance(
            _implStore().addressProvider,
            // pass in the Proxy as a base. This is NOT the implementation, it is the proxy.
            // Calls will resolve like so:
            // call -> factoryinstance -> proxy.implementation
            address(this)
        );
        // instance.initialize(addressProvider);
        return address(instance);
    }

    /* ========== VIEWS ========== */

    /* ========== INTERNAL FUNCTIONS ========== */
}



struct FactoryInstanceStore {
    address addressProvider;
    address baseTarget;
}

contract FactoryInstanceStorage {
    bytes32 constant private STORE_SLOT = bytes32(uint(keccak256("eth.nakamofo.niacin.v1.factory-instance")) - 1);

    function _store() internal pure returns (FactoryInstanceStore storage store) {
        bytes32 s = STORE_SLOT;
        assembly {
            store.slot := s
        }
    }
}

interface IProxy {
    function getImplementation() external view returns (address);
}

contract FactoryInstance is 
    FactoryInstanceStorage 
{
    constructor(address _addressProvider, address _baseTarget) {
        _store().addressProvider = _addressProvider;
        // _store().baseTarget = _baseTarget;
        _store().baseTarget = _baseTarget;
    }

    function addressProvider() internal view returns (AddressProvider) {
        return AddressProvider(_store().addressProvider);
    }

    function base() internal view returns (IProxy) {
        // address baseTarget = addressProvider().requireAddress(_store().baseTarget);
        // return Proxy(baseTarget);
        return IProxy(_store().baseTarget);
    }

    /* ========= PUBLIC FUNCTIONS ========== */

    /// @dev Fallback function forwards all transactions and returns all received return data.
    function _fallback() internal {
        address _implementation = base().getImplementation();
        assembly {
            // Copy msg.data. We take full control of memory in this inline assembly
            // block because it will not return to Solidity code. We overwrite the
            // Solidity scratch pad at memory position 0.
            calldatacopy(0, 0, calldatasize())

            // Call the implementation.
            // out and outsize are 0 because we don't know the size yet.
            let result := delegatecall(gas(), _implementation, 0, calldatasize(), 0, 0)

            // Copy the returned data.
            returndatacopy(0, 0, returndatasize())

            switch result
            // delegatecall returns 0 on error.
            case 0 {
                revert(0, returndatasize())
            }
            default {
                return(0, returndatasize())
            }
        }
    }

    /**
     * @dev Fallback function that delegates calls to the masterCopy. 
     * Runs when no other function in the contract matches the call data.
     */
    fallback () external payable {
        _fallback();
    }

    /**
     * @dev Fallback function that receives ether and delegates calls to masterCopy. 
     * Runs when call data is empty.
     */
    receive () external payable {
        _fallback();
    }
}