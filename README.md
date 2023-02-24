# /

Continuous deployment for Solidity.

 * Zero config. All contracts are deployed with upgradeability built-in. Built-in dependency injection for contracts.
 * Instant tracking of deployment artifacts in the `manifest.json`.
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

 1. Install the `aller` contracts into your Forge project - 
 
 ```sh
 cp -R contracts/ your-foundry-project/lib/aller
 echo "@aller=./lib/aller/src/" >> remappings.txt
 ```

 2. Install the `aller` command -
 
 ```sh
 cd cli
 npm install
 npm link
 ```
 
 3. Deploy to localhost. 
 
 ```sh
 # You can set ETH_RPC_URL and PRIVATE_KEY as environment variables.
 # If they are unset, aller assumes local deployment and loads the default Hardhat/Founry private key for you.
 aller deploy --project-dir . --project-type foundry --manifest ./manifest.json
 ```

**NOTE**: contracts must inherit the address resolver mixin as follows:

```
import "@aller/lib/MixinResolver.sol";

contract TakeMarket is 
    MixinResolver 
{
	uint public a = 2;

    constructor(address _resolver) MixinResolver(_resolver) {
    }
```