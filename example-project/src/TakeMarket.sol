// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity ^0.8.13;

import "./interfaces/ITakeMarketShares.sol";
import "@aller/lib/Clones.sol";
import "@aller/lib/MixinResolver.sol";
import "@aller/lib/Initialized.sol";

contract TakeMarket is 
    MixinResolver
{
    uint public a;
    string public getMessage;

    constructor() {
    }

    function initialize(uint _a) public initializer {
        a = 1;
    }

    function setHello(string memory message) public {
        getMessage = message;
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

    function getTakeSharesContract(uint256 takeId) public view returns (ITakeMarketShares) {
        bytes32 salt = keccak256(abi.encodePacked(takeId));
        address instance = Clones.predictDeterministicAddress(takeMarketShares(), salt, address(this));
        if(instance.code.length == 0) {
            return ITakeMarketShares(address(0));
        }
        return ITakeMarketShares(instance);
    }

    function getOrCreateTakeSharesContract(uint256 takeId) public returns (ITakeMarketShares) {
        bytes32 salt = keccak256(abi.encodePacked(takeId));
        address instance = Clones.predictDeterministicAddress(takeMarketShares(), salt, address(this));
        if(instance.code.length == 0) {
            // Deploy.
            instance = Clones.cloneDeterministic(takeMarketShares(), salt);
            ITakeMarketShares i = ITakeMarketShares(instance);
            // Instantiate template. This permissions only TakeMarket to initialize.
            i.configureInstance(takeMarket());
            // Initialize.
            i.initialize(address(resolver), takeId);
        }
        return ITakeMarketShares(instance);
    }
}
