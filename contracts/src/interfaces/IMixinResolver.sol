// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

abstract contract IMixinResolver {
    // External functions.
    function getDependencies() external virtual view returns (bytes32[] memory addresses);
    function isAddressCacheFresh() external virtual view returns (bool);
    function rebuildAddressCache() external virtual;

    // Internal functions.
    function requireAddress(bytes32 name) internal view virtual returns (address);
    function getAddress(bytes32 name) internal view virtual returns (address);

    // Events.
    event CacheUpdated(bytes32 name, address destination);
}