import { ethers } from "ethers"
import { addressProvider_Artifact, proxy_Artifact } from "../contracts"
// @ts-ignore
import prettierSolidity from "prettier-plugin-solidity";
import { compileSolidity } from "./solidity";
import { Manifest, Targets } from "../types";
import chalk from "chalk";
const prettier = require("prettier");
const ejs = require('ejs');

const hexToSolHex = (str: string) => `hex"${str.slice(2)}"`
const fs = require('fs')

const BEGIN_MIGRATION_LABEL = "// NIACIN_BEGIN_MIGRATION"
const END_MIGRATION_LABEL = "// NIACIN_END_MIGRATION"
const MIGRATION_STEP_LABEL = "// NIACIN_MIGRATION_STEP"

export async function generateSolMigration(contractName: string, addressProvider: ethers.Contract, manifest: Manifest, targetsStaged: any[]) {
    // get the path of the package.json file
    // const packageJsonPath = require.resolve('../templates/migration.ejs')
    // get the 
    const { dirname } = require('path');
    const appDir = dirname(require.resolve('../../package.json'));

    const migrationTemplate = fs.readFileSync(
        appDir + '/src/utils/migrations/Migrate.ejs.sol',
        'utf-8'
    )

    console.log(migrationTemplate)
    




    const proxyInitcode =
        (new ethers.ContractFactory(
            proxy_Artifact.abi,
            proxy_Artifact.bytecode.object
        ))
            .getDeployTransaction(
                addressProvider.address
            )
            .data.toString()

    let targets = []
    for (let artifact of targetsStaged) {
        const name = artifact.contractName

        targets.push({
            name,
            implCode: hexToSolHex(artifact.bytecode.object),
        })
    }

    // for (let artifact of targetsStaged) {
    //     const name = artifact.contractName
    //     const previous = manifest.targets.user[name]
    //     if (!previous) {
    //         if (solcode_targets.length == 0) {
    //             solcode_targets += `bytes32 salt;\n`
    //             solcode_targets += `address proxyAddress;\n`;
    //             solcode_targets += `address implAddress;\n`;
    //             solcode_targets += `bytes memory ___proxyCode = ${hexToSolHex(proxyInitcode)};\n`
    //             solcode_targets += "\n";
    //         }
    //         solcode_targets += `//\n`
    //         solcode_targets += `// ${name}\n`
    //         solcode_targets += `//\n`
    //         solcode_targets += `// Deploy proxy.\n`
    //         solcode_targets += `salt = keccak256(abi.encodePacked("${name}"));\n`
    //         solcode_targets += `proxyAddress = deploy(0, salt, ___proxyCode);\n`
    //         solcode_targets += `// Upgrade.\n`
    //         solcode_targets += `implAddress = IProxy(proxyAddress).upgradeImplementation(${hexToSolHex(artifact.bytecode.object)}, 1);\n`
    //         solcode_targets += `// Emit event.\n`
    //         solcode_targets += `emit DeployProxy("${name}", proxyAddress);\n`
    //         solcode_targets += `emit DeployImpl("${name}", implAddress);\n`
    //         // solcode_targets += `// AddressProvider import\n`
    //         // solcode_targets += `names[0] = bytes32("${name}");\ndestinations[0] = proxyAddress;\n`
    //         // solcode_targets += `IAddressProvider(${addressProvider.address}).importAddresses(names, destinations);`
    //         solcode_targets += "\n";
    //     } else {
    //         const proxy = manifest.targets.system[`Proxy${name}`]
    //         solcode_targets += `//\n`
    //         solcode_targets += `// ${name}\n`
    //         solcode_targets += `//\n`
    //         // solcode_targets += `// Deploy proxy.\n`
    //         solcode_targets += `// Upgrade.\n`
    //         solcode_targets += `implAddress = IProxy(${proxy.address}).upgradeImplementation(${hexToSolHex(artifact.bytecode.object)}, 1);\n`
    //         solcode_targets += `emit DeployImpl("${name}", implAddress);\n`
    //     }
    // }

    // migrationCode = prettier.format(migrationCode, {
    //     plugins: [prettierSolidity],
    //     parser: "solidity-parse",
    // });




    let migrationCode = ejs.render(
        migrationTemplate,
        {
            contractName,
            BEGIN_MIGRATION_LABEL,
            END_MIGRATION_LABEL,
            MIGRATION_STEP_LABEL,
            
            system: {
                addressProvider: {
                    name: "AddressProvider",
                    code: addressProvider_Artifact.bytecode.object
                },
            },
            targets,
            allTargets: targets,
            proxyInitcode
        }
    );

    // Now extract the migration body, and split it up into steps.
    const beginMigrationIndex = migrationCode.indexOf(BEGIN_MIGRATION_LABEL)
    const endMigrationIndex = migrationCode.indexOf(END_MIGRATION_LABEL)
    if (beginMigrationIndex == -1) {
        throw new Error(`Could not find ${BEGIN_MIGRATION_LABEL}`)
    }
    if (endMigrationIndex == -1) {
        throw new Error(`Could not find ${END_MIGRATION_LABEL}`)
    }
    let migrateBody = migrationCode.slice(beginMigrationIndex + BEGIN_MIGRATION_LABEL.length, endMigrationIndex)
    migrateBody = migrateBody.trim()
    
    const migrationSteps = migrateBody.split(MIGRATION_STEP_LABEL)
    console.log(migrationSteps)



    console.log(migrationCode)
    throw 11;

    const migrationArtifact = compileSolidity(contractName, migrationCode)

    const i = new ethers.utils.Interface(
        [
            "function migrate() public"
        ]
    )

    let out = {
        abi: migrationArtifact.contracts[contractName][contractName].abi,
        bytecode: migrationArtifact.contracts[contractName][contractName].evm.bytecode.object,
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