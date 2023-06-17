module.exports = {
    "TakeMarket": {
        "version": 1,
        "abi": [
            {
                "inputs": [],
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
                "inputs": [],
                "name": "getDependencies",
                "outputs": [
                    {
                        "internalType": "bytes32[]",
                        "name": "addresses",
                        "type": "bytes32[]"
                    }
                ],
                "stateMutability": "pure",
                "type": "function"
            },
            {
                "inputs": [],
                "name": "getMessage",
                "outputs": [
                    {
                        "internalType": "string",
                        "name": "",
                        "type": "string"
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
                        "internalType": "contract ITakeMarketShares",
                        "name": "",
                        "type": "address"
                    }
                ],
                "stateMutability": "nonpayable",
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
                "name": "getTakeSharesContract",
                "outputs": [
                    {
                        "internalType": "contract ITakeMarketShares",
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
                        "internalType": "uint256",
                        "name": "_a",
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
                "name": "isAddressCacheFresh",
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
                "name": "rebuildAddressCache",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "inputs": [
                    {
                        "internalType": "string",
                        "name": "message",
                        "type": "string"
                    }
                ],
                "name": "setHello",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            }
        ],
        "address": "0x53bE928dECDBBAbe3bbeC80272f4d00ca0691BB4"
    },
    "TakeMarketShares": {
        "version": 1,
        "abi": [
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
                "name": "getDependencies",
                "outputs": [
                    {
                        "internalType": "bytes32[]",
                        "name": "addresses",
                        "type": "bytes32[]"
                    }
                ],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [],
                "name": "isAddressCacheFresh",
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
                "name": "rebuildAddressCache",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            }
        ],
        "address": "0xdC558a88977D15F398Faa6C84b6740EF2BFC7108"
    }
}