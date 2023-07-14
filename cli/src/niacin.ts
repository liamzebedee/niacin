import { deploy } from "./cmds/deploy"
import { generateNPMPackage } from "./cmds/generate-npm-pkg"
import { initializeProject } from "./cmds/initialize-project"
import { addVendor } from "./cmds/add-vendor"
import { generateSolInterface } from "./cmds/generate-sol-interface"
import { getStatus } from './cmds/get-status'
import { callContract } from './cmds/call-contract'
import { DEFAULT_CONFIG_FILE, DEFAULT_MANIFEST_FILE } from "./config"

const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')

yargs(hideBin(process.argv))
    .scriptName("niacin")
    .usage('$0 <cmd> [args]')
    .coerce('_', (arg: any) => arg)
    // @ts-ignore
    .command('deploy', 'deploy the contracts', (yargs) => {
        return yargs
            .option('project-type', {
                type: 'string',
                enum: ['foundry', 'hardhat'],
                default: 'foundry',
            })
            .option('project-dir', {
                type: 'string',
                description: 'The contracts project directory (ie. Foundry, Hardhat project)',
                default: '.',
            })
            .option('manifest', {
                type: 'string',
                alias: '-m',
                description: 'The manifest.json of previous deployments. The new manifest is written to this file.',
                default: DEFAULT_MANIFEST_FILE,
            })
            .option('config', {
                type: 'string',
                description: 'The path to the .niacinrc.js configuration file.',
                default: DEFAULT_CONFIG_FILE,
            })
            .option('gas-estimator', {
                type: 'string',
                description: 'This configures a custom gas estimator. For Polygon, this uses the Polygon gas station. Options: polygon',
                enum: ['polygon'],
            })
            .option('y', {
                type: 'boolean',
                description: 'Automatically answer yes to all prompts',
                default: false,
            })
            .option('a', {
                type: 'boolean',
                description: 'Deploy all contracts that Niacin finds.',
                default: false,
            })
            // .option('chain', {
            //     type: 'string',
            //     description: 'The chain to deploy to. Options: ethereum, polygon, optimism, arbitrum',
            // })
            // .demandOption(['project-dir', 'manifest'], '')
            .demandOption(['manifest'], '')
    }, deploy)
    .command({
        command: "call", 
        describe: "call a contract", 
        builder: (yargs) => {
            return yargs
            .option('manifest', {
                type: 'string',
                description: 'The manifest.json of previous deployments. The new manifest is written to this file.',
                default: DEFAULT_MANIFEST_FILE,
            })
            .coerce('_', (arg: any) => arg)
            .demandOption(['manifest'], '')
        },
        handler: callContract
    })
    .command('status', 'get the status of a smart contract system', (yargs) => {
        return yargs
            .option('project-dir', {
                type: 'string',
                description: 'The contracts project directory (ie. Foundry, Hardhat project)',
                default: '.',
            })
            .option('manifest', {
                type: 'string',
                description: 'The manifest.json of previous deployments. The new manifest is written to this file.',
                default: DEFAULT_MANIFEST_FILE,
            })
            .demandOption(['manifest'], '')
    }, getStatus)
    .command('add-vendor', 'add a 3rd party contract to the manifest', (yargs: any) => {
        return yargs
            .option('manifest', {
                type: 'string',
                description: 'The path to the manifest.json',
                default: DEFAULT_MANIFEST_FILE,
            })
            .option('name', {
                type: 'string',
                description: 'The name of the contract',
            })
            .option('address', {
                type: 'string',
                description: 'The address of the contract',
            })
            .option('abi', {
                type: 'string',
                description: 'The path to a file containing the JSON ABI of the contract',
            })
            // .option('bytecode', {
            //     type: 'string',
            //     description: 'The path to a file containing the bytecode of the contract',
            // })
            // .option('artifact', {
            //     type: 'string',
            //     description: 'The path to a file containing the build artifact of the contract (ie. from Foundry or Hardhat)',
            // })
            .option('fetch-from-etherscan', {
                type: 'string',
                description: `Fetch the contract's ABI/bytecode from Etherscan, by passing the URL to the contract here. eg. https://optimistic.etherscan.io/token/0x4200000000000000000000000000000000000006`,
            })
            .demandOption(['manifest', 'name'], '')
    }, addVendor)
    .command('generate-sol-interface', 'generate a Solidity file for a vendored contract', (yargs: any) => {
        return yargs
            .option('manifest', {
                type: 'string',
                description: 'The path to the manifest.json',
                default: DEFAULT_MANIFEST_FILE,
            })
            .option('name', {
                type: 'string',
                description: 'The name of the contract',
            })
            .demandOption(['manifest', 'name'], '')
    }, generateSolInterface)
    .command('generate-npm-pkg', 'generate an NPM package from a deployment manifest', (yargs: any) => {
        return yargs
            .option('manifest', {
                type: 'string',
                description: 'The path to the manifest.json',
                default: DEFAULT_MANIFEST_FILE,
            })
            .demandOption(['manifest'], '')
    }, generateNPMPackage)
    .command('init', 'generate an .allerc.js configuration file', (yargs: any) => {
        return yargs
            .option('out', {
                type: 'string',
                description: 'The output path for the .niacinrc.js file',
                default: DEFAULT_CONFIG_FILE,
            })
    }, initializeProject)
    .help()
    .demandCommand()
    .parse()