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

contract <%= contractName %> {
    // event DeployProxy(bytes32 target, address proxyAddress);
    // event DeployImpl(bytes32 target, address implAddress);
    event Deploy(bytes32 target, address addr);


// TODO THINGS TO OPTIMIZE:
// * deploy target - big calldata for code. only pass if the contract is being deployed.
// * rebuild cache - extra CALL to addressprovider. only call if the cache is stale.
// * rebuild cache - check if contract has dependencies. if not, don't include.

// inputs:
// * targets - every contract in our system that is "staged" (as in, the ideal state)
//   * name
//   * code
//   * proxyAddress (as predicted by create2)
//   * isDeployed
//   * isCacheFresh
// migration_code:
//   * declare addressprovider
//   * declare each target
//   * rebuild caches
// transition:
//   * split migration_code by gas_limit
//   * all of the steps need to be idempotent - ie. they do not rely on state from previous steps (except addressresolver)
//   * we conditionally include the code for each step based on whether the target is deployed or not
    function migrate() public {
        <%= BEGIN_MIGRATION_LABEL %>

        // 
        // 1. Upsert the AddressProvider.
        // 
        address addressProvider = _contract(
            0, // amount
            keccak256(abi.encodePacked("<%= system.addressProvider.name %>")); // salt
            <%= system.addressProvider.code %>
        );

        // 
        // 2. Deploy each target, consisting of a proxy and implementation.
        // 
        <% for (const target of targets) { %>
        <%= MIGRATION_STEP_LABEL %>
            _target(
                addressProvider,
                keccak256(abi.encodePacked("<%= target.name %>")),
                <%= target.code %>
            );
        <% } %>

        // 
        // 3. Rebuild caches.
        // 
        <% for (const target of allTargets) { %>
        if(!IMixinResolver(<%= target.address %>).isAddressCacheFresh()) {
            IMixinResolver(<%= target.address %>).rebuildAddressCache();
        }
        <% } %>

        // 
        // 3. Run initializers.
        // 
        
        <%= END_MIGRATION_LABEL %>
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
        view 
        returns (address addr) 
    {
        // Deploy proxy.
        address addr = _contract(
            0, // amount
            keccak256(abi.encodePacked(name, "proxy")); // salt
            <%= proxyInitcode %>
        );

        // Deploy implementation.
        _contract(
            0, // amount
            keccak256(abi.encodePacked(name, "impl")), // salt
            bytecode
        );

        // Import into AddressProvider.
        bytes32[] memory names = new bytes32[](1);
        bytes32[] memory destinations = new bytes32[](1);
        names[0] = name;
        destinations[0] = addr;
        IAddressProvider(addressProvider).importAddresses(names, destinations);

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
    ) {
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