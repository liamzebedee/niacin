// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity ^0.8.13;


contract InitializedStorage {
    struct InitializedStore {
        bool init;
        mapping(bytes32 => bool) initializationCache;
    }

    bytes32 constant STORE_SLOT = bytes32(uint(keccak256("eth.nakamofo.initialized")) - 1);

    function _store() internal pure returns (InitializedStore storage store) {
        bytes32 s = STORE_SLOT;
        assembly {
            store.slot := s
        }
    }
}

abstract contract IHasProxy {
    address public proxy;
}

abstract contract Initialized is 
    IHasProxy,
    InitializedStorage
{
    function isInitialized() public view returns (bool) {
        // bytes32 codeHash;
        // assembly { codeHash := extcodehash(implementation) }
        // bytes32 key = keccak256(abi.encodePacked(codeHash, initializeData));
        // return _store().initializationCache[key] == true;
        return _store().init;
    }

    modifier initializer() {
        require(msg.sender == proxy, "Only the proxy can initialize");
        // require(msg.sender == _deployer, "Only the owner can initialize");
        // require(!_store().init, "Already initialized");
        // _store().init = true;
        // Store the initialization call as H(contract_bytecode, calldata).
        // bytes32 codeHash;
        // address self = address(this);
        // assembly { codeHash := extcodehash(self) }
        // bytes32 key = keccak256(abi.encodePacked(codeHash, msg.data));
        // _store().initializationCache[key] = true;
        _;
    }
}