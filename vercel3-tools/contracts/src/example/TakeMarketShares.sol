// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity ^0.8.13;

import {TakeMarketSharesFactoryAuthority} from "./lib/TakeMarketSharesFactoryAuthority.sol";
import {MixinResolverStatic} from "../lib/MixinResolverStatic.sol";

contract TakeMarketShares is 
    MixinResolverStatic,
    TakeMarketSharesFactoryAuthority
{
    uint256 public id;

    constructor(address _resolver) MixinResolverStatic(_resolver) {
        // Instantiate the default template.
        configureInstance(address(1));
    }

    function initialize(
        address _resolver,
        uint256 _id
    ) public onlyFactory {
        id = _id;
        MixinResolverStatic._initialize(_resolver);
    }
}

interface ITakeMarketSharesV1 {
    function initialize(address factory, uint256 takeId) external;
}