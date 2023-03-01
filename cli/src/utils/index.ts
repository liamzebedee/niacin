// 
// General utility functions.
// 
import chalk from "chalk";
import { ethers } from "ethers";
const prompts = require('prompt-sync')({ sigint: true });

export function multiplyGwei(gweiBN: ethers.BigNumber, amount: number) {
    // Convert to wei.
    const weiDecimalPlaces = 9;
    let wei = ethers.utils.parseUnits(gweiBN.toString(), weiDecimalPlaces);

    wei = wei.mul(ethers.utils.parseEther(amount.toString()))
    wei = wei.div(ethers.utils.parseUnits('1', 18))

    const gwei = wei.div(ethers.utils.parseUnits('1', 9))
    return gwei
}

export const promptConfirmation = (msg: string, yes: boolean): boolean => {
    if (yes) {
        console.log(`${msg} [y/N]: y`)
        return true
    } else {
        const answer = prompts(`${msg} [y/N]: `)
        return answer == "y"
    }
}

export const logTx = (tx: ethers.Transaction) => {
    console.debug(chalk.gray(`tx: ${tx.hash}`))
}