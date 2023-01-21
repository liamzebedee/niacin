// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity ^0.8.13;

// An implementation of a proxy.
// The proxy forwards all calls to the implementation.
// The proxy has an admin.

import "./lib/MixinResolver.sol";
import "./SystemStatus.sol";

contract ProxyStorage {
    struct ProxyStore {
        address admin;
        address implementation;
        bool init;
    }

    bytes32 constant STORE_SLOT = bytes32(uint(keccak256("eth.nakamofo.proxy")) - 1);

    function _store() internal pure returns (ProxyStore storage store) {
        bytes32 s = STORE_SLOT;
        assembly {
            store.slot := s
        }
    }
}

contract Proxy is 
    ProxyStorage,
    MixinResolver 
{
    constructor(address _resolver) MixinResolver(_resolver) {
        _setProxyAdmin(msg.sender);
    }

    function resolverAddressesRequired() public override pure returns (bytes32[] memory addresses) {
        bytes32[] memory requiredAddresses = new bytes32[](1);
        requiredAddresses[0] = bytes32("SystemStatus");
        return requiredAddresses;
    }

    function systemStatus() internal view returns (SystemStatus) {
        return SystemStatus(requireAndGetAddress(bytes32("SystemStatus")));
    }

    event Upgraded(address indexed implementation);
    event AdminChanged(address previousAdmin, address newAdmin);

    function proxyAdmin() public view returns (address) {
        return _store().admin;
    }

    function implementation() public view returns (address) {
        return _store().implementation;
    }

    function setProxyAdmin(address _admin) public {
        require(msg.sender == _store().admin, "ERR_UNAUTHORISED");
        _setProxyAdmin(_admin);
    }

    function _setProxyAdmin(address _admin) internal {
        emit AdminChanged(_store().admin, _admin);
        _store().admin = _admin;
    }

    function upgrade(address _implementation) public {
        require(msg.sender == _store().admin, "ERR_UNAUTHORISED");
        emit Upgraded(_implementation);
        _store().implementation = _implementation;
    }

    /// @dev Fallback function forwards all transactions and returns all received return data.
    function _fallback() internal {
        address _implementation = _store().implementation;
        assembly {
            calldatacopy(0, 0, calldatasize())
            let success := delegatecall(not(0), _implementation, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch success
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





// contract ImplementationStorage {
//     struct ImplementationStore {
//         address target;
//     }

//     bytes32 constant STORE_SLOT = bytes32(uint(keccak256("eth.nakamofo.implementation")) - 1);

//     function _store() internal pure returns (ImplementationStore storage store) {
//         bytes32 s = STORE_SLOT;
//         assembly {
//             store.slot := s
//         }
//     }
// }

// abstract contract TargetImplementation is 
//     ImplementationStorage 
// {
//     function onProxyUpgrade(address _target) public {
//         _store().target = _target;
//     }

//     function getProxy() public view returns (address) {
//         return _store().target;
//     }
// }