import chalk from "chalk"
import { ethers } from "ethers"

export async function getRpc(rpcUrl: string, privateKey: string, projectType: string) {
    // Build the signer, provider, system contracts.
    if (!rpcUrl) {
        // console.log(chalk.gray(`No RPC_URL provided. Using default for project type: ${projectType}`))
        if (projectType == 'foundry' || projectType == 'hardhat') {
            rpcUrl = 'http://localhost:8545'
        } else {
            throw new Error("No RPC_URL provided.")
        }
    }

    if (!privateKey) {
        // console.log(chalk.gray(`No PRIVATE_KEY provided. Using default for project type: ${projectType}`))
        if (projectType == 'foundry' || projectType == 'hardhat') {
            privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
        } else {
            throw new Error("No PRIVATE_KEY provided.")
        }
    }

    // console.log()
    // console.log(chalk.gray('RPC URL:'), chalk.green(rpcUrl))
    // TODO: code smell
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl)
    const signer = new ethers.Wallet(privateKey, provider)
    const account = signer.address
    const chainId = String(await(await provider.getNetwork()).chainId)
    // console.log(chalk.gray(`Deploying from account:`), `${account}`)
    // console.log()

    return {
        provider,
        signer,
        account,
        chainId,
    }
}