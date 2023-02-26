// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity ^0.8.13;

import {TakeMarketSharesFactoryAuthority} from "../lib/TakeMarketSharesFactoryAuthority.sol";

abstract contract ITakeMarketShares is 
    TakeMarketSharesFactoryAuthority
{
    function initialize(
        address _resolver,
        uint256 _id
    ) public virtual;
}