vercel3 example project
=======================

This project demonstrates using the Vercel3 deployer, which seamlessly deploys and upgrades Solidity smart contracts.

## Setup.

### Installing the CLI.

```sh
npm i -G aller-cli
```

### Initializing the project.

```sh
# creates an .allerrc.js
aller init
```

### Using the Aller contracts.

Install the contracts:

```sh
npm i aller-contracts
echo "@aller=./node_modules/aller-contracts/src/" >> remappings.txt
```

To use Aller, each contract must be wrapped in the `MixinResolver`, which provides the address resolution capabilities. **Currently, we do not support deploying contracts with constructor args - this design is in iteration**. Here's an example:

```sol
import "@aller/lib/MixinResolver.sol";

contract TakeMarket is 
    MixinResolver 
{
    // Initialize the resolver.
    constructor(address _resolver) MixinResolver(_resolver) {
    }

    // Define your dependencies.
    function resolverAddressesRequired() public override pure returns (bytes32[] memory addresses) {
        bytes32[] memory requiredAddresses = new bytes32[](2);
        requiredAddresses[0] = bytes32("TakeMarketShares");
        requiredAddresses[1] = bytes32("TakeMarket");
        return requiredAddresses;
    }

    // Get your dependencies.
    function takeMarketShares() internal view returns (address) {
        return requireAndGetAddress(bytes32("TakeMarketShares"));
    }
```

### Deploying the project.

```sh
# Runs the `aller` CLI.
# Read package.json for more.
npm run deploy
```

### Generating an NPM package from the contracts.

This generates an `index.js` containing the contract info, for your frontends/subgraphs:

```sh
aller generate-npm-pkg --manifest-path ./manifest.json --out index.js
```

To explore it, run this in a `node` shell:

```js
> require('./index').TakeMarketShares.abi
> require('./index').TakeMarketShares.address
> require('./index').TakeMarketShares.deployBlock
```



## Setup for local hacking of `aller`.

### Installing the CLI.

```sh
cd ../cli
npm link
```

### Initializing the project.

```sh
# creates an .allerrc.js
aller init
```

### Using the Aller contracts.

Install the contracts:

```sh
npm run sync-contracts
echo "@aller=./node_modules/aller-contracts/src/" >> remappings.txt
```
