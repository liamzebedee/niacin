// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Internal references
import {AddressProvider} from "../AddressProvider.sol";
import {ImplStorage} from "../ProxyStorage.sol";

abstract contract MixinInitializable is 
    ImplStorage
{
    /* ========== MODIFIERS ========== */

    // Contracts MUST NOT use constructors, as they don't work with the proxy ugprade architecture.
    // Instead, write an initializer function that uses this modifier.
    // ie. function initialize(...) public initializer {}
    modifier initializer() {
        require(_implStore().addressProvider != address(0), "niacin: proxy is not configured");
        require(
            msg.sender == _deployer(), 
            "niacin: only deployer can (re)-initialize"
        );
        _;
    }

    /* ========== VIRTUAL FUNCTIONS ========== */

    /* ========== PUBLIC FUNCTIONS ========== */

    /* ========== VIEWS ========== */

    /* ========== INTERNAL FUNCTIONS ========== */

    function _deployer() internal view returns (address) {
        return AddressProvider(_implStore().addressProvider).owner();
    }
}
