
import { Account, Address } from '@ethereumjs/util'


import { defaultAbiCoder as AbiCoder, Interface } from '@ethersproject/abi'
// import { Address, bytesToHex, hexToBytes } from '@ethereumjs/util'

// import { LegacyTransaction } from '@ethereumjs/tx'
import { VM } from '@ethereumjs/vm'
// import { buildTransaction, encodeDeployment, encodeFunction } from './helpers/tx-builder.cjs'
// import { getAccountNonce, insertAccount } from './helpers/account-utils.cjs'
import { Block } from '@ethereumjs/block'
import { Blockchain } from '@ethereumjs/blockchain'
import { Chain, Common, Hardfork } from '@ethereumjs/common'
import { EVM } from '@ethereumjs/evm'
import { AccessListEIP2930TxData, FeeMarketEIP1559TxData, Transaction, TxData } from '@ethereumjs/tx'
import { ethers } from 'ethers'


export const keyPair = {
    secretKey: '0x3cd7232cd6f3fc66a57a6bedc1a8ed6c228fff0a327e169c2bcc5e869ed49511',
    publicKey:
        '0x0406cc661590d48ee972944b35ad13ff03c7876eae3fd191e8a2f77311b0a3c6613407b5005e63d7d8d76b89d5f900cde691497688bb281e07a5052ff61edebdc0',
}

export const insertAccount = async (vm: VM, address: Address) => {
    const acctData = {
        nonce: 0,
        balance: BigInt(10) ** BigInt(18), // 1 eth
    }
    const account = Account.fromAccountData(acctData)

    await vm.stateManager.putAccount(address, account)
}

export const getAccountNonce = async (vm: VM, accountPrivateKey: Uint8Array) => {
    const address = Address.fromPrivateKey(accountPrivateKey as any)
    const account = await vm.stateManager.getAccount(address)
    if (account) {
        return account.nonce
    } else {
        return BigInt(0)
    }
}



export const encodeDeployment = (
    bytecode: string,
    params?: {
        types: any[]
        values: unknown[]
    }
) => {
    const deploymentData = bytecode
    if (params) {
        const argumentsEncoded = AbiCoder.encode(params.types, params.values)
        return deploymentData + argumentsEncoded.slice(2)
    }
    return deploymentData
}

type TransactionsData = TxData | AccessListEIP2930TxData | FeeMarketEIP1559TxData

export const buildTransaction = (data: Partial<TransactionsData>): TransactionsData => {
    const defaultData: Partial<TransactionsData> = {
        nonce: BigInt(0),
        gasLimit: 20_000_000,
        gasPrice: 7,
        value: 0,
        data: '0x',
    }

    return {
        ...defaultData,
        ...data,
    }
}


async function deployContract(
    vm: VM,
    senderPrivateKey: Buffer,
    deploymentBytecode: string
): Promise<Address> {
    // Contracts are deployed by sending their deployment bytecode to the address 0
    // The contract params should be abi-encoded and appended to the deployment bytecode.

    const data = encodeDeployment(deploymentBytecode, {
        types: [],
        values: [],
    })
    const txData = {
        data,
        nonce: await getAccountNonce(vm, senderPrivateKey),
    }

    const tx = Transaction.fromTxData(buildTransaction(txData), { common }).sign(
        senderPrivateKey
    )

    const deploymentResult = await vm.runTx({ tx })

    if (deploymentResult.execResult.exceptionError) {
        throw deploymentResult.execResult.exceptionError
    }

    return deploymentResult.createdAddress!
}


const common = new Common({ chain: Chain.Mainnet, hardfork: Hardfork.London })

// Load all contracts and their dependencies to construct a dependency graph.
// We run a local EVM to deploy them and get their dependencies.
// Note that this is a pure function so it will never revert.
export async function computeDependencies(targets: any[]) {
    const accountPk = Buffer.from('e331b6d69882b4cb4ea581d88e0b604039a3de5967688d3dcffdd2270c0fd109', 'hex')
    const vm = await VM.create({ common })
    const accountAddress = Address.fromPrivateKey(accountPk)
    console.log('Account: ', accountAddress.toString())
    await insertAccount(vm, accountAddress)

    let dependencies: Record<string, string[]> = {}

    for (let target of targets) {
        // construct deploy tx
        let i = new ethers.ContractFactory(target.abi, target.bytecode.object)
        const deployTx = i.getDeployTransaction()
        const buf = Buffer.from(deployTx.data.toString().slice(2), 'hex')
        // run deploy
        const contractAddress = await deployContract(vm, accountPk, target.bytecode.object)
        console.log(contractAddress)
        // now call getDependencies
        const iface = new Interface(target.abi)
        // console.log(iface.functions)
        if(!iface.functions['getDependencies()']) {
            console.log('No getDependencies function')
            continue
        }
        const res = await vm.evm.runCall({
            caller: accountAddress,
            origin: accountAddress,
            to: contractAddress,
            data: Buffer.from(iface.encodeFunctionData('getDependencies').slice(2), 'hex'),
        })
        const retdata = res.execResult.returnValue
        const deps = iface.decodeFunctionResult('getDependencies', retdata)[0]
        const depsStrings = deps.map((bytes32Name: string) => ethers.utils.parseBytes32String(bytes32Name))
        dependencies[target.contractName] = depsStrings
    }

    return dependencies
}