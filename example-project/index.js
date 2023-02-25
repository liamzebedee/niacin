module.exports = {
    "TakeMarket": {
        "version": 1,
        "abi": [
            {
                "inputs": [
                    {
                        "internalType": "address",
                        "name": "_resolver",
                        "type": "address"
                    }
                ],
                "stateMutability": "nonpayable",
                "type": "constructor"
            },
            {
                "anonymous": false,
                "inputs": [
                    {
                        "indexed": false,
                        "internalType": "bytes32",
                        "name": "name",
                        "type": "bytes32"
                    },
                    {
                        "indexed": false,
                        "internalType": "address",
                        "name": "destination",
                        "type": "address"
                    }
                ],
                "name": "CacheUpdated",
                "type": "event"
            },
            {
                "inputs": [],
                "name": "a",
                "outputs": [
                    {
                        "internalType": "uint256",
                        "name": "",
                        "type": "uint256"
                    }
                ],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [
                    {
                        "internalType": "uint256",
                        "name": "takeId",
                        "type": "uint256"
                    }
                ],
                "name": "getOrCreateTakeSharesContract",
                "outputs": [
                    {
                        "internalType": "contract TakeMarketShares",
                        "name": "",
                        "type": "address"
                    }
                ],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "inputs": [],
                "name": "isResolverCached",
                "outputs": [
                    {
                        "internalType": "bool",
                        "name": "",
                        "type": "bool"
                    }
                ],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [],
                "name": "rebuildCache",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "inputs": [],
                "name": "resolver",
                "outputs": [
                    {
                        "internalType": "contract AddressResolver",
                        "name": "",
                        "type": "address"
                    }
                ],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [],
                "name": "resolverAddressesRequired",
                "outputs": [
                    {
                        "internalType": "bytes32[]",
                        "name": "addresses",
                        "type": "bytes32[]"
                    }
                ],
                "stateMutability": "pure",
                "type": "function"
            }
        ],
        "address": "0xa98b9f2D8426DF201F4732947635C52841b04a25",
        "deployBlock": 1247
    },
    "TakeMarketShares": {
        "version": 1,
        "abi": [
            {
                "inputs": [
                    {
                        "internalType": "address",
                        "name": "_resolver",
                        "type": "address"
                    }
                ],
                "stateMutability": "nonpayable",
                "type": "constructor"
            },
            {
                "inputs": [
                    {
                        "internalType": "address",
                        "name": "__factory",
                        "type": "address"
                    }
                ],
                "name": "configureInstance",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "inputs": [],
                "name": "id",
                "outputs": [
                    {
                        "internalType": "uint256",
                        "name": "",
                        "type": "uint256"
                    }
                ],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [
                    {
                        "internalType": "address",
                        "name": "_resolver",
                        "type": "address"
                    },
                    {
                        "internalType": "uint256",
                        "name": "_id",
                        "type": "uint256"
                    }
                ],
                "name": "initialize",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "inputs": [],
                "name": "isResolverCached",
                "outputs": [
                    {
                        "internalType": "bool",
                        "name": "",
                        "type": "bool"
                    }
                ],
                "stateMutability": "pure",
                "type": "function"
            },
            {
                "inputs": [],
                "name": "rebuildCache",
                "outputs": [],
                "stateMutability": "pure",
                "type": "function"
            },
            {
                "inputs": [],
                "name": "resolver",
                "outputs": [
                    {
                        "internalType": "contract AddressResolver",
                        "name": "",
                        "type": "address"
                    }
                ],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [],
                "name": "resolverAddressesRequired",
                "outputs": [
                    {
                        "internalType": "bytes32[]",
                        "name": "addresses",
                        "type": "bytes32[]"
                    }
                ],
                "stateMutability": "view",
                "type": "function"
            }
        ],
        "address": "0xe6cFc17053c64838Fd7bb55BD4A2cb5b207A71ed",
        "deployBlock": 1250
    }
}