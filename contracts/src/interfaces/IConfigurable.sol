// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

interface IConfigurable {
    function __configure(address proxy, address resolver) external;
}