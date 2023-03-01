// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "./lib/Create2.sol";
import "./interfaces/IConfigurable.sol";
import {ProxyStorage} from "./lib/ProxyStorage.sol"; 

// An implementation of a proxy.
// The proxy forwards all calls to the implementation.
// The proxy has an admin.

contract Proxy is 
    ProxyStorage
{
    /* ========== EVENTS ========== */
    event Upgraded(address indexed implementation, uint32 indexed version);
    event AdminChanged(address previousAdmin, address newAdmin);

    constructor(address _resolver) {
        _setProxyAdmin(msg.sender);
        _store().resolver = _resolver;
        _store().proxy = address(this);
    }

    /* ========== VIEWS ========== */

    function proxyAdmin() public view returns (address) {
        return _store().admin;
    }

    function implementation() public view returns (address) {
        return _store().implementation;
    }

    function implementationVersion() public view returns (uint32) {
        return _store().version;
    }

    function computeNewDeploymentSalt(uint32 version) public view returns (bytes32) {
        return keccak256(abi.encodePacked(address(this), version));
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    function setProxyAdmin(address _admin) public {
        require(msg.sender == _store().admin, "ERR_UNAUTHORISED");

        _setProxyAdmin(_admin);
    }

    function upgrade(bytes memory _newImplementation, uint32 version) public {
        require(msg.sender == _store().admin, "ERR_UNAUTHORISED");
        
        address instance = Create2.deploy(0, computeNewDeploymentSalt(version), _newImplementation);

        // We configure the target so only the system can call the initializer.
        
        // (1) Configure the target in context of the proxy's storage.
        // This only happens once.
        if(_store().proxy == address(0)) {
            IConfigurable(address(this)).__configure(address(this), _store().resolver);
        }

        // (2) Configure the target in context of the implementation's storage.
        // This prevents the implementation from being initialized by anyone but the system.
        // It's not necessary, since users will only interact with the Proxy, which acts in the context of its own storage,
        // but it's a good practice to prevent the implementation from being initialized by anyone.
        IConfigurable(instance).__configure(address(this), _store().resolver);

        _store().implementation = instance;
        _store().version = version;
        emit Upgraded(instance, version);
    }

    /* ========= PUBLIC FUNCTIONS ========== */

    /// @dev Fallback function forwards all transactions and returns all received return data.
    function _fallback() internal {
        address _implementation = _store().implementation;
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

    /* ========== INTERNAL FUNCTIONS ========== */

    function _setProxyAdmin(address _admin) internal {
        emit AdminChanged(_store().admin, _admin);
        _store().admin = _admin;
    }
}



