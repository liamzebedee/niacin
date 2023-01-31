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

 1. Install the `vercel3-contracts` into your Forge project - 
 
 ```sh
 forge install liamzebedee/vercel3-pipeline
 echo "@vercel3=./lib/vercel3-pipeline/contracts/src/" >> remappings.txt
 ```

 2. Install the vercel3 deployer command -
 
 ```sh
 npm i -G vercel3-deploy
 ```

 3. Deploy. 
 
 ```sh
 vercel3-deploy --project-dir . --project-type foundry --input-manifest ./.vercel3/deployments/localhost/manifest.json
 ```

