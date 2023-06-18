vercel3 example project
=======================

This project demonstrates using the Vercel3 deployer, which seamlessly deploys and upgrades Solidity smart contracts.

## Setup.

### Installing the CLI.

```sh
npm i -G niacin-cli
```

### Initializing the project.

```sh
# creates an .niacinrc.js
niacin init
```

### Using the niacin contracts.

Install the contracts:

```sh
npm i niacin-contracts
echo "@niacin=./node_modules/niacin-contracts/src/" >> remappings.txt
```

To use niacin, each contract must be wrapped in the `MixinResolver`, which provides the address resolution capabilities. **Currently, we do not support deploying contracts with constructor args - this design is in iteration**. Here's an example:

```sol
import "@niacin/lib/MixinResolver.sol";

contract TakeMarket is 
    MixinResolver
{
    // Define your dependencies.
    function getDependencies() public override pure returns (bytes32[] memory addresses) {
        bytes32[] memory requiredAddresses = new bytes32[](2);
        requiredAddresses[0] = bytes32("TakeMarketShares");
        requiredAddresses[1] = bytes32("TakeMarket");
        return requiredAddresses;
    }

    // Get your dependencies.
    function takeMarketShares() internal view returns (address) {
        return requireAddress(bytes32("TakeMarketShares"));
    }
```

### Deploying the project.

```sh
# start an anvil node.
anvil

# deploy
niacin deploy --project-dir . --project-type foundry -y
```

### Generating an NPM package from the contracts.

This generates an `index.js` containing the contract info, for your frontends/subgraphs:

```sh
niacin generate-npm-pkg --manifest-path ./manifest.json --out index.js
```

To explore it, run this in a `node` shell:

```js
> require('./index').TakeMarketShares.abi
> require('./index').TakeMarketShares.address
> require('./index').TakeMarketShares.deployBlock
```



## Setup for local hacking of `niacin`.

### Installing the CLI.

```sh
cd ../cli
npm link
```

### Initializing the project.

```sh
# creates an .niacinrc.js
niacin init
```

### Using the niacin contracts.

Install the contracts:

```sh
npm run sync-contracts
echo "@niacin=./node_modules/niacin-contracts/src/" >> remappings.txt
```
