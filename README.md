# niacin.

*it's time to deploy*.

Niacin is a tool for smart contract deployment, aka chain ops.

 * a standard deployment format - addresses, ABI's, deploy metadata.
 * `delegatecall` proxies for upgradeable contracts, that are implemented safely and securely.
 * onchain dependency linking with `MixinResolver`, with a resolution cache (much cheaper than a beacon).
 * centralized address registry in the `AddressProvider`.
 * a drop-in CLI for upgradeable contracts - just `niacin deploy xyz`.
 * simple ergonomic patterns:
   * zero-config upgradeable contracts
   * zero-config dependency injection
   * migration scripts that only run if values change
   * one file with all your deployment info
 * useful tools:
   * vendoring - one command to import contracts from Etherscan, and generate *.sol types for them.
   * NPM package generator - generate an NPM package for your subgraphs and frontends.
   * deployment docs generator - generate a website for your deployments, including an interactive UI.
 * well-designed:
   * automatically keeps track of git metadata, so you can revert easily
   * automatically tracks the deploy block, so you don't have to copy-paste that into the subgraph

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