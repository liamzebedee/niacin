// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity ^0.8.13;

import {IMixinResolver} from "../interfaces/IMixinResolver.sol";

// Inheritance
// import {Owned} from "./Owned.sol";

// Internal references
import {AddressProvider} from "../AddressProvider.sol";

// A version of the resolver mixin which doesn't have a cache. Instead, it just calls out dynamically
// to the resolver for every resolution of a dependency.
// 
// This is useful for factory contracts - in a scenario where you might have 10's of thousands of
// contracts deployed, it becomes costly and infeasible to update their caches. Instead, they can
// just call out to the resolver directly.
contract MixinResolverStatic is
    IMixinResolver
{
    AddressProvider public addressProvider;
    address public proxy;

    // function configure(address _proxy, address _resolver) public {
    //     require(_proxy != address(0), "ERR_ALREADY_CONFIGURED");
    //     proxy = _proxy;
    //     addressProvider = AddressProvider(_resolver);
    // }

    /* ========== INTERNAL FUNCTIONS ========== */

    // function _initialize(address _resolver) internal {
    //     addressProvider = AddressProvider(_resolver);
    // }

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

    function getDependencies() external view override returns (bytes32[] memory addresses) {}

    // rebuildCache is implemented so we can detect if we're using a static resolver.
    function rebuildAddressCache() pure override public {
        revert("ERR_STATIC_RESOLVER");
    }

    function isAddressCacheFresh() pure override public returns (bool) {
        return true;
    }

    /* ========== INTERNAL FUNCTIONS ========== */

    function requireAddress(bytes32 name) internal view override returns (address) {
        address _foundAddress =
                addressProvider.requireAddress(name, string(abi.encodePacked("Resolver missing target: ", name)));
        require(_foundAddress != address(0), string(abi.encodePacked("Missing address: ", name)));
        return _foundAddress;
    }

    function getAddress(bytes32 name) internal view override returns (address) {
        return addressProvider.getAddress(name);
    }
}
