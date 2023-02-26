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
        ignore: [],
        scripts: {
            initialize: null
        }
    }

    // Write config.
    let jsonFormatted = JSON.stringify(defaultConfig, null, 4)
    
    // Remove the quotes on props.
    // NOTE: This isn't perfect, but it's good enough for now.
    jsonFormatted = jsonFormatted.replace(/"([^"]+)":/g, '$1:');

    fs.writeFileSync(p, `module.exports = ${jsonFormatted}`)
    console.log(`Wrote config to:`, p)
}