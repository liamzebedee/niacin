// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

struct ProxyStore {
    // Admin of the proxy.
    address admin;
    // The address of the current implementation.
    address implementation;
    // The version string associated with the implemetnation.
    uint48 version;
}

// This store is consumed by both the proxy and by implementations.
struct ImplStore {
    // An address provider which the implementation uses to resolve dependencies.
    address addressProvider;
    // The proxy for this implementation.
    address proxy;
    // The address cache for the implementation's dependencies.
    mapping(bytes32 => address) addressCache;
}

contract ProxyStorage {
    bytes32 constant private STORE_SLOT = bytes32(uint(keccak256("eth.nakamofo.proxy")) - 1);

    function _proxyStore() internal pure returns (ProxyStore storage store) {
        bytes32 s = STORE_SLOT;
        assembly {
            store.slot := s
        }
    }
}

contract ImplStorage {
    bytes32 constant private STORE_SLOT = bytes32(uint(keccak256("eth.nakamofo.impl")) - 1);

    function _implStore() internal pure returns (ImplStore storage store) {
        bytes32 s = STORE_SLOT;
        assembly {
            store.slot := s
        }
    }
}