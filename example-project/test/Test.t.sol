// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import {Proxy} from "@niacin/Proxy.sol";
import {Clones} from "@niacin/lib/Clones.sol";
import {AddressProvider} from "@niacin/AddressProvider.sol";
import {TakeMarket} from "../src/TakeMarket.sol";
import {TakeMarketShares} from "../src/TakeMarketShares.sol";

contract ATest is Test {
    Proxy proxy;

    function setUp() public {
        // Deploy the address resolver, which stores all contract deployments.
        AddressProvider addressProvider = new AddressProvider(address(this));
        
        // Deploy each contract:
        // (1) The proxy - the stable identity.
        // (2) The implementation.
        Proxy proxy1 = new Proxy(address(addressProvider));
        TakeMarket takeMarket = new TakeMarket();
        proxy1.upgradeImplementation(type(TakeMarket).creationCode, 1);
        
        Proxy proxy2 = new Proxy(address(addressProvider));
        TakeMarketShares takeMarketShares = new TakeMarketShares();
        proxy2.upgradeImplementation(type(TakeMarketShares).creationCode, 1);

        // Import the contracts - (name, proxy) - into the resolver.
        bytes32[] memory names = new bytes32[](2);
        address[] memory destinations = new address[](2);
        names[0] = bytes32("TakeMarket");
        destinations[0] = address(proxy1);
        names[1] = bytes32("TakeMarketShares");
        destinations[1] = address(proxy2);
        
        addressProvider.importAddresses(names, destinations);

        // Rebuild caches.
        addressProvider.requireAddress(bytes32("TakeMarket"), "TakeMarket not found");
        addressProvider.requireAddress(bytes32("TakeMarketShares"), "TakeMarketShares not found");
        
        TakeMarket(address(proxy1)).rebuildAddressCache();
        // takeMarketShares.rebuildAddressCache();

        // Now test creating a new take shares market.
        TakeMarket(address(proxy1)).getOrCreateTakeSharesContract(2);
    }

    function testNumberIs42() public {
        
    }
}
