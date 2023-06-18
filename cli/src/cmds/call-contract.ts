
const fs = require('node:fs')
import chalk from 'chalk'
import { ethers } from 'ethers'
import { join, resolve } from 'path'
import * as shell from 'shelljs'
import { table } from 'table'
import {
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
import { getRpc } from '../utils/rpc'


interface CallContractArgs {
    //   _: [ 'call', 'Contract', 'addressProvider' ],
    _: string[] // argv
    projectDir: string
    manifest: string
}


export async function callContract(argv: CallContractArgs) {
    // Load manifest.
    let manifest: Manifest
    try {
        const p = resolve(join(process.cwd(), "/", argv.manifest))
        manifest = require(p) as Manifest
    } catch (err) {
        manifest = EMPTY_MANIFEST

        // It doesn't actually matter if there is no manifest.json, since 
        // we would prefer to show the user information before they deploy too.
    }

    let { RPC_URL: rpcUrl, PRIVATE_KEY: privateKey } = process.env
    const {
        signer,
    } = await getRpc(rpcUrl, privateKey, 'foundry')
    
    // Lookup the contract.
    const [contractName, methodName] = argv._.slice(1)
    
    // Load the target from the manifest.
    const namespaces = [
        manifest.targets.system,
        manifest.targets.user,
        manifest.vendor,
    ]

    if (!contractName) {
        const usage = `
    Usage: 
      niacin call <contract> <method> [<arg0>] [<arg1>] ...\n
    Available contracts: \n- ${namespaces.map(x => Object.keys(x)).flat().map(x => chalk.yellow(x)).join('\n- ')}
    `.split('\n').map(x => x.trim()).join('\n')
        console.log(`${usage}`)
        process.exit(1)
    }

    let target
    while(!target) {
        const namespace = namespaces.pop()
        if (!namespace) {
            throw new Error(`Could not find contract ${contractName} in manifest`)
        }
        target = namespace[contractName]
    }

    // Load the contract.
    const contract = await getContract({
        address: target.address,
        abi: [
            // @ts-ignore
            ...target.abi,
        ],
        signer
    })

    // Parse the call.
    //

    const usage = `
    Usage: 
      niacin call <contract> <method> [<arg0>] [<arg1>] ...\n
    Available methods: \n- ${Object.keys(contract.interface.functions).map(x => chalk.yellow(x)).join('\n- ')}
    `.split('\n').map(x=>x.trim()).join('\n')
    if (argv._.length < 3) {
        console.log(`${usage}`)
        process.exit(1)
    }

    // `contract.interface.functions` returns the signature, eg. requireAddress(bytes32), whereas we just want the name, eg. requireAddress.
    const availableMethods = Object.keys(contract.interface.functions).map(name => name.split('(')[0])
    if (!availableMethods.includes(methodName)) {
        throw new Error(`No method ${chalk.red(methodName)} on contract ${chalk.red(contractName)}.\n${usage}`)
    }

    // Parse any argument that contain decimals.
    const args = process.argv.slice(5)
    // console.log(process.argv)
    // console.log(argv)
    // console.log(args)

    const fn = Object.entries(contract.interface.functions).find(([fn]) => fn.startsWith(methodName))[1]
    let args2 = []
    for (let i = 0; i < args.length; i++) {
        const arg = args[i]
        // if arg contains only numbers, and a decimal point, then we parse it as
        // a decimal with 18 places.
        if (arg.match(/^[0-9]*\.[0-9]*$/)) {
            args2.push(ethers.utils.parseEther(arg))
        } else {
            args2.push(arg)
        }
    }

    // console.log(args2)


    // Now call the contract.
    // 

    // Detect if it's a write:
    const isWrite = fn.stateMutability != 'view'
    if (isWrite) {
        const tx = await contract[methodName](...args2)
        await tx.wait(1)
        console.log(tx.hash)
    } else {
        const res = await contract[methodName](...args2)
        console.log(res)
    }
}