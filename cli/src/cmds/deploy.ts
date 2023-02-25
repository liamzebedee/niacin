const glob = require('glob')
const fs = require('node:fs')
import { join } from 'path'
import { resolve } from 'path'
import { ethers } from 'ethers'
import * as shell from 'shelljs'
import { Manifest, MANIFEST_VERSIONS, EMPTY_MANIFEST, DeployImplEvent, UpsertProxyEvent, ContractInfo, UpsertAddressResolver, DeploymentEvent, Targets, DeploymentNamespace, Deployment, EVMBuildArtifact, AllerArtifact, AllerConfig, VersionControlInfo } from '../types'
import { addressResolver_Artifact, systemContracts } from '../contracts'
import { proxy_Artifact } from '../contracts'
import chalk from 'chalk'
import { table } from 'table'
const prompts = require('prompt-sync')({ sigint: true });

const DEPLOY_TRANSACTION_KEY = 'deployTransaction2'

const logTx = (tx: ethers.Transaction) => {
    console.debug(chalk.gray(`tx: ${tx.hash}`))
}

const promptConfirmation = (msg: string, yes: boolean): boolean => {
    if (yes) {
        console.log(`${msg} [y/N]: y`)
        return true
    } else {
        const answer = prompts(`${msg} [y/N]: `)
        return answer == "y"
    }
}

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
        if (path.includes('lib/')) {
            return false
        }
        if (path.includes('libraries/')) {
            return false
        }
        if (path.includes('test/')) {
            return false
        }
        if (path.includes('interfaces/')) {
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
        const artifactJson = JSON.parse(artifact) as EVMBuildArtifact
        artifacts.push(artifactJson)
    }
    return artifacts
}


const getNewTargets = (inputManifest: Manifest, artifacts: EVMBuildArtifact[]) => {
    const newTargetsArtifacts = artifacts
        // Filter: only contracts with changed bytecode.
        .map(evmArtifact => {
            let artifact: AllerArtifact = evmArtifact as AllerArtifact

            const contractFilename = artifact.ast.absolutePath.split('/').pop().split('.')[0]
            const contractName = contractFilename.split('.').pop()
            const previousDeployment = inputManifest.targets.user[contractFilename]
            const proxyIdentity = inputManifest.targets.system[`Proxy`+contractFilename]

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
            artifact.proxyIdentity = proxyIdentity

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
    logTx(contract.deployTransaction)

    await contract.deployTransaction.wait()
    const rx = await args.signer.provider.getTransactionReceipt(contract.deployTransaction.hash)
    contract.deployTransaction.blockNumber = rx.blockNumber
    // @ts-ignore
    contract[DEPLOY_TRANSACTION_KEY] = contract.deployTransaction

    console.log(chalk.gray(`contract: ${contract.address}`))
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

class DeploymentManager {
    deployment: Deployment

    constructor(public manifestPath: string, public manifest: Manifest, private revision: VersionControlInfo) {
        this.deployment = {
            events: [],
            time: +new Date,
            revision,
            _complete: false,
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
            // At each step, we write the new deployment events to disk.
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

interface DeployArgs {
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
// has access to the AddressResolver, which allows contracts to look up other contracts by name.
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
// Then it will update the AddressResolver with the latest version of each target.
// 
// The entire history of the deployment, including the ABI's of previous versions of each target, is stored in
// a manifest file. This allows us to easily refer to previous versions of a target, and to easily access their
// previous ABI's. It also allows us to easily rollback to a previous implementation with ease.
// 
// From the deployment events, we can determine the targets, with their names, versions, and addresses.
// And we can generate a lightweight JS package, which can be used to easily access the deployed targets.
// 
// ADDITIONAL NOTES:
// - the block number a contract is deployed at is essential for indexers. This is stored.
// - contracts which are deleted from a codebase still need to resolve other contracts, which may still be maintained.
//   as such, we need to keep the old versions of the contracts in the manifest, which are injected with the new targets
//   when they are deployed.
// - the manifest contains deployments for a single chain. Multichain deployments can be done by using separate manifest files.
// 
// COMPARISON:
// - Diamond Standard. What a fucking shitshow.
// - OZ Proxies. What a slightly less but ever grande shitshow.
// - Vercel/Next.js. The divine inspiration for this tool.
// - Synthetix v2 deployer. I adapted 80% of the code from the Synthetix deployer, but rewritten to be more user-friendly and tool-like.
// - Chugsplash. A very interesting approach, though much too complex a solution in my eyes.
// 
// ACKNOWLEDGEMENTS:
// - This tool is based off of the Synthetix v2 deployer, and 7yrs experience in deploying smart contracts, 
//   subgraphs, frontends, and other tools. It's been a long ride, and to be honest, I was expecting someone
//   to make this much sooner.
// 
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
        const res = fs.accessSync(p, fs.constants.R_OK)
    } catch (err) {
        throw Error(`Can't find .allerrc.js at ${p}: ${err}`)
    }
    console.log(`Loading configuration: ${p}`)
    console.log(`Loaded .allerrc.js`)
    const allerrc = require(p) as AllerConfig

    // Load gas estimator.
    let gasEstimatorName = argv.gasEstimator || 'default'
    // @ts-ignore
    gasEstimator = gasEstimators[gasEstimatorName]
    if(!gasEstimator) {
        throw new Error(`Unknown gas estimator: ${gasEstimatorName}`)
    }
    console.log(`Using gas estimator: ${gasEstimatorName}`)


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
    
    const allTargets = findTargets()
    const targets = allTargets
        .filter(path => !ignoredFiles.includes(path))

    const artifacts = findArtifacts(targets)
    let targetsForDeployment = getNewTargets(manifest, artifacts)

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
    
    // console.table(humanInfo)
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

    targetsForDeployment = targetsForDeployment
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
    

    
    const deploymentManager = new DeploymentManager(argv.manifest, manifest, versionControlInfo)
    console.log()
    console.log(chalk.green("(2) Deploy"))

    // Build the signer, provider, system contracts.
    if(!rpcUrl) {
        console.log(chalk.gray(`No RPC URL provided. Using default for project type: ${projectType}`))
        if (projectType == 'foundry' || projectType == 'hardhat') {
            rpcUrl = 'http://localhost:8545'
        } else {
            throw new Error("No RPC URL provided.")
        }
    }

    if(!privateKey) {
        console.log(chalk.gray(`No PRIVATE KEY provided. Using default for project type: ${projectType}`))
        if (projectType == 'foundry' || projectType == 'hardhat') {
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

    // 1. AddressResolver
    console.log(`1. Locating AddressResolver...`)
    console.log()
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
    if (targetsForDeployment.length == 0) {
        console.log()
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
            constructorArgs: [],
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
        const nextVersion = 1 + (previous ? previous.version : 0)
        console.log(`Deploying ${chalk.yellow(artifact.contractName)} v${nextVersion}`)

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
                version: nextVersion, 
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
        console.log(`Upgrading ${chalk.yellow(proxyName)} to implementation v${nextVersion}`)
        const gasParams = await gasEstimator()
        const tx = await proxy.upgrade(impl.address, nextVersion, gasParams)
        logTx(tx)
        await tx.wait(1)
    }

    // 3. Import the addresses.
    // 

    console.log()
    console.log(`3. Importing addresses into AddressResolver...`)
    console.log()
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
    // console.debug(names, destinations)
    if (!clean) {
        const gasParams = await gasEstimator()
        const tx = await addressResolver.importAddresses(names, destinations, gasParams)
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

    // 4.1 Caches for implementations.
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

        // Log the version as well, since we might be rebuilding the cache of multiple versions.
        const fullyUniqueId = `${target.target} (v${target.version})`
        
        const fresh = await i.isResolverCached()
        if (fresh) {
            console.log(chalk.gray(`Skipping ${chalk.yellow(fullyUniqueId)} - cache is fresh`))
            continue
        }

        console.log(`Rebuilding cache for ${chalk.yellow(fullyUniqueId)}`)
        // console.debug(chalk.gray(`Address: ${target.address}`))
        const gasParams = await gasEstimator()
        const tx = await i.rebuildCache(gasParams)
        logTx(tx)
        await tx.wait(1)
    }
    
    console.log()
    console.log('Done rebuilding caches.')
    console.log()

    // 5. Update manifest.
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
}