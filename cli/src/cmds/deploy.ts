const glob = require('glob')
const fs = require('node:fs')
import { join } from 'path'
import { resolve } from 'path'
import { ethers } from 'ethers'
import * as shell from 'shelljs'
import { Manifest, MANIFEST_VERSIONS, EMPTY_MANIFEST, DeployImplEvent, UpsertProxyEvent, ContractInfo, UpsertAddressResolver, DeploymentEvent, Targets, DeploymentNamespace } from '../types'
import { addressResolver_Artifact, systemContracts } from '../contracts'
import { proxy_Artifact } from '../contracts'
import chalk from 'chalk'

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
            
            const hasPreviousVersion = previousDeployment != null
            const shouldUpgrade = hasPreviousVersion && previousDeployment.bytecode.object != artifact.bytecode.object

            artifact.contractName = contractName
            // artifact.hasPreviousVersion = hasPreviousVersion
            // artifact.shouldUpgrade = shouldUpgrade
            artifact.previousDeployment = previousDeployment

            // We deploy if there is no previous deployment, or if we should upgrade.
            artifact.shouldDeploy = !hasPreviousVersion || shouldUpgrade
            return artifact
        })
        .filter(artifact => artifact.shouldDeploy)
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

const deployContract = async (args: DeployFuncArgs) => {
    const Contract = new ethers.ContractFactory(args.abi, args.bytecode, args.signer)
    const contract = await Contract.deploy(...args.constructorArgs)
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
}

const prompts = require('prompt-sync')({ sigint: true });

export async function deploy(argv: DeployArgs) {
    let { RPC_URL: rpcUrl, PRIVATE_KEY: privateKey } = process.env
    const {
        projectType,
        projectDir
    } = argv

    let manifest: Manifest
    try {
        const p = resolve(join(process.cwd(), "/", argv.manifest))
        manifest = require(p) as Manifest
    } catch (err) {
        // console.log("Can't find input manifest: " + err)
        console.log(`Creating new empty manifest...`)
        manifest = EMPTY_MANIFEST
    }

    // Attempt to read .allerrc.js
    let allerrc: any = {}
    try {
        const p = resolve(join(projectDir, "/.allerrc.js"))
        console.log(`Loaded .allerrc.js`)
        allerrc = require(p)
    } catch (err) {
        console.log("Can't find .allerrc.js: " + err)
    }
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
    
    const targets = findTargets()
        .filter(path => !ignoredFiles.includes(path))
    console.debug()
    console.debug(`Targets detected:`)
    console.debug(targets)

    const artifacts = findArtifacts(targets)
    const targetsForDeployment = getNewTargets(manifest, artifacts)

    console.log()
    console.log(`Contracts for deployment:`)
    console.log(targetsForDeployment.map(artifact => artifact.ast.absolutePath))


    // Now deploy.
    // 
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

    let deploymentEvents: any[] = []

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
        deploymentEvents.push({ 
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

        deploymentEvents.push(
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

        deploymentEvents.push(
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
        const tx = await proxy.upgrade(impl.address)
    }

    // 3. Import the addresses.
    // 

    console.log()
    console.log(`3. Importing addresses into AddressResolver...`)
    const deployments = [
        ...manifest.deployments,
        { 
            events: deploymentEvents,
            time: +new Date
        }
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
        await addressResolver.importAddresses(names, destinations)
        console.log(`Imported ${names.length} addresses.`)
    } else {
        console.log(chalk.gray(`No addresses to import.`))
    }
    
    // 4. Rebuild caches.
    console.log()
    console.log(`4. Rebuilding MixinResolver caches...`)

    // 4.1 Caches for proxies.
    for (let [targetName, target] of Object.entries(targets2.system)) {
        if(targetName == 'AddressResolver') continue

        const i = new ethers.Contract(target.address, target.abi, signer)
        
        const fresh = await i.isResolverCached()
        if (fresh) {
            console.log(chalk.gray(`Skipping ${chalk.yellow(targetName)} - cache is fresh`))
            continue
        }

        console.log(`Rebuilding cache for ${chalk.yellow(targetName)}`)
        await i.rebuildCache()
    }

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
        const fullyUniqueId = `${target.target} v${target.version}`
        const fresh = await i.isResolverCached()
        if (fresh) {
            console.log(chalk.gray(`Skipping ${chalk.yellow(fullyUniqueId)} - cache is fresh`))
            continue
        }

        console.log(`Rebuilding cache for ${chalk.yellow(fullyUniqueId)}`)
        await i.rebuildCache()    
    }

    console.log('Done rebuilding caches.')
    console.log()

    // 5. Update manifest.
    console.log(`5. Saving deployments manifest...`)

    const manifest2: Manifest = {
        version: MANIFEST_VERSIONS.pop(),
        deployments,
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