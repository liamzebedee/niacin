// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

struct ProxyStore {
    address admin;
    address implementation;
    uint32 version;

    address resolver;
    address proxy;

    mapping(bytes32 => address) addressCache;
}

// TODO: Forge doesn't support libraries. ugh. This pattern is really nice.
library ProxyStoreUtils {
    function isConfigured(ProxyStore storage self) internal view returns (bool) {
        return self.proxy != address(0);
    }
}

contract ProxyStorage {
    bytes32 constant STORE_SLOT = bytes32(uint(keccak256("eth.nakamofo.proxy")) - 1);

    function _store() internal pure returns (ProxyStore storage store) {
        bytes32 s = STORE_SLOT;
        assembly {
            store.slot := s
        }
    }
}