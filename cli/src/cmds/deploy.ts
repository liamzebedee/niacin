
const fs = require('node:fs')
import chalk from 'chalk'
import { ethers } from 'ethers'
import { join, resolve } from 'path'
import * as shell from 'shelljs'
import { table } from 'table'
import { 
    MixinInitializableArtifact,
    MixinResolverArtifact,
    addressProvider_Artifact, 
    proxy_Artifact 
} from '../contracts'
import { 
    AllerConfig, 
    AllerScriptRuntime, 
    DeployImplEvent, 
    DeploymentNamespace, 
    EMPTY_MANIFEST, 
    EVMBuildArtifact, 
    InitializeScript, 
    Manifest, 
    MANIFEST_VERSIONS, 
    UpsertAddressProvider, 
    UpsertProxyEvent, 
    VersionControlInfo 
} from '../types'
import { logTx, promptConfirmation } from '../utils'
import { 
    findArtifacts, 
    findTargets, 
    getNewTargets 
} from '../utils/build'
import { getContract } from '../utils/contracts'
import { DeploymentManager } from '../utils/deployment'
import { GasEstimator, getGasEstimator } from '../utils/gas'
import { AllerScriptEnvironment } from '../utils/initialization_scripting'
import { getTargetsFromEvents } from '../utils/manifest'


interface GetOrCreateArgs {
    manifest: Manifest
    deploymentNamespace: DeploymentNamespace,
    name: string,
    abi: ethers.utils.Fragment[],
    bytecode: string,
    constructorArgs: any[]
    signer: ethers.Signer
}

const getOrCreate = async (args: GetOrCreateArgs) => {
    const deployments = args.manifest.targets[args.deploymentNamespace]

    const { name } = args
    const previousDeployment = deployments[name]
    if (previousDeployment != null) {
        const contract = getContract({
            signer: args.signer,
            abi: args.abi,
            address: previousDeployment.address
        })
        return contract
    } else {
        const contract = await deployContract({
            signer: args.signer,
            abi: args.abi,
            bytecode: args.bytecode,
            constructorArgs: args.constructorArgs
        })
        return contract
    }
}

interface DeployFuncArgs {
    signer: ethers.Signer
    abi: ethers.utils.Fragment[],
    bytecode: string,
    constructorArgs: any[]
}

// We keep log of extra transaction information on the ethers.Contract at this key.
const DEPLOY_TRANSACTION_KEY = 'deployTransaction2'

const deployContract = async (args: DeployFuncArgs) => {
    const Contract = new ethers.ContractFactory(args.abi, args.bytecode, args.signer)
    
    const gasInfo = await gasEstimator()
    const contract = await Contract.deploy(...args.constructorArgs, gasInfo)
    logTx(contract.deployTransaction)

    await contract.deployed()
    await contract.deployTransaction.wait()
    const rx = await args.signer.provider.getTransactionReceipt(contract.deployTransaction.hash)
    contract.deployTransaction.blockNumber = rx.blockNumber
    // @ts-ignore
    contract[DEPLOY_TRANSACTION_KEY] = contract.deployTransaction

    console.log(chalk.gray(`contract: ${contract.address}`))
    return contract
}


interface DeployArgs {
    _: string[] // argv
    a: boolean // deploy all?
    projectType: string
    projectDir: string
    manifest: string
    config: string
    gasEstimator: string
    y: boolean
}

// Deploys a set of smart contracts to a blockchain. 
// 
// Each contract is "wrapped" in a proxy contract, which allows us to upgrade the contract later. Every contract 
// has access to the AddressProvider, which allows contracts to look up other contracts by name.
// 
// The deployer tool searches the project directory for contracts, and filters them into a set of targets.
// Non-targets include libraries, interfaces, and abstract contracts (WIP).
// 
// A target is a contract that is deployed to the blockchain. It is wrapped in a proxy contract, which allows
// us to upgrade the contract later. The proxy contract is deployed first, and then the implementation is deployed
// and the proxy is upgraded to point to the new implementation.
// 
// Every target is referred to by its name and version. The name is the name of the contract, and the version is
// a string that is incremented every time the contract is deployed. 
// 
// The deployer will deploy each target, including its implementation and proxy, and perform upgrades.
// Then it will update the AddressProvider with the latest version of each target.
// 
// The entire history of the deployment, including the ABI's of previous versions of each target, is stored in
// a manifest file. This allows us to easily refer to previous versions of a target, and to easily access their
// previous ABI's. It also allows us to easily rollback to a previous implementation with ease.
// 
// From the deployment events, we can determine the targets, with their names, versions, and addresses.
// And we can generate a lightweight JS package, which can be used to easily access the deployed targets.
// We can also autogenerate deployment documentations, with built-in contract UI's, for multichain deployments.
// 
// ADDITIONAL NOTES:
// - the block number a contract is deployed at is essential for indexers. This is stored.
// - contracts which are deleted from a codebase still need to resolve other contracts, which may still be maintained.
//   as such, we need to keep the old versions of the contracts in the manifest, which are injected with the new targets
//   when they are deployed.
// - the manifest contains deployments for a single chain. Multichain deployments can be done by using separate manifest files, 
//   quite easily.
// 
// COMPARISON:
// - Diamond Standard. What a fucking shitshow.
// - OZ Proxies. What a slightly less but ever grande shitshow.
// - Vercel/Next.js. The divine inspiration for this tool.
// - Synthetix v2 deployer. I adapted 80% of the code from the Synthetix deployer, but rewritten to be more user-friendly and tool-like.
// - Chugsplash. A very cool approach. Determinism is great.
// 
// ACKNOWLEDGEMENTS:
// - This tool is based off of the Synthetix v2 deployer, and 7yrs experience in deploying smart contracts, 
//   subgraphs, frontends, and other tools. It's been a long ride, and to be honest, I was expecting someone
//   to make this much sooner.
// 

let gasEstimator: GasEstimator

export async function deploy(argv: DeployArgs) {
    let { RPC_URL: rpcUrl, PRIVATE_KEY: privateKey } = process.env
    const {
        projectType,
        projectDir
    } = argv

    // Load manifest.
    let manifest: Manifest
    try {
        const p = resolve(join(process.cwd(), "/", argv.manifest))
        manifest = require(p) as Manifest
    } catch (err) {
        // console.log("Can't find input manifest: " + err)
        console.log(`Creating new empty manifest...`)
        manifest = EMPTY_MANIFEST
    }

    // Load configuration.
    const p = resolve(join(projectDir, "/", argv.config))
    // Check the config exists.
    try {
        fs.accessSync(p, fs.constants.R_OK)
    } catch (err) {
        throw Error(`Can't find .niacinrc.js at ${p}: ${err}`)
    }
    console.log(`Loading configuration: ${p}`)
    console.log(`Loaded .niacinrc.js`)
    const allerrc = require(p) as AllerConfig
    
    // Load configuration scripts.
    let initializeScript: InitializeScript = async (runtime: AllerScriptRuntime) => {}
    if(allerrc.scripts.initialize) {
        initializeScript = allerrc.scripts.initialize
    }

    const ignoredFiles = allerrc.ignore || []
    
    console.log()
    console.log(chalk.green("(1) Build"))
    shell.cd(projectDir)
    console.log(chalk.gray(`Project directory:`), `${shell.pwd()}`)
    console.log(chalk.gray(`Project type:`), `${projectType}`)
    // console.log(`Input manifest: `)
    console.log()
    console.log(`> forge build`)

    // Run `forge build`.
    if (shell.exec('forge build').code !== 0) {
        shell.echo('Error: Forge build failed');
        shell.exit(1);
    }
    console.debug()
    
    // Identify contracts for deployment.
    function findContractsForDeployment() {
        if(argv.a) {
            console.log(chalk.yellow(`Searching for all contracts to deploy...`))
            const allTargets = findTargets()
            const targets = allTargets
                .filter(path => !ignoredFiles.includes(path))

            const artifacts = findArtifacts(targets)
            let targetsForDeployment = getNewTargets(manifest, artifacts)

            return {
                allTargets,
                artifacts,
                targetsForDeployment
            }
            
        } else {
            const targetNames = argv._.slice(1) // ignore first argument, which is `deploy`
            console.log(chalk.yellow(`Deploying contracts: ${targetNames.join(', ')}`))

            // The out/ directory is structured as:
            // out/
            //   Contract.sol/            <-- contract source file
            //     Contract.json          <-- Contract.sol:Contract
            //     ContractStorage.json   <-- Contract.sol:ContractStorage
            
            // Contract files (.sol) can contain multiple contracts.
            const glob = require('glob')
            const pattern = 'out/**/*.json'
            const allArtifactFiles = glob.sync(pattern)
            const allContracts = allArtifactFiles.map((path: string) => {
                // get the filename
                const filename = path.split('/').pop()
                // remove the extension
                const contractName = filename.split('.').shift()
                return [contractName, path]
            })

            let artifactPaths = []

            // Now check the names we're given.
            for(let name of targetNames) {
                // Verify it exists.
                const contract = allContracts.find(c => c[0] == name)
                if (!contract) {
                    throw new Error(`Contract not found: ${name}`)
                }

                // There could be multiple contracts with the same name.
                // Verify we have a non-ambiguous ID.
                const contracts = allContracts.filter(c => c[0] == name)
                if (contracts.length > 1) {
                    console.error(contracts)
                    throw new Error(`There are multiple build artifacts for the contract: ${name}, please specify the full path to the contract.`)
                }

                // Add the path to the artifact.
                artifactPaths.push(contract[1])
            }

            // Now load the artifacts.
            const artifacts = artifactPaths.map(path => {
                const artifact = shell.cat(path)
                const artifactJson = JSON.parse(artifact) as EVMBuildArtifact
                return artifactJson
            })

            let targetsForDeployment = getNewTargets(manifest, artifacts)

            const allTargets = artifacts.map(artifact => {
                const aa = artifact as any
                // "compilationTarget": {
                //     "node_modules/niacin-contracts/src/lib/Owned.sol": "OwnerStorage"
                // },
                // return "node_modules/niacin-contracts/src/lib/Owned.sol"
                return Object.keys(aa.metadata.settings.compilationTarget)[0]
            })

            return {
                artifacts,
                allTargets,
                targetsForDeployment
            }
        }
    }

    const {
        artifacts,
        allTargets,
        targetsForDeployment
    } = findContractsForDeployment()

    // Process the artifacts.
    // Check the version of the Niacin contracts the user is importing.
    const NIACIN_CONTRACTS_PATH = `node_modules/niacin-contracts/src/`
    const contractsDep: Record<string, { keccak256: string }> = {};
    ([
        MixinResolverArtifact,
        MixinInitializableArtifact,
    ]).map((artifact) => {
        Object.entries(
            artifact.metadata.sources
        )
            // The `path` we get from these artifacts is from the niacin-contracts project, so these
            // contracts are all first-class paths under src/.
            // In user projects, these paths will feature node_modules/niacin-contracts prefix.
            .filter(([path, info]) => path.startsWith(`src/`))
            .forEach(([path, info]) => {
                contractsDep[`node_modules/niacin-contracts/${path}`] = info
            })
    })
    // console.log(contractsDep)
    
    for(let artifact of artifacts) {
        const niacinDeps = 
            Object.entries(
                artifact.metadata.sources
            )
            .filter(([path, info]) => path.startsWith(NIACIN_CONTRACTS_PATH))
        
        for(let [path, info] of niacinDeps) {
            const dep = contractsDep[path]
            if(!dep) {
                console.warn(`Can't find dependency for ${path}`)
                continue
            }
            if(dep.keccak256 != info.keccak256) {
                const { version } = (require('niacin-contracts/package.json') as any)
                throw new Error(`niacin-cli built for ` + chalk.yellow(`niacin-contracts v${version}`) + `, but your project uses a different version.`)
            }
        }
    }

    const deploymentSummaryInfo = allTargets.map(target => {
        // Lookup from targetsForDeployment.
        const deployInfo = targetsForDeployment.find(t => t.ast.absolutePath === target)
        let ignored = ignoredFiles.includes(target)

        // contract                 | version  | status    | action        
        // src/TakeMarketShares.sol | n/a      | new       | deploy
        // src/TakeMarketShares.sol | v1 -> v2 | modified  | upgrade
        // src/TakeMarketShares.sol | v1       | unchanged | none

        let deployInfo2 = {
            isNew: true,
            isModified: false,
            shouldDeploy: false,
            shouldUpgrade: false,
            version: 'n/a',
            link: ""
        }

        if (deployInfo) {
            deployInfo2 = {
                isNew: deployInfo.isNew,
                isModified: deployInfo.isModified,
                shouldDeploy: deployInfo.shouldDeploy,
                shouldUpgrade: deployInfo.shouldUpgrade,
                version: deployInfo.previousDeployment ? String(deployInfo.previousDeployment.version) : 'n/a',
                link: deployInfo.proxyIdentity ? deployInfo.proxyIdentity.address : ""
            }
        }

        let status = ''
        if(ignored) {
            status = 'ignored'
        } else if (deployInfo2.isNew) {
            status = 'new'
        } else if (deployInfo2.isModified) {
            status = 'modified'
        } else {
            status = 'unchanged'
        }

        let action = ''
        if(ignored) {
            action = 'none'
        } else if (deployInfo2.shouldUpgrade) {
            action = `upgrade`
        } else if (deployInfo2.shouldDeploy) {
            action = 'deploy'
        } else {
            action = 'none'
        }

        let version = deployInfo2.version
        
        return {
            name: target,
            version: version,
            status,
            action,
            link: deployInfo2.link,
            
            // Meta.
            ignored,
        }
    })
    
    const columns = 'Contract | Version | Status | Action | Proxy Address'
        .split(' | ')
    const deploymentSummaryTable = [columns]
        .concat(deploymentSummaryInfo.map(info => {
            let fields = [
                info.name,
                info.version,
                info.status,
                info.action,
                info.link,
            ]

            if (info.ignored) {
                fields = fields.map(field => chalk.gray(field))
            } else {
                if(fields[3] != 'none') {
                    fields = fields.map(field => chalk.yellow(field))
                }
            }
            return fields
        }))

    const targetsStaged = targetsForDeployment
        .filter(artifact => artifact.shouldDeploy)



    // Now deploy.
    // 
    
    // Try to get the version control tag.
    let versionControlInfo: VersionControlInfo = {
        type: 'none',
        tag: '',
        branch: '',
        dirty: false,
        descriptor: '',
    }
    
    const isGitRepo = shell.exec('git rev-parse --is-inside-work-tree', { silent: true }).stdout.trim()
    if (isGitRepo === 'true') {
        console.log(chalk.gray(`Git repository detected.`))

        try {
            const dirty = shell.exec('git status --porcelain', { silent: true }).stdout.trim().length > 0
            const branch = shell.exec('git rev-parse --abbrev-ref HEAD', { silent: true }).stdout.trim()
            const tag = shell.exec('git rev-parse HEAD', { silent: true }).stdout.trim()
            const descriptor = `${tag}${dirty ? '-dirty' : ''}`
            versionControlInfo = {
                type: 'git',
                tag,
                branch,
                dirty,
                descriptor,
            }
        } catch (err) {
            console.log(chalk.yellow(`Can't get version control tag: ${err}`))
        }
    }

    if (versionControlInfo.type != 'none' && versionControlInfo.dirty) {
        if(!promptConfirmation(`You are deploying from a dirty git repository. Are you sure you want to continue?`, argv.y)) {
            return console.log(`Aborting.`)
        }
    }

    console.log(`Recording version control information:`)
    // branch = master
    // commit = 232312
    // dirty = true
    console.log(`  ${chalk.gray(`branch`)} = ${versionControlInfo.branch}`)
    console.log(`  ${chalk.gray(`commit`)} = ${versionControlInfo.tag}`)
    console.log(`  ${chalk.gray(`dirty`)} = ${versionControlInfo.dirty}`)
    console.log()
    

    
    console.log()
    console.log(chalk.green("(2) Deploy"))

    // Build the signer, provider, system contracts.
    if(!rpcUrl) {
        console.log(chalk.gray(`No RPC_URL provided. Using default for project type: ${projectType}`))
        if (projectType == 'foundry' || projectType == 'hardhat') {
            rpcUrl = 'http://localhost:8545'
        } else {
            throw new Error("No RPC_URL provided.")
        }
    }

    if(!privateKey) {
        console.log(chalk.gray(`No PRIVATE_KEY provided. Using default for project type: ${projectType}`))
        if (projectType == 'foundry' || projectType == 'hardhat') {
            privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
        } else {
            throw new Error("No PRIVATE_KEY provided.")
        }
    }

    console.log()
    console.log(chalk.gray('RPC URL:'), chalk.green(rpcUrl))
    // TODO: code smell
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl)
    const signer = new ethers.Wallet(privateKey, provider)
    const account = signer.address
    const chainId = String(await (await provider.getNetwork()).chainId)
    console.log(chalk.gray(`Deploying from account:`), `${account}`)
    console.log()

    // Check chainID matches the most recent deployment.
    if(manifest.deployments.length) {
        const lastDeployment = manifest.deployments[manifest.deployments.length - 1]
        if(lastDeployment.chainId != chainId) {
            throw new Error(`Chain ID mismatch. Last deployment was on chain ID ${lastDeployment.chainId} but you are deploying to chain ID ${chainId}.`)
        }
    }

    // Load gas estimator.
    let gasEstimatorName = argv.gasEstimator || 'default'
    gasEstimator = await getGasEstimator(gasEstimatorName, provider)
    console.log(`Using gas estimator: ${gasEstimatorName}`)

    const deploymentManager = new DeploymentManager(
        argv.manifest, 
        manifest, 
        versionControlInfo, 
        account,
        rpcUrl,
        String(chainId)
    )

    // Print a summary for the deployment.
    // contract                 | version  | status    | action
    // src/TakeMarketShares.sol | n/a      | new       | deploy
    // src/TakeMarketShares.sol | v1 -> v2 | modified  | upgrade
    // src/TakeMarketShares.sol | v1       | unchanged | none
    console.log(table(deploymentSummaryTable))

    // Await user confirmation to continue.
    if (!promptConfirmation(`Continue?`, argv.y)) {
        return console.log(`Aborting.`)
    }
    console.log()



    // 
    // (WIP)
    // Generate solidity migrations.
    //

    //     const contractName = `Migration_${deploymentManager.deployment.id}`
    //     const solcode = `
    // // SPDX-License-Identifier: UNLICENSED
    // pragma solidity ^0.8.9;

    // contract ${contractName} {
    //     function migrate() public {

    //     }
    // }
    //     `

    //     const obj = compileSolidity(contractName, solcode)
    //     console.log(obj.contracts[contractName][contractName].evm.bytecode)

    //     // _code = migrationCode
    //     // _data = Migration.encodeTransaction.run()
    //     // DSProxy.execute(code, _data);

    //     return



    // 1. AddressProvider
    console.log(`1. Locating AddressProvider...`)
    console.log()
    const addressProvider = await getOrCreate({
        manifest: manifest,
        deploymentNamespace: "system",
        name: 'AddressProvider',
        abi: addressProvider_Artifact.abi as any,
        bytecode: addressProvider_Artifact.bytecode.object,
        constructorArgs: [account],
        signer: signer,
    })
    console.log(chalk.gray(`${chalk.yellow('AddressProvider')} is at ${addressProvider.address}`))

    if (manifest.targets.system.AddressProvider == null) {
        const event: UpsertAddressProvider = {
            type: "upsert_address_provider",
            address: addressProvider.address,
            bytecode: addressProvider_Artifact.bytecode,
            metadata: addressProvider_Artifact.metadata,
            target: 'AddressProvider',
            abi: addressProvider_Artifact.abi as any,
            deployTx: addressProvider.deployTransaction,
        }
        deploymentManager.addEvent(event)
    }

    // 2. Deploy contracts.
    // 
    
    console.log()
    console.log(`2. Deploying contracts...`)
    if (targetsStaged.length == 0) {
        console.log()
        console.log(chalk.gray(`No new contracts to deploy.`))
    }
    for (let artifact of targetsStaged) {
        console.log()

        console.log(chalk.yellow(`[${artifact.ast.absolutePath}]`))

        // 2.1 Get or create Proxy.
        const proxyName = `Proxy${artifact.contractName}`
        if (manifest.targets.system[proxyName] == null) {
            console.log(`Creating proxy ${chalk.yellow(proxyName)} for ${chalk.yellow(artifact.contractName)}`)
        } else {
            console.log(`Loaded proxy ${chalk.yellow(proxyName)} for ${chalk.yellow(artifact.contractName)}`)
        }
        const proxy = await getOrCreate({
            manifest: manifest,
            deploymentNamespace: "system",
            name: proxyName,
            abi: proxy_Artifact.abi as any,
            bytecode: proxy_Artifact.bytecode.object,
            constructorArgs: [addressProvider.address],
            signer: signer,
        })

        deploymentManager.addEvent(
            { 
                type: "upsert_proxy", 
                address: proxy.address,
                target: artifact.contractName, 
                proxyName,
                abi: proxy_Artifact.abi as any,
                deployTx: proxy[DEPLOY_TRANSACTION_KEY],
                bytecode: proxy_Artifact.bytecode,
                metadata: proxy_Artifact.metadata,
            } as UpsertProxyEvent
        )

        // 2.2 Deploy and ugprade to implementation.
        const previous = manifest.targets.user[artifact.contractName]
        const nextVersion = 1 + (previous ? previous.version : 0)
        console.log(`Deploying ${chalk.yellow(artifact.contractName)} v${nextVersion}`)

        // Compute initcodehash from the bytecode
        const initCodeHash = ethers.utils.keccak256(artifact.bytecode.object);
        const implAddress = ethers.utils.getCreate2Address(
            proxy.address,
            await proxy._computeNewDeploymentSalt(nextVersion),
            initCodeHash,
        );
        const impl = new ethers.Contract(implAddress, artifact.abi, signer)
        console.log(chalk.gray(`contract: ${impl.address} (create2)`))

        console.log(`Upgrading ${chalk.yellow(proxyName)} to implementation v${nextVersion}`)
        
        // Check if impl already exists.
        // console.log('impl ; ',implAddress)
        // const implExists = await provider.getCode(implAddress)
        // if (implExists != '0x') {
        //     console.log(chalk.gray(`Implementation already exists at ${implAddress}. Skipping.`))
        //     throw 2
        // }
        // TODO.

        const gasParams = await gasEstimator()
        // estimate gas on this deploytx
        // const gasExp = await proxy.estimateGas.upgradeImplementation(artifact.bytecode.object, nextVersion, gasParams)
        // console.log('gasExp', gasExp)
        const deployTx = await proxy.upgradeImplementation(artifact.bytecode.object, nextVersion, gasParams)
        logTx(deployTx)
        await deployTx.wait(1)
        
        const rx = await signer.provider.getTransactionReceipt(deployTx.hash)
        deployTx.blockNumber = rx.blockNumber

        deploymentManager.addEvent(
            {
                type: "deploy_impl",
                version: nextVersion,
                target: artifact.contractName,
                abi: artifact.abi,
                deployTx: deployTx,
                from_impl: previous ? previous.address : ethers.constants.AddressZero,
                to_impl: impl.address,
                address: impl.address,
                bytecode: artifact.bytecode,
                metadata: artifact.metadata,
            } as DeployImplEvent
        )
    }

    // 3. Import the addresses.
    // 

    console.log()
    console.log(`3. Importing addresses into AddressProvider...`)
    console.log()
    const deployments = [
        ...manifest.deployments,
        deploymentManager.deployment
    ]
    // The latest targets, including from this deployment.
    const targets2 = getTargetsFromEvents(
        deployments
            .map(d => d.events)
            .flat())
    
    // The address provider stores:
    // (target name -> proxy address)
    const names = Object.keys(targets2.user).map(ethers.utils.formatBytes32String)
    const destinations = Object.keys(targets2.user).map(target => {
        const proxy = targets2.system[`Proxy${target}`]
        if (!proxy) {
            throw new Error(`No proxy found for ${target}`)
        }
        if (!proxy.address) {
            throw new Error(`No address found for proxy ${target}`)
        }

        return proxy.address
    })
    const fresh = await addressProvider.areAddressesImported(names, destinations)
    // console.debug(names, destinations)
    if (!fresh) {
        const gasParams = await gasEstimator()
        const tx = await addressProvider.importAddresses(names, destinations, gasParams)
        logTx(tx)
        await tx.wait(1)
        console.log(`Imported ${names.length} addresses.`)
    } else {
        console.log(chalk.gray(`No addresses to import.`))
    }
    
    // 4. Rebuild caches.
    console.log()
    console.log(`4. Rebuilding MixinResolver caches...`)
    console.log()

    // 4.1 Caches for proxies.
    for (let target of Object.values(targets2.system)) {
        if (target.target == "AddressProvider") {
            continue
        }

        const MixinResolverABI = [
            'function isAddressCacheFresh() external view returns (bool)',
            'function rebuildAddressCache() external'
        ]
        const i = new ethers.Contract(target.address, MixinResolverABI, signer)

        // Log the version as well, since we might be rebuilding the cache of multiple versions.
        const fullyUniqueId = `Proxy${target.target} (v${target.version})`
        console.log(fullyUniqueId)
        
        let fresh 
        try {
            fresh = await i.isAddressCacheFresh()
        } catch(err) {
            console.log(chalk.red(`Error checking cache for ${chalk.yellow(fullyUniqueId)}: ${err}`))
            continue
        }

        if (fresh) {
            console.log(chalk.gray(`Skipping ${chalk.yellow(fullyUniqueId)} - cache is fresh`))
            continue
        }

        console.log(`Rebuilding cache for ${chalk.yellow(fullyUniqueId)}`)
        const gasParams = await gasEstimator()
        const tx = await i.rebuildAddressCache(gasParams)
        logTx(tx)
        await tx.wait(1)
    }
    
    console.log()
    console.log(chalk.gray('Done rebuilding caches.'))
    console.log()

    // 5. Initialize contracts.
    console.log(`5. Running initialize script...`)
    console.log()
    // Iterate over all the contracts, and initialize them if they aren't already initialized.
    if (initializeScript) {
        const allerScriptEnvironment = AllerScriptEnvironment.create(
            deploymentManager,
            gasEstimator,
            deployments,
            targets2,
            signer,
        )

        await initializeScript(allerScriptEnvironment)
    } else {
        console.log(chalk.gray(`No initialize script found.`))
    }

    // 5. Update manifest.
    console.log()
    console.log(`5. Saving deployments manifest...`)
    console.log()

    // TODO code smell.
    // Complete the deployment.
    deploymentManager.complete()
    const completedDeployment = deploymentManager.deployment
    const manifest2: Manifest = {
        version: MANIFEST_VERSIONS.pop(),
        deployments: [
            ...manifest.deployments,
            completedDeployment
        ],
        targets: targets2,
        vendor: manifest.vendor,
    }

    try {
        fs.writeFileSync(
            argv.manifest,
            JSON.stringify(manifest2, null, 2)
        )
    } catch(err) {
        console.error("Error writing manifest")
        console.error(manifest2)
        console.error(err)
    }
}