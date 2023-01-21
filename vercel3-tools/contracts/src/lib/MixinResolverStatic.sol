// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity ^0.8.13;

// import {IMixinResolver} from "./interfaces/IMixinResolver.sol";

// Inheritance
import {Owned} from "./Owned.sol";

// Internal references
import {AddressResolver} from "../AddressResolver.sol";

// https://docs.synthetix.io/contracts/source/contracts/mixinresolver
// is IMixinResolver
contract MixinResolverStatic {
    AddressResolver public resolver;

    constructor(address _resolver) {
        resolver = AddressResolver(_resolver);
    }

    function _initialize(address _resolver) internal {
        resolver = AddressResolver(_resolver);
    }

    /* ========== INTERNAL FUNCTIONS ========== */

    function combineArrays(bytes32[] memory first, bytes32[] memory second)
        internal
        pure
        returns (bytes32[] memory combination)
    {
        combination = new bytes32[](first.length + second.length);

        for (uint i = 0; i < first.length; i++) {
            combination[i] = first[i];
        }

        for (uint j = 0; j < second.length; j++) {
            combination[first.length + j] = second[j];
        }
    }

    /* ========== PUBLIC FUNCTIONS ========== */

    // Note: this function is public not external in order for it to be overridden and invoked via super in subclasses
    function resolverAddressesRequired() public virtual view returns (bytes32[] memory addresses) {}

    function rebuildCache() public {}

    /* ========== INTERNAL FUNCTIONS ========== */

    function requireAndGetAddress(bytes32 name) internal view returns (address) {
        address _foundAddress =
                resolver.requireAndGetAddress(name, string(abi.encodePacked("Resolver missing target: ", name)));
        require(_foundAddress != address(0), string(abi.encodePacked("Missing address: ", name)));
        return _foundAddress;
    }

    function getAddress(bytes32 name) internal view returns (address) {
        return resolver.getAddress(name);
    }

    /* ========== EVENTS ========== */

    event CacheUpdated(bytes32 name, address destination);
}
