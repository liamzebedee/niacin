// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

interface IAddressResolver {
    // External functions.
    function owner() external view returns (address);
}