const glob = require('glob')
const fs = require('node:fs')
import { join } from 'path'
import { resolve } from 'path'
import { exportDeployments } from '../utils/manifest'
import { Manifest, VendoredContractInfo } from '../types'
const fetch = require('node-fetch')
const ethers = require('ethers')

export interface AddVendorArgs {
    manifest: string,
    name: string,
    address: string,
    abi?: string,
    bytecode?: string,
    artifact?: string,
    fetchFromEtherscan?: string,
}

async function fetchContractFromEtherscan(etherscanUrl: string) {
    // https://api.etherscan.io/api?module=contract&action=getabi&address=0xBB9bc244D798123fDe783fCc1C72d3Bb8C189413&apikey=YourApiKeyToken
    // UGH. Different

    // Parse URL.
    const url = new URL(etherscanUrl)
    if (!url.hostname.endsWith('etherscan.io')) {
        console.error("Unexpected Etherscan URL. Fetch from Etherscan is in beta.")
        throw new Error(`Unexpected Etherscan URL: ${etherscanUrl}`)
    }

    // Parse path.
    // There are two types of Etherscan URLs we support:
    // 1. https://etherscan.io/address/0x42
    // 2. https://etherscan.io/token/0x42
    //
    // Check we are one of these.
    const path = url.pathname.split('/')
    if (path.length !== 3) {
        console.error("Unexpected Etherscan URL. Fetch from Etherscan is in beta.")
        throw new Error(`Unexpected Etherscan URL: ${etherscanUrl}`)
    }
    if (path[1] !== 'address' && path[1] !== 'token') {
        console.error("Unexpected Etherscan URL. Fetch from Etherscan is in beta.")
        throw new Error(`Unexpected Etherscan URL: ${etherscanUrl}`)
    }
    const address = path[2]

    // Now we can fetch the ABI and bytecode from Etherscan.
    // The etherscan API endpoint has various domains for different networks:
    // https://api.etherscan.io/api
    // https://api-ropsten.etherscan.io/api
    // https://api-goerli.etherscan.io/api
    // https://api-optimism.etherscan.io/api
    // We extract the network suffix from the original URL's subdomain, if any.
    let suffix = ''
    if (url.hostname.length > 'etherscan.io'.length) {
        suffix = `-${url.hostname.split('.')[0]}`
    }
    // Construct the URL.
    const etherscanApiEndpoint = `https://api${suffix}.etherscan.io/api`
    // Call the `getabi` func.
    const etherscanApiKeyToken = process.env.ETHERSCAN_API_KEY || 'YourApiKeyToken'
    const etherscanApiCall = `${etherscanApiEndpoint}?module=contract&action=getabi&address=${address}&apikey=${etherscanApiKeyToken}`
    const res = await fetch(etherscanApiCall, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    const json = await res.json()
    if (json.status !== '1') {
        console.error("Unexpected Etherscan response. Fetch from Etherscan is in beta.")
        throw new Error(`Unexpected Etherscan response: ${json.message}`)
    }
    const abi = JSON.parse(json.result)
    console.log(abi)

    return { abi, address }
}

export async function addVendor(argv: AddVendorArgs) {
    const { manifest: manifestPath, name: contractName } = argv
    const manifest = require(resolve(manifestPath)) as Manifest

    // Check if the vendored dependency already exists.
    if (manifest.vendor[contractName]) {
        console.error(`Vendored contract ${contractName} already exists in the manifest.`)
        return
    }

    // There are two main flows here:
    // 
    // 1. ABI.
    // The user has an ABI in a JSON file.
    // 
    // 2. Etherscan.
    // The user has an address and wants us to fetch the ABI and bytecode from Etherscan.
    // 

    async function fetchFromABIOnDisk() {
        console.log(`Fetching ABI from disk...`)
        const abi = require(argv.abi)

        // Validate the ABI file.
        try {
            const i = new ethers.Contract(argv.address, abi)
        } catch(err) {
            throw new Error("Error parsing ABI file as a valid ABI.:\n\n" + err.toString())
        }

        return {
            target: contractName,
            address: argv.address,
            abi,
        }
    }

    async function vendorFromEtherscan() {
        console.log(`Fetching ABI and bytecode from Etherscan...`)
        console.log(argv.fetchFromEtherscan)

        const { abi, address } = await fetchContractFromEtherscan(argv.fetchFromEtherscan)
        return {
            target: contractName,
            address,
            abi,
        }
    }

    // Fetch the contract info.
    console.log(`Fetching contract info...`)
    let info: VendoredContractInfo
    if (argv.fetchFromEtherscan) {
        info = await vendorFromEtherscan()
    } else {
        info = await fetchFromABIOnDisk()    
    }
    
    // Add the contract to the manifest.
    console.log(`Adding contract ${contractName} to the manifest...`)
    manifest.vendor[contractName] = info

    // Write the manifest back to disk.
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))

    console.log(`Done.`)
}