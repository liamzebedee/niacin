const glob = require('glob')
const fs = require('node:fs')
import { join } from 'path'
import { resolve } from 'path'


export interface GenerateNPMPackageArgs {
    manifestPath: string,
    out: string
}

export async function generateNPMPackage(argv: GenerateNPMPackageArgs) {
    const { manifestPath } = argv
    const manifest = require(resolve(manifestPath))

    // TODO check version.

    const entries = manifest.deployments.filter((entry: any) => entry.name != "AddressResolver").reduce((acc: any, entry: any) => {
        // console.log(entry)
        const { version, abi } = entry.impl
        
        const { address } = entry.proxy

        acc = {
            ...acc,
            [entry.name]: {
                version,
                abi,
                address,
                deployBlock: entry.deployTx.blockNumber,
            }
        }
        return acc
    }, {})

    // Write to index.js
    const outfilePath = resolve(join(argv.out))
    console.log(outfilePath)
    fs.writeFileSync(outfilePath, `module.exports = ${JSON.stringify(entries, null, 4)}`)
}