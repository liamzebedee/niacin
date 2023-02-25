const fs = require('node:fs')
import { join } from 'path'
import { resolve } from 'path'
import { AllerConfig, CONFIG_VERSIONS } from '../types'

export interface InitializeProjectArgs {
    out: string
}

export async function initializeProject(argv: InitializeProjectArgs) {
    const p = resolve(join(argv.out))

    const defaultConfig: AllerConfig = {
        version: CONFIG_VERSIONS.pop(),
        ignore: []
    }

    // Write config.
    fs.writeFileSync(p, `module.exports = ${JSON.stringify(defaultConfig, null, 4)}`)
    console.log(`Wrote config to:`, p)
}