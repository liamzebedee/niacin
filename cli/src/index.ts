import { deploy } from "./cmds/deploy"
import { generateNPMPackage } from "./cmds/generate-npm-pkg"

const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')

yargs(hideBin(process.argv))
    .scriptName("aller")
    .usage('$0 <cmd> [args]')
    // @ts-ignore
    .command('deploy', 'deploy the contracts', (yargs) => {
        return yargs
            .option('project-type', {
                type: 'string',
                enum: ['foundry', 'hardhat'],
            })
            .option('project-dir', {
                type: 'string',
                description: 'The contracts project directory (ie. Foundry, Hardhat project)',
            })
            .option('manifest', {
                type: 'string',
                description: 'The manifest.json of previous deployments. The new manifest is written to this file.',
                default: '.vercel3',
            })
            .option('config', {
                type: 'string',
                description: 'The path to the .allerrc.js configuration file.',
                default: '.allerrc.js',
            })
            .option('gas-estimator', {
                type: 'string',
                description: 'This configures a custom gas estimator. For Polygon, this uses the Polygon gas station. Options: polygon',
                enum: ['polygon'],
            })
            .demandOption(['project-dir', 'manifest'], '')
    }, deploy)
    .command('generate-npm-pkg', 'generate an NPM package from a deployment manifest', (yargs: any) => {
        return yargs
            .option('manifest-path', {
                type: 'string',
                description: 'The path to the manifest.json',
            })
            .option('out', {
                type: 'string',
                description: 'The output path for the index.js file',
            })
            .demandOption(['manifest-path'], '')
    }, generateNPMPackage)
    .help()
    .demandCommand()
    .parse()