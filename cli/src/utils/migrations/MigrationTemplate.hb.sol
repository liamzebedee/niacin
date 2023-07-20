// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

interface IProxy {
    function upgradeImplementation(
        bytes memory _newImplementation,
        uint32 version
    ) external returns (address);
}

interface IAddressProvider {
    function importAddresses(
        bytes32[] calldata names, 
        address[] calldata destinations
    ) 
        external;
}

abstract contract IMixinResolver {
    function getDependencies() external virtual view returns (bytes32[] memory addresses);
    function isAddressCacheFresh() external virtual view returns (bool);
    function rebuildAddressCache() external virtual;
}

interface Migration {
    function migrate() external;
}

contract {{ migrationName }} {
    // event DeployProxy(bytes32 target, address proxyAddress);
    // event DeployImpl(bytes32 target, address implAddress);
    event Deploy(bytes32 target, address addr);


    // TODO THINGS TO OPTIMIZE:
    // * deploy target - big calldata for code. only pass if the contract is being deployed.
    // * rebuild cache - extra CALL to addressprovider. only call if the cache is stale.
    // * rebuild cache - check if contract has dependencies. if not, don't include.
    function migrate() public {
        {{#each steps}}
            {{code}}
        {{/each}}
    }

    function _deployer() internal view returns (address) {
        return address(msg.sender);
    }

    function _target(
        address addressProvider,
        bytes32 name,
        bytes memory bytecode
    ) 
        internal 
        returns (address addr) 
    {
        // Deploy proxy.
        {{ variables.proxyInitcode }}
        string memory proxyName = string(abi.encodePacked("Proxy", name));
        addr = _contract(
            0, // amount
            bytes32(bytes(proxyName)), // salt
            proxyInitcode
        );

        // Deploy implementation.
        _contract(
            0, // amount
            name, // salt
            bytecode
        );

        return addr;
    }

    function _contract(
        uint256 amount,
        bytes32 salt,
        bytes memory bytecode
    )
        internal 
        returns (address addr) 
    {
        // Check if the contract exists.
        addr = address(uint160(uint256(keccak256(abi.encodePacked(
            bytes1(0xff),
            _deployer(),
            salt,
            keccak256(bytecode)
        )))));

        // Deploy the contract if it doesn't exist.
        if (addr == address(0)) {
            addr = _deploy(amount, salt, bytecode);
        }

        return addr;
    }

    function _deploy(
        uint256 amount,
        bytes32 salt,
        bytes memory bytecode
    ) 
        internal
        returns (address addr) 
    {
        require(address(this).balance >= amount, "Create2: insufficient balance");
        require(bytecode.length != 0, "Create2: bytecode length is zero");

        /// @solidity memory-safe-assembly
        assembly {
            let ptr := mload(0x40) // Get free memory pointer
            addr := create2(amount, add(bytecode, 0x20), mload(bytecode), salt)

            // Check if the CREATE2 operation reverted
            if iszero(addr) {
                let size := returndatasize()
                returndatacopy(ptr, 0, size)

                // Check if the revert reason exists
                if size {
                    revert(ptr, size)
                }
                revert(ptr, 32) // Default error message if no revert reason is provided
            }
        }

        emit Deploy(salt, addr);

        //require(addr != address(0), "Create2: Failed on deploy");
    }
}