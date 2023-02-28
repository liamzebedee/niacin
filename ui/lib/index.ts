import { ethers } from 'ethers'
import chainIds from './chainIds.json'
import rpcs from './rpcs'

export function getChainName(chainId: number) {
    // @ts-ignore
    const networkName = chainIds[chainId.toString()] as any
    return networkName
}

export function getProviderForChainId(chainId: number) {
    // @ts-ignore
    const networkName = chainIds[chainId.toString()] as any
    console.log(networkName)
    // @ts-ignore
    const info = rpcs[chainId.toString()]

    const rpcUrl = info.rpcs.find((rpc: any) => {
        let url
        // if rpc is a string
        if (typeof rpc === 'string') {
            url = rpc
        } else {
            url = rpc.url
        }

        // Check stuff.
        if (url.includes('omniatech')) return false
        return true
    })

    const provider = new ethers.JsonRpcProvider(rpcUrl)
    return provider
}