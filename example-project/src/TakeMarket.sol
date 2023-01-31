// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity ^0.8.13;

import "./TakeMarketShares.sol";
import "@vercel3/lib/Clones.sol";
import "@vercel3/lib/MixinResolver.sol";

contract TakeMarket is 
    MixinResolver 
{
    uint public a = 2;

    constructor(address _resolver) MixinResolver(_resolver) {
    }

    function resolverAddressesRequired() public override pure returns (bytes32[] memory addresses) {
        bytes32[] memory requiredAddresses = new bytes32[](2);
        requiredAddresses[0] = bytes32("TakeMarketShares");
        requiredAddresses[1] = bytes32("TakeMarket");
        return requiredAddresses;
    }

    function takeMarketShares() internal view returns (address) {
        return requireAndGetAddress(bytes32("TakeMarketShares"));
    }

    function takeMarket() internal view returns (address) {
        return requireAndGetAddress(bytes32("TakeMarket"));
    }

    function getOrCreateTakeSharesContract(uint256 takeId) public returns (TakeMarketShares) {
        bytes32 salt = keccak256(abi.encodePacked(takeId));
        address instance = Clones.predictDeterministicAddress(takeMarketShares(), salt, address(this));
        if(instance.code.length == 0) {
            // Deploy.
            instance = Clones.cloneDeterministic(takeMarketShares(), salt);
            TakeMarketShares i = TakeMarketShares(instance);
            // Instantiate template. This permissions only TakeMarket to initialize.
            i.configureInstance(takeMarket());
            // Initialize.
            i.initialize(address(resolver), takeId);
        }
        return TakeMarketShares(instance);
    }
}