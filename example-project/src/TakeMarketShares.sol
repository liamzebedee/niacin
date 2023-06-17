// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity ^0.8.13;

// import {TakeMarketSharesFactoryAuthority} from "./lib/TakeMarketSharesFactoryAuthority.sol";
// import {MixinResolverStatic} from "@aller/lib/MixinResolverStatic.sol";
import {MixinResolver} from "@aller/mixins/MixinResolver.sol";

contract TakeMarketShares is MixinResolver {

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