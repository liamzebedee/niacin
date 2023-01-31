module.exports = {
    "TakeMarketShares": {
        "version": 2,
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
                "stateMutability": "view",
                "type": "function"
            }
        ],
        "address": "0x4A65b9d13908487A1654be48e6aa9Bc701735910",
        "deployBlock": 863
    },
    "TakeMarket": {
        "version": 7,
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
        "address": "0x4BEA9aAe24187d6128403DC556510A18d727871a",
        "deployBlock": 876
    }
}