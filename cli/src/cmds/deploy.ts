const glob = require('glob')
const fs = require('node:fs')
import { join } from 'path'
import { resolve } from 'path'
import { ethers } from 'ethers'
import * as shell from 'shelljs'
import { Manifest, MANIFEST_VERSIONS, EMPTY_MANIFEST, DeployImplEvent, UpsertProxyEvent, ContractInfo, UpsertAddressResolver, DeploymentEvent, Targets, DeploymentNamespace, Deployment } from '../types'
import { addressResolver_Artifact, systemContracts } from '../contracts'
import { proxy_Artifact } from '../contracts'
import chalk from 'chalk'
import { table } from 'table'

const DEPLOY_TRANSACTION_KEY = 'deployTransaction2'

export const eventToContractInfo = (event: UpsertAddressResolver | DeployImplEvent | UpsertProxyEvent): ContractInfo => {
    const version = event.type == 'deploy_impl' ? event.version : 1
    return {
        target: event.target,
        version,
        address: event.address,
        abi: event.abi,
        bytecode: event.bytecode,
        deployTx: event.deployTx,
        metadata: event.metadata,
    }
}

export const getTargetsFromEvents = (events: DeploymentEvent[]): Targets => {    
    let addressResolver: any = events.find(event => event.type == "upsert_address_resolver") as UpsertAddressResolver
    if(addressResolver) {
        addressResolver = eventToContractInfo(addressResolver)
    }

    const proxies = events
        .filter(event => event.type == "upsert_proxy")
        .reduce((acc, event: UpsertProxyEvent, i) => {
            return {
                ...acc,
                [event.proxyName]: eventToContractInfo(event)
            }
        }, {} as Record<string, UpsertProxyEvent>)

    const userTargets = events
        .filter(event => event.type == "deploy_impl")
        .reduce((acc, event: DeployImplEvent, i) => {
            // Pick the later version.
            if(acc[event.target] && acc[event.target].version > event.version) {
                return acc
            }

            return {
                ...acc,
                [event.target]: eventToContractInfo(event)
            }
        }, {} as Record<string, DeployImplEvent>)
    
    // Namespaces
    const targets = {
        system: {
            ['AddressResolver']: {
                ...addressResolver,
            },
            ...proxies,
        },
        user: {
            ...userTargets
        }
    }
    return targets
}

const getAllImplementations = (events: DeploymentEvent[]): ContractInfo[] => {
    const impls = events
        .filter(event => event.type == "deploy_impl")
        .map(event => eventToContractInfo(event as DeployImplEvent))
    return impls
}


const findTargets: () => string[] = () => {
    // Collect all contracts that aren't inside `lib` folders.
    // glob all contracts that don't match `lib/**`
    // glob pattern for listing all files in nested subdirectories, so long as no subdirectory matches lib or interfaces
    const pattern = 'src/**/*.sol'
    const files = glob.sync(pattern)
    const contracts = files.filter((path: string) => {
        if (path.includes('lib')) {
            return false
        }
        if (path.includes('interfaces')) {
            return false
        }
        return true
    })
    return contracts
}


const findArtifacts = (targetPaths: string[]) => {
    // Collect artifacts.
    const artifacts = []
    for (let contractSrcPath of targetPaths) {
        // Just extract the filename.
        const contractFilename = contractSrcPath.split('/').pop().split('.')[0]
        const contractWithoutExt = contractFilename.split('.').pop()
        const artifact = shell.cat(`./out/${contractFilename}.sol/${contractWithoutExt}.json`)
        const artifactJson = JSON.parse(artifact)
        artifacts.push(artifactJson)
    }
    return artifacts
}


const getNewTargets = (inputManifest: Manifest, artifacts: any[]) => {
    const newTargetsArtifacts = artifacts
        // Filter: only contracts with changed bytecode.
        .map(artifact => {
            const contractFilename = artifact.ast.absolutePath.split('/').pop().split('.')[0]
            const contractName = contractFilename.split('.').pop()
            const previousDeployment = inputManifest.targets.user[contractFilename]

            const isNew = previousDeployment == null

            const hasPreviousVersion = previousDeployment != null
            const isModified = previousDeployment != null && previousDeployment.bytecode.object != artifact.bytecode.object
            const shouldUpgrade = isModified

            artifact.contractName = contractName
            artifact.hasPreviousVersion = hasPreviousVersion
            artifact.shouldUpgrade = shouldUpgrade
            artifact.previousDeployment = previousDeployment
            artifact.isModified = isModified
            artifact.isNew = isNew

            // We deploy if there is no previous deployment, or if we should upgrade.
            artifact.shouldDeploy = !hasPreviousVersion || shouldUpgrade
            return artifact
        })
    return newTargetsArtifacts
}


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


const getGasParametersForTx = async () => {
    // TODO: use the provider.getFeeData()
    const feeData = await (await fetch(`https://gasstation-mainnet.matic.network/v2`)).json()

    const { safeLow, standard, fast, estimatedBaseFee } = feeData

    // safeLow.maxFee = convertFloatToUint256(safeLow.maxFee)
    // safeLow.maxPriorityFee = convertFloatToUint256(safeLow.maxPriorityFee)

    // standard.maxFee = convertFloatToUint256(standard.maxFee)
    // standard.maxPriorityFee = convertFloatToUint256(standard.maxPriorityFee)

    // fast.maxFee = convertFloatToUint256(fast.maxFee)
    // fast.maxPriorityFee = convertFloatToUint256(fast.maxPriorityFee)

    return {
        maxFeePerGas: ethers.utils.parseUnits(fast.maxFee.toString().split('.')[0], "gwei"),
        maxPriorityFeePerGas: ethers.utils.parseUnits(fast.maxPriorityFee.toString().split('.')[0], "gwei"),
    }
}

const defaultGasEstimator = async () => {
    return {}
}

const gasEstimators = {
    'default': defaultGasEstimator,
    'polygon': getGasParametersForTx
}

let gasEstimator = defaultGasEstimator


const deployContract = async (args: DeployFuncArgs) => {
    const Contract = new ethers.ContractFactory(args.abi, args.bytecode, args.signer)
    
    const gasInfo = await gasEstimator()
    const contract = await Contract.deploy(...args.constructorArgs, gasInfo)
    
    console.debug(`deployContract tx=${contract.deployTransaction.hash}`)
    await contract.deployTransaction.wait()
    const rx = await args.signer.provider.getTransactionReceipt(contract.deployTransaction.hash)
    contract.deployTransaction.blockNumber = rx.blockNumber
    // @ts-ignore
    contract[DEPLOY_TRANSACTION_KEY] = contract.deployTransaction
    return contract
}

interface GetContractArgs {
    signer: ethers.Signer
    abi: ethers.utils.Fragment[],
    address: string
}

const getContract = async (args: GetContractArgs) => {
    const contract = new ethers.Contract(args.address, args.abi, args.signer)
    return contract
}


interface DeployArgs {
    projectType: string
    projectDir: string
    manifest: string
    config: string
    gasEstimator: string
}

const prompts = require('prompt-sync')({ sigint: true });


class DeploymentManager {
    deployment: Deployment

    constructor(public manifestPath: string, public manifest: Manifest) {
        this.deployment = {
            events: [],
            time: +new Date,
            _complete: false
        }
        this.manifestPath = manifestPath
        // clone manifest. TODO code smell
        this.manifest = JSON.parse(JSON.stringify(manifest))
    }

    addEvent(event: any) {
        this.deployment.events.push(event)
        this.save()
    }

    complete() {
        this.deployment._complete = true
        this.save()
    }

    save() {
        try {
            const manifest = {
                ...this.manifest,
                deployments: [
                    ...this.manifest.deployments,
                    this.deployment
                ]
            }

            fs.writeFileSync(
                this.manifestPath,
                JSON.stringify(manifest, null, 2)
            )
        } catch (err) {
            console.error("Error writing manifest")
            console.error(this.manifest)
            console.error(err)
        }
    }
}

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
    let allerrc: any = {}
    const p = resolve(join(projectDir, "/", argv.config))
    // Check the config exists.
    try {
        const res = fs.accessSync(p, fs.constants.R_OK)
    } catch (err) {
        throw Error(`Can't find .allerrc.js at ${p}: ${err}`)
    }
    console.log(`Loading configuration: ${p}`)
    console.log(`Loaded .allerrc.js`)
    allerrc = require(p)

    // Load gas estimator.
    let gasEstimatorName = argv.gasEstimator || 'default'
    // @ts-ignore
    gasEstimator = gasEstimators[gasEstimatorName]
    if(!gasEstimator) {
        throw new Error(`Unknown gas estimator: ${gasEstimatorName}`)
    }
    console.log(`Using gas estimator: ${gasEstimatorName}`)


    const ignoredFiles = allerrc.ignore || []

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
    
    const allTargets = findTargets()
    const targets = allTargets
        .filter(path => !ignoredFiles.includes(path))

    const artifacts = findArtifacts(targets)
    let targetsForDeployment = getNewTargets(manifest, artifacts)

    const humanInfo = allTargets.map(target => {
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
            version: 'n/a'
        }

        if (deployInfo) {
            deployInfo2 = {
                isNew: deployInfo.isNew,
                isModified: deployInfo.isModified,
                shouldDeploy: deployInfo.shouldDeploy,
                shouldUpgrade: deployInfo.shouldUpgrade,
                version: deployInfo.previousDeployment ? deployInfo.previousDeployment.version : 'n/a',
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
        
        return {
            name: target,
            version: deployInfo2.version,
            status,
            action,
            ignored,
            isModified: deployInfo2.isModified,
            shouldUpgrade: deployInfo2.shouldUpgrade,
            shouldDeploy: deployInfo2.shouldDeploy,
        }
    })
    
    // console.table(humanInfo)
    const columns = 'Contract | Version | Status | Action'
        .split(' | ')
    const humantableData = [columns]
        // @ts-ignore
        .concat(humanInfo.map(info => {
            
            let fields = [
                info.name,
                info.version,
                info.status,
                info.action
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
    console.log(table(humantableData))

    targetsForDeployment = targetsForDeployment
        .filter(artifact => artifact.shouldDeploy)



    // Now deploy.
    // 
    const deploymentManager = new DeploymentManager(argv.manifest, manifest)
    console.log()
    console.log(chalk.green("(2) Deploy"))

    // Build the signer, provider, system contracts.
    if(!rpcUrl) {
        console.log(chalk.gray(`No RPC URL provided. Using default for project type: ${projectType}`))
        if (projectType == 'foundry') {
            rpcUrl = 'http://localhost:8545'
        } else {
            throw new Error("No RPC URL provided.")
        }
    }

    if(!privateKey) {
        console.log(chalk.gray(`No PRIVATE KEY provided. Using default for project type: ${projectType}`))
        if (projectType == 'foundry') {
            privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
        } else {
            throw new Error("No PRIVATE KEY provided.")
        }
    }

    console.log()
    console.log(chalk.gray('RPC URL:'), chalk.green(rpcUrl))
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl)
    const signer = new ethers.Wallet(privateKey, provider)
    const account = signer.address
    console.log(chalk.gray(`Deploying from account:`), `${account}`)
    console.log()

    // Await user confirmation to continue.
    const doesUserContinue = prompts("Continue? [y/N]: ")
    if (doesUserContinue != "y") {
        console.log(`Aborting deployment.`)
        return
    }
    console.log()

    // let deploymentEvents: any[] = []

    // 1. AddressResolver
    console.log(`1. Locating AddressResolver...`)
    const addressResolver = await getOrCreate({
        manifest: manifest,
        deploymentNamespace: "system",
        name: 'AddressResolver',
        abi: addressResolver_Artifact.abi as any,
        bytecode: addressResolver_Artifact.bytecode.object,
        constructorArgs: [account],
        signer: signer,
    })
    console.log(chalk.gray(`${chalk.yellow('AddressResolver')} is at ${addressResolver.address}`))

    if (manifest.targets.system.AddressResolver == null) {
        deploymentManager.addEvent({ 
            type: "upsert_address_resolver", 
            address: addressResolver.address,
            bytecode: addressResolver_Artifact.bytecode,
            metadata: addressResolver_Artifact.metadata,
        })
    }

    // 2. Deploy contracts.
    // 
    
    console.log()
    console.log(`2. Deploying contracts...`)
    if(targetsForDeployment.length == 0) {
        console.log(chalk.gray(`No new contracts to deploy.`))
    }
    for (let artifact of targetsForDeployment) {
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
            constructorArgs: [addressResolver.address],
            signer: signer,
        })

        deploymentManager.addEvent(
            { 
                type: "upsert_proxy", 
                proxy,
                address: proxy.address,
                target: artifact.contractName, 
                proxyName,
                abi: proxy_Artifact.abi as any,
                deployTx: proxy[DEPLOY_TRANSACTION_KEY],
                bytecode: proxy_Artifact.bytecode,
                metadata: proxy_Artifact.metadata,
            } as UpsertProxyEvent
        )

        // 2.2 Deploy implementation.
        const previous = manifest.targets.user[artifact.contractName]
        const version = 1 + (previous ? previous.version : 0)
        console.log(`Deploying ${chalk.yellow(artifact.contractName)} v${version}`)

        const impl = await deployContract({
            signer: signer,
            abi: artifact.abi,
            bytecode: artifact.bytecode.object,
            constructorArgs: [addressResolver.address],
        })

        deploymentManager.addEvent(
            { 
                type: "deploy_impl", 
                impl, 
                version, 
                target: artifact.contractName,
                abi: artifact.abi,
                deployTx: impl[DEPLOY_TRANSACTION_KEY],
                from_impl: previous ? previous.address : ethers.constants.AddressZero,
                to_impl: impl.address,
                address: impl.address,
                bytecode: artifact.bytecode,
                metadata: artifact.metadata,
            } as DeployImplEvent
        )

        // 2.3 Upgrade the proxy to new version.
        console.log(`Upgrading ${chalk.yellow(proxyName)} to implementation v${version}`)
        const gasParams = await gasEstimator()
        const tx = await proxy.upgrade(impl.address, gasParams)
    }

    // 3. Import the addresses.
    // 

    console.log()
    console.log(`3. Importing addresses into AddressResolver...`)
    const deployments = [
        ...manifest.deployments,
        deploymentManager.deployment
    ]
    const targets2 = getTargetsFromEvents(
        deployments
            .map(d => d.events)
            .flat())
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
    const clean = await addressResolver.areAddressesImported(names, destinations)
    if (!clean) {
        const gasParams = await gasEstimator()
        const tx = await addressResolver.importAddresses(names, destinations, gasParams)
        console.log(`tx: ${tx.hash}`)
        await tx.wait(1)
        console.log(`Imported ${names.length} addresses.`)
    } else {
        console.log(chalk.gray(`No addresses to import.`))
    }
    
    // 4. Rebuild caches.
    console.log()
    console.log(`4. Rebuilding MixinResolver caches...`)

    // 4.1 Caches for proxies.
    // for (let [targetName, target] of Object.entries(targets2.system)) {
    //     if(targetName == 'AddressResolver') continue

    //     const i = new ethers.Contract(target.address, target.abi, signer)
        
    //     const fresh = await i.isResolverCached()
    //     if (fresh) {
    //         console.log(chalk.gray(`Skipping ${chalk.yellow(targetName)} - cache is fresh`))
    //         continue
    //     }

    //     console.log(`Rebuilding cache for ${chalk.yellow(targetName)}`)
    //     const gasParams = await gasEstimator()
    //     await i.rebuildCache(gasParams)
    // }

    // 4.2 Caches for implementations.
    /*
     * It's important that we map all past impls, as a user might delete a target,
     * but it's addressresolver cache still needs to be updated.
     * 
     * I learnt this at my time at Synthetix, when working on the CollateralEth bug.
    */
    for (let target of getAllImplementations(deployments
        .map(d => d.events)
        .flat()))
    {
        const i = new ethers.Contract(target.address, target.abi, signer)
        
        // check if we need to rebuild cache.
        if (!i.isResolverCached) continue

        // Log the version as well, since we might be rebuilding the cache of multiple versions.
        const fullyUniqueId = `${target.target} (v${target.version})`
        const fresh = await i.isResolverCached()
        if (fresh) {
            console.log(chalk.gray(`Skipping ${chalk.yellow(fullyUniqueId)} - cache is fresh`))
            continue
        }

        console.log(`Rebuilding cache for ${chalk.yellow(fullyUniqueId)}`)
        const gasParams = await gasEstimator()
        await i.rebuildCache(gasParams)
    }

    console.log('Done rebuilding caches.')
    console.log()

    // 5. Update manifest.
    console.log(`5. Saving deployments manifest...`)

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
        targets: targets2
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

    // Now test creating a new take shares market.
    // const takeMarket = contractsForResolver.filter(contract => contract.name == 'TakeMarket')[0].impl.contract
    // const tx = await takeMarket.getOrCreateTakeSharesContract(2)
    // await tx.wait(1)
}