
pragma solidity >=0.7.0 <0.9.0;

import {MixinResolver} from "@niacin/mixins/MixinResolver.sol";
import {MixinInitializable} from "@niacin/mixins/MixinInitializable.sol";
import {ERC20} from "./lib/ERC20.sol";

contract MockDAI is 
    MixinResolver,
    MixinInitializable,
    ERC20
{
    constructor()  {}

    function initialize()
        public
        initializer
    {
        ERC20_initialize("MockDAI", "DAI", 18);
        _mint(msg.sender, 1000*1e18);
    }
}