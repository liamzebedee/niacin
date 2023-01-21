const glob = require('glob')
const fs = require('node:fs')

interface DeployArgs {
    projectType: string
    projectDir: string
    out: string
    dataDir: string
}

import { ethers } from 'ethers'
import * as shell from 'shelljs'

async function deploy(argv: DeployArgs) {
    const { projectType, projectDir, outDir } = argv

    shell.cd(projectDir)
    console.log(`Project directory: ${shell.pwd()}`)
    console.log(`forge build`)

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
        if(path.includes('lib')) {
            return false
        }
        if (path.includes('interfaces')) {
            return false
        }
        return true
    })

    console.log(contractsForDeploy)

    // Collect artifacts.
    const artifacts = []
    for(let contractSrcPath of contractsForDeploy) {
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
    const artifacts2 = artifacts.filter(artifact => !systemContracts.includes(artifact.ast.absolutePath))


    // Now deploy.
    // 
    const proxy_Artifact = artifacts.filter(artifact => artifact.ast.absolutePath == 'src/Proxy.sol')[0]
    const addressResolver_Artifact = artifacts.filter(artifact => artifact.ast.absolutePath == 'src/AddressResolver.sol')[0]

    const provider = new ethers.providers.JsonRpcProvider('http://localhost:8545')
    const signer = new ethers.Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", provider)
    const account = await signer.getAddress()
    console.log(`Deploying from account: ${account}`)
    
    // 1. Deploy AddressResolver
    const AddressResolver = new ethers.ContractFactory(addressResolver_Artifact.abi, addressResolver_Artifact.bytecode.object, signer)
    const addressResolver = await AddressResolver.deploy(account)
    console.log()
    console.log(`AddressResolver deployed at ${addressResolver.address}`)

    const contractsForResolver = []

    // 2. Deploy contracts.
    console.log()
    console.log(`Deploying contracts...`)
    for (let artifact of artifacts2) {
        console.log()
        const contractName = artifact.ast.absolutePath.split('/').pop().split('.')[0]

        console.log(`[${artifact.ast.absolutePath}]`)
        // 2.1 Deploy Proxy.
        console.log(`Deploying Proxy${contractName}`)
        const Proxy = new ethers.ContractFactory(proxy_Artifact.abi, proxy_Artifact.bytecode.object, signer)
        const proxy = await Proxy.deploy(addressResolver.address)

        // 2.2 Deploy implementation.
        console.log(`Deploying ${contractName} (impl)`)
        const Implementation = new ethers.ContractFactory(artifact.abi, artifact.bytecode.object, signer)
        const implementation = await Implementation.deploy(addressResolver.address)

        // 2.3 Upgrade.
        console.log(`Upgrading Proxy${contractName}`)
        const tx = await proxy.upgrade(implementation.address)

        // Queue for resolver.
        // get the name of the contract from the artifact.
        contractsForResolver.push({
            name: contractName,
            proxy: {
                contract: proxy,
                address: proxy.address,
                abi: proxy_Artifact.abi,
            },
            impl: {
                contract: implementation,
                address: implementation.address,
                abi: artifact.abi,
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
        if(contract.proxy.contract.rebuildCache) {
            console.log(`Rebuilding cache for Proxy${contract.name}`)
            await contract.proxy.contract.rebuildCache()
        }
        if (contract.impl.contract.rebuildCache) {
            console.log(`Rebuilding cache for ${contract.name}`)
            await contract.impl.contract.rebuildCache()
        }
    }
    console.log('Done rebuilding caches')
    
    // Now save the deployment info.
    shell.mkdir('.vercel3')
    shell.mkdir('.vercel3/deployments')
    shell.mkdir('.vercel3/deployments/localhost')

    const makeDeploymentEntry = (name: string, proxy: ethers.Contract, impl: ethers.Contract, abi: any[], deployTx: ethers.Transaction) => {
        return {
            name,
            proxy: proxy.address,
            impl: impl.address,
            deployTx,
            abi,
        }
    }

    const makeSpecialDeploymentEntry = ({ name, abi, address, deployTx } : { name: string, abi: any[], address: string, deployTx: ethers.Transaction }) => {
        return {
            name,
            deployTx,
            abi,
            address,
        }
    }

    const manifest = []
        .concat(contractsForResolver.map(entry => {
            return makeDeploymentEntry(entry.name, entry.proxy.contract, entry.impl.contract, entry.impl.abi, entry.impl.contract.deployTransaction)
        }))
        .concat([
            {
                name: 'AddressResolver',
                address: addressResolver.address,
                abi: addressResolver_Artifact.abi,
                deployTx: addressResolver.deployTransaction,
            }
        ].map(makeSpecialDeploymentEntry))
    
    fs.writeFileSync('.vercel3/deployments/localhost/manifest.json', JSON.stringify(manifest, null, 2))

    // Now test creating a new take shares market.
    // const takeMarket = contractsForResolver.filter(contract => contract.name == 'TakeMarket')[0].impl.contract
    // await takeMarket.getOrCreateTakeSharesContract(2);
}

const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')

yargs(hideBin(process.argv))
    .scriptName("vercel3-tools")
    .usage('$0 <cmd> [args]')
    // @ts-ignore
    .command('deploy', 'deploy the contracts', (yargs) => {
        return yargs
            .option('project-type', {
                type: 'string',
                enum: ['foundry'],
            })
            .option('project-dir', {
                type: 'string',
                description: 'The project directory',
            })
            .option('data-dir', {
                type: 'string',
                description: 'The data directory for the project',
                default: '.vercel3',
            })
            .option('out-dir', {
                type: 'string',
                description: 'The output directory for artifacts',
                default: '.',
            })
            .demandOption(['project-dir'], '')
    }, deploy)
    .help()
    .parse()