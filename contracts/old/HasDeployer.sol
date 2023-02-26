// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity ^0.8.13;

contract HasDeployer {
    address public deployer;

    function setDeployer(address _deployer) internal {
        deployer = _deployer;
    }
}