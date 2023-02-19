import { ethers } from "ethers"

// Use .pop to get the latest.
export const MANIFEST_VERSIONS = [
    '0.1.0'
]

export interface Manifest {
    version: string
    targets: Targets
    deployments: Deployment[]
}

export interface Targets {
    system: Record<string, ContractInfo>
    user: Record<string, ContractInfo>
}

export interface Deployment {
    events: DeploymentEvent[]
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
