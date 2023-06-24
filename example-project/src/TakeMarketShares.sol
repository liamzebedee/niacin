// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity ^0.8.13;

// import {TakeMarketSharesFactoryAuthority} from "./lib/TakeMarketSharesFactoryAuthority.sol";
// import {MixinResolverStatic} from "@niacin/lib/MixinResolverStatic.sol";
// import {MixinResolver} from "@niacin/mixins/MixinResolver.sol";
import {MixinFactory} from "@niacin/mixins/MixinFactory.sol";
import {MixinInitializable} from "@niacin/mixins/MixinInitializable.sol";

contract TakeMarketShares is 
    MixinFactory,
    MixinInitializable
{
    string public ticker;
    
    function initialize(uint256 _id) public {
        // convert id to one of 10 strings from this array
        string[10] memory decimals = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
        ticker = string(abi.encodePacked("TMS-", decimals[_id]));
    }
}

// contract TakeMarketShares is 
//     MixinResolverStatic,
//     TakeMarketSharesFactoryAuthority
// {
//     uint256 public id;

//     constructor() {
//         // Instantiate the default template.
//         configureInstance(address(1));
//     }

//     function initialize(
//         address _resolver,
//         uint256 _id
//     ) public onlyFactory {
//         id = _id;
//         MixinResolverStatic._initialize(_resolver);
//     }
// }

// interface ITakeMarketSharesV1 {
//     function initialize(address factory, uint256 takeId) external;
// }