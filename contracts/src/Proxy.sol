// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity ^0.8.13;

import "./lib/Create2.sol";
import "./interfaces/IConfigurable.sol";

// An implementation of a proxy.
// The proxy forwards all calls to the implementation.
// The proxy has an admin.

contract ProxyStorage {
    struct ProxyStore {
        address admin;
        address implementation;
        uint32 version;
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
    ProxyStorage
{
    event Upgraded(address indexed implementation, uint32 indexed version);
    event AdminChanged(address previousAdmin, address newAdmin);

    address public resolver;
    bool public configured = false;

    constructor(address _resolver) {
        _setProxyAdmin(msg.sender);
        resolver = _resolver;
    }

    function proxyAdmin() public view returns (address) {
        return _store().admin;
    }

    function implementation() public view returns (address) {
        return _store().implementation;
    }

    function implementationVersion() public view returns (uint32) {
        return _store().version;
    }

    function setProxyAdmin(address _admin) public {
        require(msg.sender == _store().admin, "ERR_UNAUTHORISED");
        _setProxyAdmin(_admin);
    }

    function _setProxyAdmin(address _admin) internal {
        emit AdminChanged(_store().admin, _admin);
        _store().admin = _admin;
    }

    function computeNewDeploymentSalt(uint32 version) public view returns (bytes32) {
        return keccak256(abi.encodePacked(address(this), version));
    }

    function upgrade(bytes memory _newImplementation, uint32 version) public {
        address instance = Create2.deploy(0, computeNewDeploymentSalt(version), _newImplementation);
        if(!configured) {
            IConfigurable(instance).__configure(address(this), resolver);
        }
        _store().implementation = instance;
        _store().version = version;
        emit Upgraded(instance, version);
    }

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
}



