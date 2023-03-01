// 
// Utilities for interacting with contracts.
// 
import { ethers } from "ethers"

export interface GetContractArgs {
    signer: ethers.Signer
    abi: ethers.utils.Fragment[],
    address: string
}

export const getContract = async (args: GetContractArgs) => {
    const contract = new ethers.Contract(args.address, args.abi, args.signer)
    return contract
}