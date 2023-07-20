import { ethers } from "ethers"
import { addressProvider_Artifact, proxy_Artifact } from "../contracts"
// @ts-ignore
import prettierSolidity from "prettier-plugin-solidity";
import { compileSolidity } from "./solidity";
import { EVMBuildArtifact, Manifest, Targets } from "../types";
import chalk from "chalk";
import { DeploymentManager } from "./deployment";
import * as Handlebars from 'handlebars'
const prettier = require("prettier");
const ejs = require('ejs');

const hexToSolHex = (str: string) => `hex"${str.slice(2)}"`
const fs = require('fs')


export async function generateSolMigration(
    contractName: string, 
    addressProvider: ethers.Contract, 
    manifest: Manifest, 
    targetsStaged: any[],
    dsProxy: ethers.Contract,
    desiredAddresses: Record<string,string>,
    dependencies: Record<string,string[]>,
    desiredSystem: any[]
) {
    // Locally compute all contracts that require:
    // - caches rebuilt (linking)
    // - addresses imported
    
    
    
    // Locate the Migrate.ejs.sol.
    const { dirname } = require('path');
    const appDir = dirname(require.resolve('../../package.json'));
    const migrationTemplate = fs.readFileSync(
        appDir + '/src/utils/migrations/MigrationTemplate.hb.sol',
        'utf-8'
    )

    // Constants.
    const from = await addressProvider.signer.getAddress()
    const proxyInitcode =
        (new ethers.ContractFactory(
            proxy_Artifact.abi,
            proxy_Artifact.bytecode.object
        ))
            .getDeployTransaction(
                addressProvider.address
            )
            .data.toString()
    const addressProviderInitcode =
        (new ethers.ContractFactory(
            proxy_Artifact.abi,
            proxy_Artifact.bytecode.object
        ))
            .getDeployTransaction(
                from
            )
            .data.toString()
    const create2Address = (salt: string, initcode: string) =>
        ethers.utils.getCreate2Address(
            from,
            ethers.utils.keccak256(Buffer.from(salt)),
            ethers.utils.keccak256(initcode)
        )
    const addressProviderAddress = create2Address("AddressProvider", addressProviderInitcode)
    const _addressProvider = (code: string) => {
        return {
            code: `_contract(
                0, // amount
                bytes32("AddressProvider"), // salt
                ${hexToSolHex(code)}
            );`,
            meta: '_addressProvider'
        }
    }
    const _proxyInitcode = (proxy: any) => {
        return `bytes memory proxyInitcode = ${hexToSolHex(proxyInitcode)};`
    }
    const _target = (addressProvider: string, target: { bytecode: string, name: string }) => {
        return {
            code: `
            _target(
                ${addressProvider},
                bytes32("${target.name}"),
                ${hexToSolHex(target.bytecode)}
            );
            `,
            meta: '_target'
        }
    }
    const _importAddresses = () => {
        const data = targetsStaged.map(target => {
            const name = ethers.utils.formatBytes32String(target.contractName)
            const dest = desiredAddresses[target.contractName]
            if (!dest) {
                throw new Error(`No destination for ${target.contractName}`)
            }
            return {name,dest}
        })

        return {
            code: `
                // Import into AddressProvider.
                bytes32[] memory names = new bytes32[](${data.length});
                address[] memory dests = new address[](${data.length});
                ${data.map((d,i) => `names[${i}] = bytes32("${ethers.utils.parseBytes32String(d.name)}");`).join('\n')}
                ${data.map((d,i) => `dests[${i}] = ${d.dest};`).join('\n')}
                IAddressProvider(${addressProviderAddress}).importAddresses(names, dests);
                `,
            meta: '_importAddresses'
        }
    }
    const _rebuildCaches = () => {
        return desiredSystem
            .map(target => {
                let rebuildCachesStep = ``
                const deps = dependencies[target.contractName]
                const needsRebuild = deps && deps.length
                const predictedAddress = desiredAddresses[target.contractName]
                
                if (!predictedAddress) {
                    throw new Error(`No predicted address for ${target.contractName}`)
                }

                if (needsRebuild) {
                    rebuildCachesStep = `
                    // Link: ${target.contractName} with [${deps.join(', ')}].
                    IMixinResolver(${predictedAddress}).rebuildAddressCache();`
                }

                return {
                    code: rebuildCachesStep,
                    meta: '_rebuildCaches'
                }
            })
            .filter(step => step.code.length)
        }

    const getSteps = (targets: any[]) => {
        return [
            _addressProvider(addressProvider_Artifact.bytecode.object),
            ...targetsStaged
                .map(target => _target(addressProviderAddress, { bytecode: target.bytecode.object, name: target.contractName })),
            _importAddresses(),
            ..._rebuildCaches(),
        ]
    }
    
    
    const _migration = (steps: any[], targetsStaged: any[], contractName: string) => {
        // Split the migration into multiple migrations (continuations).
        const template = Handlebars.compile(migrationTemplate, { noEscape: true })

        let migrationCode = template({
            migrationName: contractName,
            steps,
            variables: {
                proxyInitcode: _proxyInitcode(proxy_Artifact),
            }
        })

        // console.log(migrationCode)
        migrationCode = prettier.format(migrationCode, {
            plugins: [prettierSolidity],
            parser: "solidity-parse",
        });

        // return migrationCode
        
        const migrationArtifact = compileSolidity(contractName, migrationCode)

        let out = {
            solcode: migrationCode,
            abi: migrationArtifact.contracts[contractName][contractName].abi,
            bytecode: migrationArtifact.contracts[contractName][contractName].evm.bytecode.object,
        }

        return out
    }


    const gasLimit = 6_500_000
    let migration_chunks: any[] = []
    const allSteps = getSteps(targetsStaged)
    // console.log(allSteps)
    let steps: any[] = []

    // Debug log the full migration
    const migration = _migration(allSteps, targetsStaged, `${contractName}_full`)
    fs.writeFileSync(
        appDir + `/tmp/migration_full.sol`,
        migration.solcode
    )

    
    
    let chunk_i = 0
    const stageChunk = (chunkSteps: any[], gasUsage: number) => {
        const remsteps = allSteps.length
        console.log(`stage chunk=${chunk_i} steps=${chunkSteps.length} rem=${allSteps.length} gas=${gasUsage.toLocaleString()}`)
        migration_chunks.push({
            index: chunk_i,
            migration: _migration(chunkSteps, targetsStaged, `${contractName}_${chunk_i}`)
        })
        chunk_i++
        steps = []
    }

    while (allSteps.length) {
        // Add a new step to migration.
        // steps = [...steps, allSteps.pop()]
        steps.push(allSteps.pop())

        let remainingTargets = targetsStaged
        const migration = _migration(steps, remainingTargets, `${contractName}_${chunk_i}`)

        // Estimate gas.)
        const gasUsageBN = await dsProxy.estimateGas['execute(bytes,bytes)'](
            "0x" + migration.bytecode,
            // cast sig "function migrate() public"
            "0x8fd3ab80"
        )

        const gasUsage = gasUsageBN.toNumber()
        
        // console.log(`Migration gas usage: ${gasUsage.toLocaleString()} gas for ${remainingTargets.length} contracts`)
        console.log(`check chunk=${chunk_i} steps=${steps.length} rem=${allSteps.length} gas=${gasUsage.toLocaleString()}`)

        // If the gas usage is above the limit, then split the migration.
        if (gasLimit < gasUsage) {
            console.log(`gasLimit < gasUsage - ${gasLimit.toLocaleString()} < ${gasUsage.toLocaleString()}`)
            if (steps.filter(step => step.meta == '_target').length == 1) {
                console.error(`Can't split migration - deploying the target is too large to fit inside tx gas limit of ${gasLimit.toLocaleString()}.`)
            }
            allSteps.push(steps.pop())

            const gasUsageBN2 = await dsProxy.estimateGas['execute(bytes,bytes)'](
                "0x" + migration.bytecode,
                // cast sig "function migrate() public"
                "0x8fd3ab80"
            )

            const gasUsage2 = gasUsageBN.toNumber()
            stageChunk(steps, gasUsage2)
        }

        if(allSteps.length == 0) {
            stageChunk(steps, gasUsage)
        }
    }

    // while (steps.length) {
    //     let remainingTargets = targetsStaged
    //     const migration = _migration(steps, remainingTargets)

    //     // Estimate gas.
    //     const gasUsageBN = await dsProxy.estimateGas['execute(bytes,bytes)'](
    //         "0x" + migration.bytecode,
    //         // cast sig "function migrate() public"
    //         "0x8fd3ab80"
    //     )

    //     const gasUsage = gasUsageBN.toNumber()
    //     console.log(`Migration gas usage: ${gasUsage.toLocaleString()} gas for ${remainingTargets.length} contracts`)

    //     // If the gas usage is above the limit, then split the migration.
    //     if (gasLimit < gasUsage) {
    //         console.log(`Splitting migration`)
    //         throw 1

    //         // We use a simple heuristic to split the migration.
    //         // Concatenate all of the code steps into a single string.
    //         // Locate the midpoint.
    //         // And then split.
    //         // aka a binary search.
    //         // The output is a list of steps up until this midpoint.
    //         const stepsConcat = steps.map(step => step.code.trim()).join('\n')
    //         const midpoint = Math.floor(stepsConcat.length / 2)
    //         console.log(stepsConcat)
    //         let splitIdx = 0
    //         let acc = ""
    //         for (let i = 0; i < steps.length; i++) {
    //             const step = steps[i]
    //             if ((acc.length + step.code.length) > midpoint) {
    //                 splitIdx = i
    //                 break
    //             }
    //             acc += step.code
    //         }

    //         // Split the migration into two migrations.
    //         const migration1_steps = steps.slice(0, splitIdx)
    //         console.log('splitIdx', splitIdx)
    //         const migration1 = _migration(migration1_steps, remainingTargets)
    //         steps = steps.slice(splitIdx)

    //         migration_chunks.push({
    //             index: j++,
    //             migration: migration1,
    //         })
    //     } else {
    //         migration_chunks.push({
    //             index: j++,
    //             migration: migration,
    //         })
    //         steps = []
    //     }

    //     // console.log(steps)
    //     // console.log(migrationCode)
    // }
    

    for (let chunk of migration_chunks) {
        fs.writeFileSync(
            appDir + `/tmp/${contractName}_${chunk.index}.sol`,
            chunk.migration.solcode
        )
    }
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