import { ethers } from "ethers"
import { proxy_Artifact } from "../contracts"
// @ts-ignore
import prettierSolidity from "prettier-plugin-solidity";
import { compileSolidity } from "./solidity";
import { Manifest, Targets } from "../types";
import chalk from "chalk";
const prettier = require("prettier");

const hexToSolHex = (str: string) => `hex"${str.slice(2)}"`

export async function generateSolMigration(contractName: string, addressProvider: ethers.Contract, manifest: Manifest, targetsStaged: any[]) {
    const proxyInitcode =
        (new ethers.ContractFactory(
            proxy_Artifact.abi, 
            proxy_Artifact.bytecode.object
        ))
        .getDeployTransaction(
            addressProvider.address
        )
    .data.toString()

    let solcode_targets = ``
    // let solcode_importAddressesDecs = `
    // // For AddressProvider.importAddresses.
    // bytes32[] memory names = new bytes32[](1);
    // address[] memory destinations = new address[](1);
    // `

    for (let artifact of targetsStaged) {
        const name = artifact.contractName
        const previous = manifest.targets.user[name]
        if (!previous) {
            if (solcode_targets.length == 0) {
                solcode_targets += `bytes32 salt;\n`
                solcode_targets += `address proxyAddress;\n`;
                solcode_targets += `address implAddress;\n`;
                solcode_targets += `bytes memory ___proxyCode = ${hexToSolHex(proxyInitcode)};\n`
                solcode_targets += "\n";
            }
            solcode_targets += `//\n`
            solcode_targets += `// ${name}\n`
            solcode_targets += `//\n`
            solcode_targets += `// Deploy proxy.\n`
            solcode_targets += `salt = keccak256(abi.encodePacked("${name}"));\n`
            solcode_targets += `proxyAddress = deploy(0, salt, ___proxyCode);\n`
            solcode_targets += `// Upgrade.\n`
            solcode_targets += `implAddress = IProxy(proxyAddress).upgradeImplementation(${hexToSolHex(artifact.bytecode.object)}, 1);\n`
            solcode_targets += `// Emit event.\n`
            solcode_targets += `emit DeployProxy("${name}", proxyAddress);\n`
            solcode_targets += `emit DeployImpl("${name}", implAddress);\n`
            // solcode_targets += `// AddressProvider import\n`
            // solcode_targets += `names[0] = bytes32("${name}");\ndestinations[0] = proxyAddress;\n`
            // solcode_targets += `IAddressProvider(${addressProvider.address}).importAddresses(names, destinations);`
            solcode_targets += "\n";
        } else {
            const proxy = manifest.targets.system[`Proxy${name}`]
            solcode_targets += `//\n`
            solcode_targets += `// ${name}\n`
            solcode_targets += `//\n`
            // solcode_targets += `// Deploy proxy.\n`
            solcode_targets += `// Upgrade.\n`
            solcode_targets += `implAddress = IProxy(${proxy.address}).upgradeImplementation(${hexToSolHex(artifact.bytecode.object)}, 1);\n`
            solcode_targets += `emit DeployImpl("${name}", implAddress);\n`
        }
    }

    let solcode = `
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

    contract ${contractName} {
        event DeployProxy(bytes32 target, address proxyAddress);
        event DeployImpl(bytes32 target, address implAddress);

        function migrate() public {
            // Deploy proxies and implementations.
            ${solcode_targets}
        }

        function deploy(
            uint256 amount,
            bytes32 salt,
            bytes memory bytecode
        ) internal returns (address addr) {
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

            //require(addr != address(0), "Create2: Failed on deploy");
        }
    }`

    solcode = prettier.format(solcode, {
        plugins: [prettierSolidity],
        parser: "solidity-parse",
    });

    // console.log(solcode)

    const obj = compileSolidity(contractName, solcode)
    const i = new ethers.utils.Interface(
        [
            "function migrate() public"
        ]
    )

    let out = {
        abi: obj.contracts[contractName][contractName].abi,
        bytecode: obj.contracts[contractName][contractName].evm.bytecode.object,
    }

    return out
}

export async function generateSolRebuildCaches(contractName: string, addressProvider: ethers.Contract, targets: Targets) {
    let solcode_importAddresses = ``
    let solcode_rebuildCaches = ``

    // The address provider stores:
    // (target name -> proxy address)
    const names = Object.keys(targets.user).map(ethers.utils.formatBytes32String)
    const destinations = Object.keys(targets.user).map(target => {
        const proxy = targets.system[`Proxy${target}`]
        if (!proxy) {
            throw new Error(`No proxy found for ${target}`)
        }
        if (!proxy.address) {
            throw new Error(`No address found for proxy ${target}`)
        }

        return proxy.address
    })
    const fresh = await addressProvider.areAddressesImported(names, destinations)
    if (!fresh) {
        solcode_importAddresses += `// For AddressProvider.importAddresses.\n`
        solcode_importAddresses += `bytes32[] memory names = new bytes32[](${names.length});\n`
        solcode_importAddresses += `address[] memory destinations = new address[](${names.length});\n`
        for (let i = 0; i < names.length; i++) {
            solcode_importAddresses += `names[${i}] = bytes32("${ethers.utils.parseBytes32String(names[i])}");\n`
            solcode_importAddresses += `destinations[${i}] = ${destinations[i]};\n`
        }
        solcode_importAddresses += `IAddressProvider(${addressProvider.address}).importAddresses(names, destinations);\n`

        console.log(`Imported ${names.length} addresses.`)
    } else {
        console.log(chalk.gray(`No addresses to import.`))
    }

    // 4. Rebuild caches.
    console.log()
    console.log(`4. Rebuilding MixinResolver caches...`)
    console.log()

    // 4.1 Caches for proxies.
    for (let target of Object.values(targets.system)) {
        if (target.target == "AddressProvider") {
            continue
        }

        const MixinResolverABI = [
            'function isAddressCacheFresh() external view returns (bool)',
            'function rebuildAddressCache() external'
        ]
        // TODO code smell w/ addressProvider.provider
        const i = new ethers.Contract(target.address, MixinResolverABI, addressProvider.provider)

        const fullyUniqueId = `Proxy${target.target}`
        console.log(fullyUniqueId)

        let fresh
        try {
            fresh = await i.isAddressCacheFresh()
        } catch (err) {
            console.log(chalk.red(`Error checking cache for ${chalk.yellow(fullyUniqueId)}: ${err}`))
            continue
        }

        if (fresh) {
            console.log(chalk.gray(`Skipping ${chalk.yellow(fullyUniqueId)} - cache is fresh`))
            continue
        } else {
            console.log(`Rebuilding cache for ${chalk.yellow(fullyUniqueId)}`)
            solcode_rebuildCaches += `// Rebuild cache for ${fullyUniqueId}.\n`
            solcode_rebuildCaches += `IMixinResolver(${target.address}).rebuildAddressCache();\n`
        }
    }

    console.log()
    console.log(chalk.gray('Done rebuilding caches.'))
    console.log()
    


    let solcode = `
    // SPDX-License-Identifier: UNLICENSED
    pragma solidity ^0.8.9;

    abstract contract IMixinResolver {
        function getDependencies() external virtual view returns (bytes32[] memory addresses);
        function isAddressCacheFresh() external virtual view returns (bool);
        function rebuildAddressCache() external virtual;
    }

    interface IAddressProvider {
        function importAddresses(
            bytes32[] calldata names, 
            address[] calldata destinations
        ) external;
    }

    contract ${contractName} {
        function migrate() public {
            // Import addresses.
            ${solcode_importAddresses}

            // Rebuild caches.
            ${solcode_rebuildCaches}
        }
    }`

    solcode = prettier.format(solcode, {
        plugins: [prettierSolidity],
        parser: "solidity-parse",
    });

    // console.log(solcode)

    const obj = compileSolidity(contractName, solcode)
    const i = new ethers.utils.Interface(
        [
            "function migrate() public"
        ]
    )
    
    let out = {
        bytecode: obj.contracts[contractName][contractName].evm.bytecode.object,
    }

    return out
}