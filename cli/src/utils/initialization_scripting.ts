// 
// The scripting environment for the initialization script.
// 
import chalk from "chalk"
import { ethers } from "ethers"
import { logTx } from "."
import { AllerScriptInitializeArgs, AllerScriptRunStepArgs, Deployment, EthersContractMod, InitializeContractEvent, Targets, AllerScriptRuntime } from "../types"
import { DeploymentManager } from "./deployment"
import { GasEstimator } from "./gas"

export class AllerScriptEnvironment implements AllerScriptRuntime {
    constructor(
        private deploymentManager: DeploymentManager,
        private gasEstimator: GasEstimator,

        // TODO refactor.
        // These are the latest deployment details.
        private _deployments: Deployment[],
        
        // Public API.
        public targets: Targets,
        public contracts: Record<string, EthersContractMod>,
    ) {
    }

    static create(
        deploymentManager: DeploymentManager,
        gasEstimator: GasEstimator,
        _deployments: Deployment[],
        targets: Targets,
        signer: ethers.Signer,
    ) {
        const contracts = getContracts(targets, signer)
        return new AllerScriptEnvironment(deploymentManager, gasEstimator, _deployments, targets, contracts)
    }

    // Initialize a smart contract.
    async initialize(args: AllerScriptInitializeArgs) {
        // When do we need to initialize a contract?
        // 1. When a new implementation is deployed.
        // 2. When the initializer arguments change (JS).
        // 3. When the initializer function changes (Solidity).
        // Thankfully, (3) results in new bytecode, which is covered by (1).

        // Get the target from the contract.
        const info = this.targets.user[args.contract._name]

        // Determine if this contract version has been initialized before.
        const initializeContractEvent = this._deployments
            .map(d => d.events)
            .flat()
            .filter(event => event.type == 'initialize_contract')
            .reverse() // get the last item
            .find((event: InitializeContractEvent) => event.target == info.target && event.version == info.version) as InitializeContractEvent

        // Determine if the initializer arguments are the same.
        const contract = args.contract
        const gasParams = await this.gasEstimator()
        const tx = await contract.populateTransaction.initialize(...args.args, gasParams)
        const calldata = tx.data

        // console.debug(
        //     deployImplEvent,
        //     initializeContractEvent,
        //     initializeContractEvent.calldata,
        //     calldata
        // )

        const initialized =
            initializeContractEvent != null &&
            initializeContractEvent.calldata == calldata;

        
        logStep(`${contract._name}` + `.initialize(${stringifyParams(args.args)})`)
        // logStep(chalk.yellow(`${contract._name}.initialize(${stringifyParams(args.args)})`))

        if (!initialized) {
            console.log(chalk.yellow('Initializing...'))
            const tx = await contract.initialize(...args.args, gasParams)
            logTx(tx)
            await tx.wait(1)

            const event: InitializeContractEvent = {
                type: 'initialize_contract',
                target: info.target,
                version: info.version,
                calldata,
                tx: tx.hash,
            }
            this.deploymentManager.addEvent(event)
        } else {
            console.log(chalk.gray('Skipped.'))
            // logStep(chalk.gray(`${contract._name}.initialize(${stringifyParams(args.args)})`), true)
        }
        console.log()
    }

    // Perform a write action on a smart contract, if the read value is a stale one.
    async runStep(args: AllerScriptRunStepArgs) {
        const gasParams = await this.gasEstimator()
        const contract = args.contract

        // Log the step.
        logStep(stringifyCall(contract, args.write, args.writeArgs))

        // Determine if we need to perform the write.
        let fresh = false
        if (args.read) {
            // callStatic for safety.
            const value = await contract.callStatic[args.read](...args.readArgs)
            const stale = await args.stale(value)
            fresh = !stale
        }

        if (!fresh) {
            console.log(chalk.yellow('Updating...'))
            // logStep(chalk.yellow(stringifyCall(contract, args.write, args.writeArgs)))
            const fn = contract[args.write]
            if (!fn) {
                throw new Error(`No method ${args.write} found on contract ${contract._name}`)
            }
            const tx = await fn(...args.writeArgs, gasParams)
            logTx(tx)
            await tx.wait(1)
        } else {
            // logStep(chalk.gray(`${chalk.gray(stringifyCall(contract, args.write, args.writeArgs))} (skipped)`), true)
            // logStep(chalk.gray(``), true)
            console.log(chalk.gray(`Skipped.`))
        }

        console.log()
    }
}


interface ContractsEnvironment {
    [targetName: string]: EthersContractMod
}

// Gets a set of contracts we can interact with, from the targets.
// Consumers of the script environment can use this to read from the contracts, in a typesafe manner.
const getContracts = (targets: Targets, signer: ethers.Signer): ContractsEnvironment => {
    // Each contract in this list uses the proxy's address, and the target's ABI.
    const contracts = Object.keys(targets.user)
        .map(target => {
            const proxy = targets.system[`Proxy${target}`]
            if (!proxy) {
                throw new Error(`No proxy found for ${target}`)
            }
            if (!proxy.address) {
                throw new Error(`No address found for proxy ${target}`)
            }

            const abi = targets.user[target].abi
            const address = proxy.address
            const contract = new ethers.Contract(address, abi, signer) as EthersContractMod
            contract._name = target

            return contract
        })
        .reduce((acc, contract) => {
            acc[contract._name] = contract
            return acc
        }, {} as Record<string, EthersContractMod>)
    
    return contracts
}


// 
// Logging utilities.
// 

const stringifyParams = (params: any[]) => params.map(p => JSON.stringify(p)).join(', ')

// TakeMarket.getOrCreateTakeSharesContract("3")
const stringifyCall = (contract: EthersContractMod, method: string, params: any[]) => `${contract._name}.${method}(${stringifyParams(params)})`

let stepCounter = 1
function logStep(str: any, skipped = false) {
    let color = skipped ? chalk.gray : (str: string) => str
    // console.log(color(`(${stepCounter})`), str)
    console.log(str)
    stepCounter++
}





