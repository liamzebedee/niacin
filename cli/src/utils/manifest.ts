//
// Tools for using the manifest file and deployment events.
// 
import { Manifest, UpsertAddressProvider, UpsertProxyEvent } from "../types"
import { Targets } from "../types"
import { DeploymentEvent } from "../types"
import { ContractInfo } from "../types"
import { DeployImplEvent } from "../types"

export const eventToContractInfo = (event: UpsertAddressProvider | DeployImplEvent | UpsertProxyEvent): ContractInfo => {
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

// Computes latest targets from the deployment events.
export const getTargetsFromEvents = (events: DeploymentEvent[]): Targets => {
    let addressProvider: any = events.find(event => event.type == "upsert_address_provider") as UpsertAddressProvider
    if (addressProvider) {
        addressProvider = eventToContractInfo(addressProvider)
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
            if (acc[event.target] && acc[event.target].version > event.version) {
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
            ['AddressProvider']: {
                ...addressProvider,
            },
            ...proxies,
        },
        user: {
            ...userTargets
        }
    }
    return targets
}


// Exports a minimal set of information about the deployments.
// This is used to generate the npm package.
// Includes:
// - version
// - abi
// - address
// - deployBlock
export const exportDeployments = (manifest: Manifest) => {
    const entries = Object.values(manifest.targets.user).reduce((acc, entry) => {
        const { version, abi, address } = entry

        const proxy = manifest.targets.system[`Proxy`+entry.target]

        acc = {
            ...acc,
            [entry.target]: {
                version,
                abi,
                address: proxy.address,
                deployBlock: entry.deployTx.blockNumber,
            }
        }
        return acc
    }, {})

    const vendorEntries = Object.values(manifest.vendor).reduce((acc, entry) => {
        const { abi, address } = entry

        acc = {
            ...acc,
            [entry.target]: {
                abi,
                address,
            }
        }
        return acc
    }, {})

    return Object.assign({}, entries, vendorEntries)
}