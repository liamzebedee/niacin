import { ethers } from "ethers"

// Use .pop to get the latest.
export const MANIFEST_VERSIONS = [
    '0.1.0'
]

export const CONFIG_VERSIONS = [
    '0.1.0'
]

export interface AllerConfig {
    version: string
    ignore: string[]
}

export interface Manifest {
    version: string
    targets: Targets
    deployments: Deployment[]
}

export interface Targets {
    system: Record<string, ContractInfo>
    user: Record<string, ContractInfo>
}

export interface VersionControlInfo {
    type: 'git' | 'none'
    tag: string
    branch: string
    dirty: boolean
    descriptor: string
}

export interface Deployment {
    events: DeploymentEvent[]
    time: number
    
    // A tag from a version control system. For Git, this is a git hash.
    revision: VersionControlInfo

    // Internal/WIP.
    _complete: boolean
}

export type DeploymentEvent = UpsertAddressResolver | UpsertProxyEvent | DeployImplEvent | ImportAddressesEvent | RebuildCacheEvent 

// {
//     type: 'upsert_proxy' | 'deploy_impl' | 'upgrade_to_impl' | 'import_addresses' | 'rebuild_cache'
//     event: 
// }

interface GenericContractDeployEvent {
    address: string
    abi: ethers.utils.Fragment[]
    deployTx: any

    bytecode: {
        object: string
        sourceMap: string
        linkReferences: any
    }
    metadata: any
}

export interface UpsertAddressResolver extends GenericContractDeployEvent {
    type: 'upsert_address_resolver'
    target: 'AddressResolver'
    address: string
    abi: ethers.utils.Fragment[]
    deployTx: any
}

export interface UpsertProxyEvent extends GenericContractDeployEvent {
    type: 'upsert_proxy'
    abi: ethers.utils.Fragment[]
    deployTx: any
    proxy: any // ethers.Contract
    target: string,
    proxyName: string,
    address: string
}

export interface DeployImplEvent {
    type: 'deploy_impl'
    abi: ethers.utils.Fragment[]
    deployTx: any
    target: string
    version: number
    address: string
    from_impl: string
    to_impl: string,


    bytecode: {
        object: string
        sourceMap: string
        linkReferences: any
    }
    metadata: any
}

export interface ImportAddressesEvent {
    type: 'import_addresses'
}

export interface RebuildCacheEvent {
    type: 'rebuild_cache'
}

export type DeploymentNamespace = 'system' | 'user'

export const EMPTY_MANIFEST: Manifest = {
    version: "0.1.0",
    targets: {
        system: {},
        user: {}
    },
    deployments: []
}

export interface ContractInfo {
    target: string
    version: number
    address: string
    abi: ethers.utils.Fragment[]
    bytecode: {
        object: string
        sourceMap: string
        linkReferences: any
    }
    metadata: any
    deployTx: ethers.Transaction & { blockNumber: number }
}

export interface EVMBuildArtifact {
    ast: {
        absolutePath: string
    }
    bytecode: {
        object: string
        sourceMap: string
        linkReferences: any
    }
    abi: ethers.utils.Fragment[]
}

// TODO refactor this, it's temporary
export interface AllerArtifact extends EVMBuildArtifact {
    contractName: string
    hasPreviousVersion: boolean
    shouldUpgrade: boolean
    previousDeployment: ContractInfo
    isModified: boolean
    isNew: boolean
    proxyIdentity: ContractInfo

    // We deploy if there is no previous deployment, or if we should upgrade.
    shouldDeploy: boolean
    metadata: any
}