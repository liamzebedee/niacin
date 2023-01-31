import { ethers } from "ethers"

// Use .pop to get the latest.
export const MANIFEST_VERSIONS = [
    '0.1.0'
]

export interface Manifest {
    version: string
    deployments: ContractDeployment[]
}

export const EMPTY_MANIFEST: Manifest = {
    "version": "0.1.0",
    "deployments": []
}

export interface ContractInfo {
    version: number
    address: string
    abi: ethers.utils.Fragment[]
    bytecode: {
        object: string
        sourceMap: string
        linkReferences: any
    }
    metadata: any
}

export interface ContractDeployment {
    name: string
    proxy: ContractInfo
    impl: ContractInfo
    deployTx: ethers.Transaction & { blockNumber: number }
    abi: ethers.utils.Fragment[]
}