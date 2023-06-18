# niacin.

*it's time to deploy*.

Niacin is a tool for smart contract deployment, aka chain ops.

 * Zero config. All contracts are deployed with upgradeability built-in. Built-in dependency injection for contracts. Tracks Git metadata.
 * Instant tracking of deployment artifacts in the `manifest.json`.
 * Manage multichain deployments easily.
 * Automatically generate website for deployment details, with built-in contract interaction.
 * Automatically generate a JS module containing deployment info/abi's, for use in frontends/subgraphs.

[![asciicast](https://asciinema.org/a/555957.svg)](https://asciinema.org/a/555957)

## Layout.

```sh
cli/                               # Deployer CLI tooling.
example-project/                   # An example project using the deployer.
contracts/                         # Contracts for continuous deployment.
docs/                              # Documentation on the deployer.
```

## Tutorial (WIP).

**DO NOT USE THIS IN PRODUCTION, STILL HEAVILY INDEV AND ALPHA CODE**

Steps:

 1. Install the `niacin` contracts into your Forge project - 
 
 ```sh
 cp -R contracts/ your-foundry-project/lib/niacin
 echo "@niacin=./lib/niacin/src/" >> remappings.txt
 ```

 2. Install the `niacin` command -
 
 ```sh
 cd cli
 npm install
 npm link
 ```
 
 3. Deploy to localhost. 
 
 ```sh
 # You can set ETH_RPC_URL and PRIVATE_KEY as environment variables.
 # If they are unset, niacin assumes local deployment and loads the default Hardhat/Founry private key for you.
 niacin deploy --project-dir . --project-type foundry --manifest ./manifest.json
 ```

**NOTE**: contracts must inherit the address resolver mixin as follows:

```
import "@niacin/lib/MixinResolver.sol";

contract TakeMarket is 
    MixinResolver 
{
	uint public a = 2;

    constructor() {
    }
```