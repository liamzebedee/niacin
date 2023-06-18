vercel3-tools
=============

This repo contains the CLI tooling necessary to enable vercel3:

 * **deployer**.
 * **generate-npm-package**. Autogenerate an `index.js` with your contract deployments, usable in Next.js and the wider JS ecosystem.

Inspirations: Synthetix v2 deployer, Synthetix v3 Store pattern, tBTC Factories

## Deployer.

The deployer is designed to remove the hassle of smart contract deployments. _Works natively with Foundry_.

**Zero-config setup**. Deployer scans your `src/` for `*.sol`, and automatically deploys your contracts. Contracts contained in directories starting with `lib/` or `interfaces/` are ignored.

**Seamless upgrades**. Each contract automatically deployed behind an upgradeable Proxy, which uses `delegatecall`. So you can code and hit deploy, and everything happens seamlessly.

**Dependency injection for contracts**. No more manually pasting addresses, you can use the `MixinResolver` in order to resolve dependencies to other contracts in your codebase. It is smart and caches entries, meaning no extra `CALL`'s like a Beacon.

**Simple migration scripting**. niacin supports an initialize script, written in JS/TS. You can initialize your smart contracts from JS, and apply new settings. It has intelligent helpers, meaning it will only call `setFeeRate` if your fee rate has changed. See [`example-project/deploy/initialize.js`](../example-project/deploy/initialize.js) for an example.

**Deployment data for your Dapp/Subgraph**. Generate an ultra-lightweight `index.js` from your deployment manifest.json, containing the addresses, ABI's, and deployment tx and block number (useful for The Graph).

**All the logs you wanted**. Git metadata (branch, commit) is recorded for each deployment, so you can easily checkout the old source code. Deployer records the RPC and chain ID for each deployment - and checks if you're deploying to the network you intended!

**Helpful features for developers**. Deployer automatically detects if you're deploying to Hardhat/Foundry, and imports the default private keys for these projects. No configuration necessary.

**Factories made easy**. Building contracts that deploy other contracts is easy, but upgrading them is hard. This is sometimes called a Factory, where the factory clones a template contract, often 100's of times. We implement a pattern where you can upgrade all 100's of these templates in one tx. A simple `initialize` function for your parameters, and you can still use dependency injection to lookup your contracts dynamically without passing around extra data.

**Built from reputable code**. The smart contracts are derived from the Synthetix v2 deployer, OpenZeppelin clone helpers, and the tBTC Factories.

### Usage.

```sh
npm i
# install `niacin` binary
npm link

niacin deploy --project-dir . --project-type foundry --manifest ./manifest-polygon2.json --gas-estimator polygon
```

### Example.

```sh
(base) ➜  example-project git:(main) niacin deploy --project-dir . --project-type foundry --manifest ./manifest-poly.json -y
Creating new empty manifest...
Loading configuration: /Users/liamz/Documents/Projects/vercel3/example-project/.niacinrc.js
Loaded .niacinrc.js
Using gas estimator: default

(1) Build
Project directory: /Users/liamz/Documents/Projects/vercel3/example-project
Project type: foundry

> forge build
No files changed, compilation skipped

Git repository detected.
Recording version control information:
  branch = main
  commit = b2fc46fa9a204ddd58aab25671fbc4a8af50463a
  dirty = false


(2) Deploy
No RPC URL provided. Using default for project type: foundry
No PRIVATE KEY provided. Using default for project type: foundry

RPC URL: http://localhost:8545
Deploying from account: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

╔══════════════════════════╤═════════╤════════╤════════╤═══════════════╗
║ Contract                 │ Version │ Status │ Action │ Proxy Address ║
╟──────────────────────────┼─────────┼────────┼────────┼───────────────╢
║ src/TakeMarket.sol       │ n/a     │ new    │ deploy │               ║
╟──────────────────────────┼─────────┼────────┼────────┼───────────────╢
║ src/TakeMarketShares.sol │ n/a     │ new    │ deploy │               ║
╚══════════════════════════╧═════════╧════════╧════════╧═══════════════╝

Continue? [y/N]: y

1. Locating AddressResolver...

tx: 0xec0afea80a34f55c8e0eb553a97dd524fc104a6a8b05fe6d9e7f24a08cdb0dba
contract: 0xED0626e8Eea7098C1e03B72c1c72B89a43EF4812
AddressResolver is at 0xED0626e8Eea7098C1e03B72c1c72B89a43EF4812

2. Deploying contracts...

[src/TakeMarket.sol]
Creating proxy ProxyTakeMarket for TakeMarket
tx: 0xcb902645d9529d979b557c699607bc65e9f8780df8fde6ab202897153bcf5f71
contract: 0x4A0a7843BbC7d33e4824cb5bdb531f0E195B64E1
Deploying TakeMarket v1
contract: 0x158788351516cB54d692de557936C38427959FC7 (create2)
Upgrading ProxyTakeMarket to implementation v1
tx: 0x79a138b7ea93c2183b412e05996deeb610ad9ed12d3d5cf5bce333670e7a0594

[src/TakeMarketShares.sol]
Creating proxy ProxyTakeMarketShares for TakeMarketShares
tx: 0x87e6bad98e22e6f3f10a480c5cb4b388b32c7a6e80e3552433f1ec046831b7ae
contract: 0xDeCFC2c6dDFf24579d5924484a9033Ce0563DBf4
Deploying TakeMarketShares v1
contract: 0x26e89734f2520BEe20f7624801692F5b477EEe00 (create2)
Upgrading ProxyTakeMarketShares to implementation v1
tx: 0xe3652446430ca9ec76910456989969b09e4c525d7e9b55309f61b923bf7f112f

3. Importing addresses into AddressResolver...

tx: 0x6cc7f0e7271e820ea24cc6f8fcddbbedc30e94efeb8c630e2d46e13fdcd20e00
Imported 2 addresses.

4. Rebuilding MixinResolver caches...

Rebuilding cache for TakeMarket (v1)
tx: 0xf514a04f468e0b96a2316e806c62ae7b715e6032eeecba1d43c57a80b8a62dd9
Skipping TakeMarketShares (v1) - cache is fresh

Done rebuilding caches.

5. Running initialize script...

TakeMarket.initialize(123123123)
Initializing...
tx: 0x65b72a4397b76b42b954d436624663cc57b6a35a379064b4e1d50a5dc0a0c386

TakeMarket.getOrCreateTakeSharesContract("1")
Updating...
tx: 0x0eb4940fcb4db87f46f10f7dacb0cd0ad9b5f808c04ebf7b05964d2165b08b1c

TakeMarket.getOrCreateTakeSharesContract("2")
Updating...
tx: 0xa1f89a9eb8030d657425980b32559ed1cf3da6596d065593b5d3e4dc25e534c9

TakeMarket.getOrCreateTakeSharesContract("3")
Updating...
tx: 0x9e8db520d94d4c325f33559b0f910854b195cbc3563251b8552c9090a4d84a96


5. Saving deployments manifest...
```

## `generate-npm-package`

Autogenerate an `index.js` which is importable in Next.js (since JSON loading isn't supported by default), and usable in other tooling (Telegram bots).

```sh
niacin generate-npm-pkg --manifest-path contracts/.vercel3/deployments/localhost/manifest.json --out index.js
```

```js
const contracts = require('./index')
const TakeMarketShares = new ethers.Contract(
  contracts.TakeMarketShares.address, 
  contracts.TakeMarketShares.ABI
)
```

![Imgur](https://imgur.com/MwcEVbR)


## Using the deployment manifest with 3rd party contracts.

**Add a 3rd party contract from Etherscan**:

```sh
# Vendor the WETH9 wrapped ETH contract on Optimism. (Solidity)
niacin add-vendor --manifest manifest.json --name WETH --fetch-from-etherscan https://optimistic.etherscan.io/token/0x4200000000000000000000000000000000000006

# Vendor the Curve.fi 3pool on Optimism. (Vyper)
niacin add-vendor --manifest manifest.json --name Curve3Pool --fetch-from-etherscan https://optimistic.etherscan.io/address/0x1337BedC9D22ecbe766dF105c9623922A27963EC
```

**Generate .sol interfaces from any Etherscan URL, automatically**:

```sh
# Solidity dependencies.
niacin generate-sol-interface --manifest manifest.json --name WETH > src/vendor/WETH.sol

# Vyper dependencies.
niacin generate-sol-interface --manifest manifest.json --name Curve3Pool > src/vendor/Curve3Pool.sol
```