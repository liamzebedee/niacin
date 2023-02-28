// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "@aller/Proxy.sol";
import "@aller/lib/Clones.sol";
import "@aller/AddressResolver.sol";
import {TakeMarket} from "../src/TakeMarket.sol";
import {TakeMarketShares} from "../src/TakeMarketShares.sol";

contract ATest is Test {
    Proxy proxy;

    function setUp() public {
        // Deploy the address resolver, which stores all contract deployments.
        AddressResolver resolver = new AddressResolver(address(this));
        
        // Deploy each contract:
        // (1) The proxy - the stable identity.
        // (2) The implementation.
        Proxy proxy1 = new Proxy(address(resolver));
        TakeMarket takeMarket = new TakeMarket();
        proxy1.upgrade(type(TakeMarket).creationCode, 1);
        
        Proxy proxy2 = new Proxy(address(resolver));
        TakeMarketShares takeMarketShares = new TakeMarketShares();
        proxy2.upgrade(type(TakeMarketShares).creationCode, 1);

        // Import the contracts - (name, proxy) - into the resolver.
        bytes32[] memory names = new bytes32[](2);
        address[] memory destinations = new address[](2);
        names[0] = bytes32("TakeMarket");
        destinations[0] = address(proxy1);
        names[1] = bytes32("TakeMarketShares");
        destinations[1] = address(proxy2);
        
        resolver.importAddresses(names, destinations);

        // Rebuild caches.
        takeMarket.rebuildCache();
        takeMarketShares.rebuildCache();

        // Now test creating a new take shares market.
        takeMarket.getOrCreateTakeSharesContract(2);
    }

    function testNumberIs42() public {
        
    }
}
