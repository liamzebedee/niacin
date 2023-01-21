// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity ^0.8.13;

/// @title  Deposit Factory Authority
/// @notice Contract to secure function calls to the Deposit Factory.
/// @dev    Secured by setting the depositFactory address and using the onlyFactory
///         modifier on functions requiring restriction.
contract TakeMarketSharesFactoryAuthority {
    bool internal _initialized = false;
    address internal _factory;

    /// @notice Set the address of the System contract on contract
    ///         initialization.
    /// @dev Since this function is not access-controlled, it should be called
    ///      transactionally with contract instantiation. In cases where a
    ///      regular contract directly inherits from DepositFactoryAuthority,
    ///      that should happen in the constructor. In cases where the inheritor
    ///      is instead used via a clone factory, the same function that
    ///      creates a new clone should also trigger initialization.
    function instantiate(address __factory) public {
        require(__factory != address(0), "Factory cannot be the zero address.");
        require(!_initialized, "Factory can only be initialized once.");

        _factory = __factory;
        _initialized = true;
    }

    /// @notice Function modifier ensures modified function is only called by set deposit factory.
    modifier onlyFactory() {
        require(_initialized, "Factory initialization must have been called.");
        require(
            msg.sender == _factory,
            "Caller must be factory contract"
        );
        _;
    }
}
