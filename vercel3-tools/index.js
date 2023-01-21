module.exports = {
    "TakeMarket": {
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
        "address": "0x3fdc08D815cc4ED3B7F69Ee246716f2C8bCD6b07",
        "deployBlock": 297
    },
    "TakeMarketShares": {
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
                "inputs": [
                    {
                        "internalType": "address",
                        "name": "__factory",
                        "type": "address"
                    }
                ],
                "name": "instantiate",
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
        "address": "0x70E5370b8981Abc6e14C91F4AcE823954EFC8eA3",
        "deployBlock": 300
    },
    "SystemStatus": {
        "abi": [
            {
                "inputs": [
                    {
                        "internalType": "address",
                        "name": "_owner",
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
                        "internalType": "address",
                        "name": "oldOwner",
                        "type": "address"
                    },
                    {
                        "indexed": false,
                        "internalType": "address",
                        "name": "newOwner",
                        "type": "address"
                    }
                ],
                "name": "OwnerChanged",
                "type": "event"
            },
            {
                "anonymous": false,
                "inputs": [
                    {
                        "indexed": false,
                        "internalType": "address",
                        "name": "newOwner",
                        "type": "address"
                    }
                ],
                "name": "OwnerNominated",
                "type": "event"
            },
            {
                "anonymous": false,
                "inputs": [],
                "name": "Resumed",
                "type": "event"
            },
            {
                "anonymous": false,
                "inputs": [],
                "name": "Suspended",
                "type": "event"
            },
            {
                "anonymous": false,
                "inputs": [],
                "name": "UpgradeEnded",
                "type": "event"
            },
            {
                "anonymous": false,
                "inputs": [],
                "name": "UpgradeStarted",
                "type": "event"
            },
            {
                "inputs": [],
                "name": "assertGood",
                "outputs": [],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [],
                "name": "beginUpgrade",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "inputs": [],
                "name": "endUpgrade",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "inputs": [],
                "name": "owner",
                "outputs": [
                    {
                        "internalType": "address",
                        "name": "",
                        "type": "address"
                    }
                ],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [],
                "name": "resume",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "inputs": [],
                "name": "suspend",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            }
        ],
        "address": "0x9c65f85425c619A6cB6D29fF8d57ef696323d188",
        "deployBlock": 303
    },
    "AddressResolver": {
        "abi": [
            {
                "inputs": [
                    {
                        "internalType": "address",
                        "name": "_owner",
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
                "name": "AddressImported",
                "type": "event"
            },
            {
                "anonymous": false,
                "inputs": [
                    {
                        "indexed": false,
                        "internalType": "address",
                        "name": "oldOwner",
                        "type": "address"
                    },
                    {
                        "indexed": false,
                        "internalType": "address",
                        "name": "newOwner",
                        "type": "address"
                    }
                ],
                "name": "OwnerChanged",
                "type": "event"
            },
            {
                "anonymous": false,
                "inputs": [
                    {
                        "indexed": false,
                        "internalType": "address",
                        "name": "newOwner",
                        "type": "address"
                    }
                ],
                "name": "OwnerNominated",
                "type": "event"
            },
            {
                "inputs": [
                    {
                        "internalType": "bytes32[]",
                        "name": "names",
                        "type": "bytes32[]"
                    },
                    {
                        "internalType": "address[]",
                        "name": "destinations",
                        "type": "address[]"
                    }
                ],
                "name": "areAddressesImported",
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
                "inputs": [
                    {
                        "internalType": "bytes32",
                        "name": "name",
                        "type": "bytes32"
                    }
                ],
                "name": "getAddress",
                "outputs": [
                    {
                        "internalType": "address",
                        "name": "",
                        "type": "address"
                    }
                ],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [
                    {
                        "internalType": "bytes32[]",
                        "name": "names",
                        "type": "bytes32[]"
                    },
                    {
                        "internalType": "address[]",
                        "name": "destinations",
                        "type": "address[]"
                    }
                ],
                "name": "importAddresses",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "inputs": [],
                "name": "owner",
                "outputs": [
                    {
                        "internalType": "address",
                        "name": "",
                        "type": "address"
                    }
                ],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [
                    {
                        "internalType": "contract IMixinResolver[]",
                        "name": "destinations",
                        "type": "address[]"
                    }
                ],
                "name": "rebuildCaches",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "inputs": [
                    {
                        "internalType": "bytes32",
                        "name": "",
                        "type": "bytes32"
                    }
                ],
                "name": "repository",
                "outputs": [
                    {
                        "internalType": "address",
                        "name": "",
                        "type": "address"
                    }
                ],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [
                    {
                        "internalType": "bytes32",
                        "name": "name",
                        "type": "bytes32"
                    },
                    {
                        "internalType": "string",
                        "name": "reason",
                        "type": "string"
                    }
                ],
                "name": "requireAndGetAddress",
                "outputs": [
                    {
                        "internalType": "address",
                        "name": "",
                        "type": "address"
                    }
                ],
                "stateMutability": "view",
                "type": "function"
            }
        ],
        "address": "0x1E3b98102e19D3a164d239BdD190913C2F02E756",
        "deployBlock": 295
    }
}