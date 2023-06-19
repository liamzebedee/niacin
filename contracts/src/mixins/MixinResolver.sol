// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import {IMixinResolver} from "../interfaces/IMixinResolver.sol";

// Internal references
import {AddressProvider} from "../AddressProvider.sol";
import {ImplStorage} from "../ProxyStorage.sol";

abstract contract MixinResolver is 
    IMixinResolver,
    ImplStorage
{
    /* ========== VIRTUAL FUNCTIONS ========== */

    function getDependencies() public virtual override view returns (bytes32[] memory addresses) {}

    /* ========== PUBLIC FUNCTIONS ========== */
    
    // Dynamically links all dependencies into the address cache.
    function rebuildAddressCache() public override {
        bytes32[] memory deps = getDependencies();
        // The resolver must call this function whenver it updates its state
        for (uint i = 0; i < deps.length; i++) {
            bytes32 name = deps[i];
            // Note: can only be invoked once the resolver has all the targets needed added
            address destination =
                addressProvider().requireAddress(name, string(abi.encodePacked("niacin: resolver missing target: ", name)));
            _implStore().addressCache[name] = destination;
            emit CacheUpdated(name, destination);
        }
    }

    /* ========== VIEWS ========== */

    function isAddressCacheFresh() external view override returns (bool) {
        bytes32[] memory requiredAddresses = getDependencies();
        for (uint i = 0; i < requiredAddresses.length; i++) {
            bytes32 name = requiredAddresses[i];
            // false if our cache is invalid or if the resolver doesn't have the required address
            if (addressProvider().getAddress(name) != _implStore().addressCache[name] || _implStore().addressCache[name] == address(0)) {
                return false;
            }
        }

        return true;
    }

    /* ========== INTERNAL FUNCTIONS ========== */

    function addressProvider() internal view returns (AddressProvider) {
        return AddressProvider(_implStore().addressProvider);
    }

    function requireAddress(bytes32 name) internal view override returns (address) {
        address _foundAddress = _implStore().addressCache[name];
        require(_foundAddress != address(0), string(abi.encodePacked("niacin: missing address: ", name)));
        return _foundAddress;
    }

    function getAddress(bytes32 name) internal view override returns (address) {
        return _implStore().addressCache[name];
    }

    /* === HELPERS === */

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
}
