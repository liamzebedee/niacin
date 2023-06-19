// 
// Custom logic for gas estimation, so deployments are fast.
// 
import { ethers } from "ethers"
import { multiplyGwei } from "."

export interface GasEstimator {
    (): Promise<{ maxFeePerGas?: ethers.BigNumber, maxPriorityFeePerGas?: ethers.BigNumber }>
}

// ethers.js gas estimation for Polygon does not work.
// Custom gas estimation is required.
export const polygonGasEstimator: GasEstimator = async () => {
    const feeData = await (await fetch(`https://gasstation.polygon.technology/v2`)).json()

    const { safeLow, standard, fast, estimatedBaseFee } = feeData
    const config = fast

    let maxFeePerGas = ethers.utils.parseUnits(config.maxFee.toString().split('.')[0], "gwei")
    let maxPriorityFeePerGas = ethers.utils.parseUnits(config.maxPriorityFee.toString().split('.')[0], "gwei")

    let { PRIORITY_FEE_MULT } = process.env
    let priorityFeeMultiplier = PRIORITY_FEE_MULT ? parseFloat(PRIORITY_FEE_MULT) : 3

    maxFeePerGas = multiplyGwei(maxFeePerGas, priorityFeeMultiplier * 1.1)
    maxPriorityFeePerGas = multiplyGwei(maxPriorityFeePerGas, priorityFeeMultiplier)

    return {
        maxFeePerGas,
        maxPriorityFeePerGas
    }
}

const defaultGasEstimator = (provider: ethers.providers.Provider): GasEstimator => async () => {
    let {
        maxFeePerGas,
        maxPriorityFeePerGas
    } = await provider.getFeeData()

    if (!maxFeePerGas) {
        // Not EIP-1559 Type 2 tx.
        return {}
    }

    // https://hackmd.io/@tvanepps/1559-wallets
    maxFeePerGas = multiplyGwei(maxFeePerGas, 2)
    maxPriorityFeePerGas = multiplyGwei(maxPriorityFeePerGas, 2)

    return {
        maxFeePerGas,
        maxPriorityFeePerGas
    }
}

export const gasEstimators = {
    'polygon': polygonGasEstimator
}

export const getGasEstimator = async (name: string, provider: ethers.providers.Provider) => {
    let estimator

    if (name == 'default') {
        estimator = await defaultGasEstimator(provider)
    } else {
        // @ts-ignore
        estimator = gasEstimators[name]
    }

    if (!estimator) {
        throw new Error(`No gas estimator found for name ${name}`)
    }

    return estimator
}