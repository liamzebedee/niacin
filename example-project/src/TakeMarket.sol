// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity ^0.8.13;

import "./interfaces/ITakeMarketShares.sol";
import "@niacin/lib/Clones.sol";
import {MixinResolver} from "@niacin/mixins/MixinResolver.sol";
import {MixinInitializable} from "@niacin/mixins/MixinInitializable.sol";
import {ImplStorage} from "@niacin/ProxyStorage.sol";
import {TakeMarketShares} from "./TakeMarketShares.sol";

contract TakeMarket is 
    ImplStorage,
    MixinResolver,
    MixinInitializable
{
    uint public a;
    string public getMessage;

    struct TakeData {
        uint256 id;
        address sharesToken;
    }

    mapping(uint256 => TakeData) public takes;

    function initialize(uint _a) public initializer {
        a = _a;
    }

    function setHello(string memory message) public {
        getMessage = message;
    }

    function getDependencies() public override pure returns (bytes32[] memory addresses) {
        bytes32[] memory requiredAddresses = new bytes32[](2);
        requiredAddresses[0] = bytes32("TakeMarketShares");
        requiredAddresses[1] = bytes32("TakeMarket");
        return requiredAddresses;
    }

    function takeMarketShares() internal view returns (TakeMarketShares) {
        return TakeMarketShares(requireAddress(bytes32("TakeMarketShares")));
    }

    function takeMarket() internal view returns (address) {
        return requireAddress(bytes32("TakeMarket"));
    }

    function getTakeSharesContract(uint256 takeId) public view returns (ITakeMarketShares) {
        bytes32 salt = keccak256(abi.encodePacked(takeId));
        address instance = Clones.predictDeterministicAddress(takeMarketShares(), salt, address(this));
        if(instance.code.length == 0) {
            return ITakeMarketShares(address(0));
        }
        return ITakeMarketShares(instance);
    }

    function create(uint256 takeId) public returns (ITakeMarketShares) {
        TakeData storage take = takes[takeId];
        require(take.id == 0, "TakeMarket: take already exists");

        take.id = takeId;
        take.sharesToken = takeMarketShares().createInstance();
        
        return take.sharesToken;
    }

    // function getOrCreateTakeSharesContract(uint256 takeId) public returns (ITakeMarketShares) {
    //     // address instance = Clones.predictDeterministicAddress(takeMarketShares(), salt, address(this));
    //     // if(instance.code.length == 0) {
    //     //     // Deploy.
    //     //     instance = Clones.cloneDeterministic(takeMarketShares(), salt);
    //     //     ITakeMarketShares i = ITakeMarketShares(instance);
    //     //     // Instantiate template. This permissions only TakeMarket to initialize.
    //     //     i.configureInstance(takeMarket());
    //     //     // Initialize.
    //     //     i.initialize(_implStore().addressProvider, takeId);
    //     // }
    //     // return ITakeMarketShares(instance);
    // }
}
