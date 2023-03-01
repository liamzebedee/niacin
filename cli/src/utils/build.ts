// 
// Utilities for processing the build output of Foundry/Forge projects.
// 
import { AllerArtifact, EVMBuildArtifact, Manifest } from "../types"
import * as shell from 'shelljs'
const glob = require('glob')

// Finds all targets in the project.
// NOTE: must shell.cd into the project directory first.
export const findTargets: () => string[] = () => {
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

// Finds the build artifacts for targets.
export const findArtifacts = (targetPaths: string[]) => {
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

// Computes the status of all targets and whether they have changed, based on the latest artifacts.
export const getNewTargets = (inputManifest: Manifest, artifacts: EVMBuildArtifact[]) => {
    const newTargetsArtifacts = artifacts
        // Filter: only contracts with changed bytecode.
        .map(evmArtifact => {
            let artifact: AllerArtifact = evmArtifact as AllerArtifact

            const contractFilename = artifact.ast.absolutePath.split('/').pop().split('.')[0]
            const contractName = contractFilename.split('.').pop()
            const previousDeployment = inputManifest.targets.user[contractFilename]
            const proxyIdentity = inputManifest.targets.system[`Proxy` + contractFilename]

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
