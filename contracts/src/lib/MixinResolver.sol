// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import {IGenericResolver} from "../interfaces/IGenericResolver.sol";
import {IMixinResolver} from "../interfaces/IMixinResolver.sol";

// Inheritance
import {IConfigurable} from "../interfaces/IConfigurable.sol";

// Internal references
import {AddressResolver} from "../AddressResolver.sol";
import {ProxyStorage} from "./ProxyStorage.sol";

abstract contract MixinResolver is 
    IMixinResolver,
    IConfigurable,
    ProxyStorage
{
    /* ========== MODIFIERS ========== */

    // Allows only the proxy/deployer to initialize the instance.
    modifier initializer() {
        require(msg.sender == _store().proxy || msg.sender == __deployer(), "Only one of (proxy,deployer) can initialize");
        _;
    }

    /* ========== VIRTUAL FUNCTIONS ========== */

    function resolverAddressesRequired() public virtual override view returns (bytes32[] memory addresses) {}

    /* ========== PUBLIC FUNCTIONS ========== */

    // Configures the instance so it can only be initialized by the proxy/resolver.
    function __configure(address _proxy, address _resolver) public {
        require(_store().proxy == address(0), "ERR_ALREADY_CONFIGURED");
        _store().proxy = _proxy;
        _store().resolver = _resolver;
    }

    function rebuildCache() public override {
        bytes32[] memory requiredAddresses = resolverAddressesRequired();
        // The resolver must call this function whenver it updates its state
        for (uint i = 0; i < requiredAddresses.length; i++) {
            bytes32 name = requiredAddresses[i];
            // Note: can only be invoked once the resolver has all the targets needed added
            address destination =
                addressResolver().requireAndGetAddress(name, string(abi.encodePacked("Resolver missing target: ", name)));
            _store().addressCache[name] = destination;
            emit CacheUpdated(name, destination);
        }
    }

    /* ========== VIEWS ========== */

    function __resolver() public view returns (address) {
        return _store().resolver;
    }

    function __deployer() public view returns (address) {
        return AddressResolver(_store().resolver).owner();
    }

    function isResolverCached() external view override returns (bool) {
        bytes32[] memory requiredAddresses = resolverAddressesRequired();
        for (uint i = 0; i < requiredAddresses.length; i++) {
            bytes32 name = requiredAddresses[i];
            // false if our cache is invalid or if the resolver doesn't have the required address
            if (addressResolver().getAddress(name) != _store().addressCache[name] || _store().addressCache[name] == address(0)) {
                return false;
            }
        }

        return true;
    }

    /* ========== INTERNAL FUNCTIONS ========== */

    function addressResolver() internal view returns (AddressResolver) {
        return AddressResolver(_store().resolver);
    }

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

    function requireAndGetAddress(bytes32 name) internal view override returns (address) {
        address _foundAddress = _store().addressCache[name];
        require(_foundAddress != address(0), string(abi.encodePacked("Missing address: ", name)));
        return _foundAddress;
    }

    function getAddress(bytes32 name) internal view override returns (address) {
        return _store().addressCache[name];
    }
}
