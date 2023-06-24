// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Create2} from "./lib/Create2.sol";
import {ProxyStorage, ImplStorage} from "./ProxyStorage.sol"; 

// An implementation of a proxy.
// The proxy forwards all calls to the implementation.
// The proxy has an admin.

contract Proxy is 
    ProxyStorage,
    ImplStorage
{
    /* ========== EVENTS ========== */
    event Upgraded(address indexed implementation, uint32 indexed version);
    event AdminChanged(address previousAdmin, address newAdmin);

    modifier onlyAdmin {
        _onlyAdmin();
        _;
    }

    function _onlyAdmin() private view {
        require(msg.sender == _proxyStore().admin, "Only the contract admin may perform this action");
    }

    constructor(address _addressProvider) {
        // Proxy storage.
        _setAdmin(msg.sender);
        _proxyStore().implementation = address(0);
        _proxyStore().version = 0;
        // Impl storage.
        _implStore().addressProvider = _addressProvider;
    }

    /* ========== VIEWS ========== */

    // function getAdmin() public view returns (address) {
    //     return _store().admin;
    // }

    function getImplementation() public view returns (address) {
        return _proxyStore().implementation;
    }

    // function getImplementationVersion() public view returns (uint32) {
    //     return _store().version;
    // }

    function _computeNewDeploymentSalt(uint32 version) public view returns (bytes32) {
        return keccak256(abi.encodePacked(address(this), version));
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    function setProxyAdmin(
        address _admin
    ) 
        public 
        onlyAdmin 
    {
        _setAdmin(_admin);
    }

    function upgradeImplementation(
        bytes memory _newImplementation,
        uint32 version
    ) 
        public 
        onlyAdmin
    {   
        // Deploy the new implementation.
        address instance = Create2.deploy(
            0, 
            _computeNewDeploymentSalt(version), 
            _newImplementation
        );

        _proxyStore().implementation = instance;
        _proxyStore().version = version;
        emit Upgraded(instance, version);
    }

    /* ========= PUBLIC FUNCTIONS ========== */

    /// @dev Fallback function forwards all transactions and returns all received return data.
    function _fallback() internal {
        address _implementation = _proxyStore().implementation;
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

    function _setAdmin(address _admin) internal {
        emit AdminChanged(_proxyStore().admin, _admin);
        _proxyStore().admin = _admin;
    }
}



