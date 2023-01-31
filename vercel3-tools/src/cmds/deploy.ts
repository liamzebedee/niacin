const glob = require('glob')
const fs = require('node:fs')
import { join } from 'path'
import { resolve } from 'path'
import { ethers } from 'ethers'
import * as shell from 'shelljs'
import { ContractDeployment, Manifest, MANIFEST_VERSIONS } from '../types'

const DEPLOY_TRANSACTION_KEY = 'deployTransaction2'


interface DeployArgs {
    projectType: string
    projectDir: string
    inputManifest: string
    outputManifest: string
}

export async function deploy(argv: DeployArgs) {
    let { RPC_URL: rpcUrl, PRIVATE_KEY: privateKey } = process.env
    const {
        projectType,
        projectDir
    } = argv

    let inputManifest: Manifest
    try {
        inputManifest = require(resolve(join(process.cwd(), "/", argv.inputManifest))) as Manifest
    } catch (err) {
        throw new Error("Can't find input manifest: " + err)
    }

    shell.cd(projectDir)
    console.log(`Project directory: ${shell.pwd()}`)
    console.log(`Project type: ${projectType}`)
    console.log(`Input manifest: `)
    console.log(`> forge build`)



    // Run `forge build`.
    if (shell.exec('forge build').code !== 0) {
        shell.echo('Error: Forge build failed');
        shell.exit(1);
    }

    // Collect all contracts that aren't inside `lib` folders.
    // glob all contracts that don't match `lib/**`

    // glob pattern for listing all files in nested subdirectories, so long as no subdirectory matches lib or interfaces
    const pattern = 'src/**/*.sol'
    const files = glob.sync(pattern)
    const contractsForDeploy = files.filter((path: string) => {
        if (path.includes('lib')) {
            return false
        }
        if (path.includes('interfaces')) {
            return false
        }
        return true
    })

    console.debug()
    console.debug(`Contracts detected:`)
    console.debug(contractsForDeploy)

    // Collect artifacts.
    const artifacts = []
    for (let contractSrcPath of contractsForDeploy) {
        // Just extract the filename.
        const contractFilename = contractSrcPath.split('/').pop().split('.')[0]
        const contractWithoutExt = contractFilename.split('.').pop()
        const artifact = shell.cat(`./out/${contractFilename}.sol/${contractWithoutExt}.json`)
        // console.log(artifact)
        const artifactJson = JSON.parse(artifact)
        // console.log(artifactJson)

        artifacts.push(artifactJson)
    }
    const systemContracts = [
        'src/Proxy.sol',
        'src/AddressResolver.sol',
    ]
    const artifacts2 = artifacts
        // Filter: not system contracts.
        .filter(artifact => !systemContracts.includes(artifact.ast.absolutePath))
        // Filter: only contracts with changed bytecode.
        .filter(artifact => {
            const contractFilename = artifact.ast.absolutePath.split('/').pop().split('.')[0]
            const previous = inputManifest.deployments.find(deployment => deployment.name == contractFilename)
            if (previous == null) {
                return true
            }
            return previous.impl.bytecode.object != artifact.bytecode.object
        });

    console.log()
    console.log(`Contracts for deployment:`)
    console.log(artifacts2.map(artifact => artifact.ast.absolutePath))


    // Now deploy.
    // 

    // Get the latest deployment info if from a previous run.
    const prevDeployments = inputManifest.deployments

    const getOrDeploy = async (args: {
        name: string,
        abi: ethers.utils.Fragment[],
        bytecode: string,
        constructorArgs: any[],
        overwrite: boolean,
        proxy: boolean
    }) => {
        const { abi, bytecode, constructorArgs } = args
        const previous = prevDeployments.find(deployment => deployment.name == args.name)
        const yy = args.proxy ? 'proxy' : 'impl'
        const name = args.proxy ? `Proxy${args.name}` : args.name

        if (previous != null && previous[yy] != null && !args.overwrite) {
            console.log(`Loaded ${name} (v${previous[yy].version})`)
            const contract = new ethers.Contract(previous[yy].address, abi, signer)
            // @ts-ignore
            contract[DEPLOY_TRANSACTION_KEY] = previous.deployTx
            return contract
        }

        if (args.overwrite) {
            // Deploy.
            const version = 1 + (previous ? previous[yy].version : 0)
            console.log(`Deploying ${name} (v${version})`)
            const Contract = new ethers.ContractFactory(abi, bytecode, signer)
            const contract = await Contract.deploy(...constructorArgs)
            contract.deployTransaction.blockNumber = await (await provider.getTransactionReceipt(contract.deployTransaction.hash)).blockNumber
            // @ts-ignore
            contract[DEPLOY_TRANSACTION_KEY] = contract.deployTransaction
            return contract
        }

        throw new Error("Unexpected")
    }

    // Build the signer, provider, system contracts.
    const proxy_Artifact = artifacts.filter(artifact => artifact.ast.absolutePath == 'src/Proxy.sol')[0]
    const addressResolver_Artifact = artifacts.filter(artifact => artifact.ast.absolutePath == 'src/AddressResolver.sol')[0]

    if (projectType == 'foundry' && !rpcUrl) {
        rpcUrl = 'http://localhost:8545'
        privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
    }
    const provider = new ethers.providers.JsonRpcProvider()
    const signer = new ethers.Wallet(privateKey, provider)
    const account = await signer.getAddress()
    console.log()
    console.log(`RPC URL: ${rpcUrl}`)
    console.log(`Deploying from account: ${account}`)
    console.log()

    // 1. Deploy AddressResolver
    const addressResolver = await getOrDeploy({
        name: 'AddressResolver',
        abi: addressResolver_Artifact.abi,
        bytecode: addressResolver_Artifact.bytecode.object,
        constructorArgs: [account],
        overwrite: false,
        proxy: false
    })
    console.log(`AddressResolver is at ${addressResolver.address}`)

    const contractsForResolver = []

    // 2. Deploy contracts.
    console.log()
    console.log(`Deploying contracts...`)
    for (let artifact of artifacts2) {
        console.log()
        const contractName = artifact.ast.absolutePath.split('/').pop().split('.')[0]

        console.log(`[${artifact.ast.absolutePath}]`)
        // 2.1 Deploy Proxy.
        const proxy = await getOrDeploy({
            name: `${contractName}`,
            abi: proxy_Artifact.abi,
            bytecode: proxy_Artifact.bytecode.object,
            constructorArgs: [addressResolver.address],
            overwrite: false,
            proxy: true
        })

        // 2.2 Deploy implementation.
        const impl = await getOrDeploy({
            name: `${contractName}`,
            abi: artifact.abi,
            bytecode: artifact.bytecode.object,
            constructorArgs: [addressResolver.address],
            overwrite: true,
            proxy: false
        })

        // 2.3 Upgrade.
        const previous = prevDeployments.find(deployment => deployment.name == contractName)
        const version = 1 + (previous ? previous['impl'].version : 0)
        console.log(`Upgrading Proxy${contractName} to implementation v${version}`)
        const tx = await proxy.upgrade(impl.address)

        // Queue for resolver.
        // get the name of the contract from the artifact.
        contractsForResolver.push({
            name: contractName,
            proxy: {
                contract: proxy,
                address: proxy.address,
                abi: proxy_Artifact.abi,
                bytecode: artifact.bytecode,
                metadata: artifact.metadata,
            },
            impl: {
                contract: impl,
                address: impl.address,
                abi: artifact.abi,
                bytecode: artifact.bytecode,
                metadata: artifact.metadata,
            },
            path: artifact.ast.absolutePath,
            address: proxy.address,
        })
    }

    // 3. Now import the addresses.
    console.log()
    console.log(`Importing addresses into AddressResolver`)
    const names = contractsForResolver.map(contract => contract.name).map(ethers.utils.formatBytes32String)
    const destinations = contractsForResolver.map(contract => contract.address)
    await addressResolver.importAddresses(names, destinations)

    // 4. Rebuild caches.
    console.log()
    console.log(`Rebuilding MixinResolver caches...`)
    for (let contract of contractsForResolver) {
        if (contract.proxy.contract.rebuildCache) {
            console.log(`Rebuilding cache for Proxy${contract.name}`)
            await contract.proxy.contract.rebuildCache()
        }
        if (contract.impl.contract.rebuildCache) {
            console.log(`Rebuilding cache for ${contract.name}`)
            await contract.impl.contract.rebuildCache()
        }
    }
    console.log('Done rebuilding caches')

    const makeDeploymentEntry = (name: string, proxy: ethers.Contract, impl: ethers.Contract, abi: any[], bytecode: any, metadata: any, deployTx: ethers.Transaction) => {
        // TODO: CODE SMELL.
        const previous = prevDeployments.find(deployment => deployment.name == name)

        const entry: ContractDeployment = {
            name,
            proxy: null,
            impl: {
                // autoinc version.
                version: 1 + (previous ? previous.impl.version : 0),
                address: impl.address,
                abi: abi,
                bytecode: bytecode,
                metadata: metadata,
            },
            // @ts-ignore this blockNumber is set above.
            deployTx,
            abi,
        }

        if (proxy != null) {
            entry.proxy = {
                version: 1,
                address: proxy.address,
                abi: proxy_Artifact.abi,
                bytecode: bytecode,
                metadata: metadata,
            }
        }
        return entry
    }

    const newDeployments = []
        .concat(contractsForResolver.map(entry => {
            return makeDeploymentEntry(
                entry.name,
                entry.proxy.contract,
                entry.impl.contract,
                entry.impl.abi,
                entry.impl.bytecode,
                entry.impl.metadata,
                entry.impl.contract[DEPLOY_TRANSACTION_KEY]
            )
        }))
        .concat(
            addressResolver.deployTransaction
                ? [makeDeploymentEntry('AddressResolver', null, addressResolver, addressResolver_Artifact.abi, addressResolver_Artifact.bytecode.object, addressResolver_Artifact.metadata, addressResolver.deployTransaction)]
                : []
        );

    // Merge with previous inputManifest.deployments
    const deployments = inputManifest.deployments
        .filter((entry: ContractDeployment) => {
            return !newDeployments.map(entry => entry.name).includes(entry.name)
        })
        .concat(newDeployments)


    const manifest = {
        version: MANIFEST_VERSIONS.pop(),
        deployments,
    }

    fs.writeFileSync(
        '.vercel3/deployments/localhost/manifest.json',
        JSON.stringify(manifest, null, 2)
    )

    // Now test creating a new take shares market.
    const takeMarket = contractsForResolver.filter(contract => contract.name == 'TakeMarket')[0].impl.contract
    const tx = await takeMarket.getOrCreateTakeSharesContract(2)
    await tx.wait(1)
}