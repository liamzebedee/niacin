
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


interface GetStatusArgs {
    _: string[] // argv
    projectDir: string
    manifest: string
}

const ignoredFiles: string[] = [] // TODO load from config


export async function getStatus(argv: GetStatusArgs) {
    let { RPC_URL: rpcUrl, PRIVATE_KEY: privateKey } = process.env
    const {
        projectDir
    } = argv

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


    // Identify contracts for deployment.
    function findContractsForDeployment() {
        // console.log(chalk.yellow(`Searching for all contracts to deploy...`))
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
    }

    const {
        artifacts,
        allTargets,
        targetsForDeployment
    } = findContractsForDeployment()

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
        if (ignored) {
            status = 'ignored'
        } else if (deployInfo2.isNew) {
            status = 'new'
        } else if (deployInfo2.isModified) {
            status = 'modified'
        } else {
            status = 'unchanged'
        }

        let action = ''
        if (ignored) {
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
                if (fields[3] != 'none') {
                    fields = fields.map(field => chalk.yellow(field))
                }
            }
            return fields
        }))

    const targetsStaged = targetsForDeployment
        .filter(artifact => artifact.shouldDeploy)


    // Print a summary for the deployment.
    // contract                 | version  | status    | action
    // src/TakeMarketShares.sol | n/a      | new       | deploy
    // src/TakeMarketShares.sol | v1 -> v2 | modified  | upgrade
    // src/TakeMarketShares.sol | v1       | unchanged | none
    // console.log()
    // console.log(chalk.white("Contracts:"))
    // console.log()
    console.log(table(deploymentSummaryTable))

    // console.log()
    // console.log(chalk.yellow("Vendored contracts:"))
    // console.log()
    // const columns2 = 'Contract | Address'.split(' | ')
    // const vendorSummaryTable = [columns2]
    //     .concat(Object.values(manifest.vendor).map(info => {
    //         let fields = [
    //             info.target,
    //             info.address
    //         ]

    //         fields = fields.map(field => chalk.yellow(field))
    //         return fields
    //     }))

    // console.log(table(vendorSummaryTable))
}