const glob = require('glob')
const fs = require('node:fs')
import { join } from 'path'
import { resolve } from 'path'
import { exportDeployments } from '../utils/manifest'
import { Manifest } from '../types'


export interface GenerateNPMPackageArgs {
    manifestPath: string,
    out: string
}

export async function generateNPMPackage(argv: GenerateNPMPackageArgs) {
    const { manifestPath } = argv
    const manifest = require(resolve(manifestPath)) as Manifest

    // TODO check version.
    const entries = exportDeployments(manifest)

    // Write to index.js
    const outfilePath = resolve(join(argv.out))
    console.log(outfilePath)
    fs.writeFileSync(outfilePath, `module.exports = ${JSON.stringify(entries, null, 4)}`)
}