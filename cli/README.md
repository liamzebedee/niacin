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

**Deployment data for your Dapp/Subgraph**. Contract deployment information is written to a `manifest.json`, containing the addresses, ABI's, and deployment block number and tx (useful for The Graph).

**Factories made easy**. Building contracts that deploy other contracts is easy, but upgrading them is hard. This is sometimes called a Factory, where the factory clones a template contract, often 100's of times. We implement a pattern where you can upgrade all 100's of these templates in one tx. A simple `initialize` function for your parameters, and you can still use dependency injection to lookup your contracts dynamically without passing around extra data.

**Built from reputable code**. The smart contracts are derived from the Synthetix v2 deployer, OpenZeppelin clone helpers, and the tBTC Factories.

Coming soon:

 - [ ] System-wide pausing for contracts.

### Usage.

```sh
npm i
# install `aller` binary
npm link

aller deploy --project-dir . --project-type foundry --manifest ./manifest-polygon2.json --gas-estimator polygon
```

### Example.

```sh
(base) ➜  contracts git:(contracts-rewrite-aller) ✗ aller deploy --project-dir . --project-type foundry --manifest ./manifest-polygon2.json --gas-estimator polygon
Creating new empty manifest...
Loading configuration: /Users/liamz/Documents/Projects/take.xyz/contracts/.allerrc.js
Loaded .allerrc.js
Using gas estimator: polygon
(1) Build
Project directory: /Users/liamz/Documents/Projects/take.xyz/contracts
Project type: foundry

> forge build
No files changed, compilation skipped


(2) Deploy

RPC URL: https://polygon-rpc.com
Deploying from account: 0x913Fd60887e7b99F2EE9115a79F3C5886ad2d47A

╔════════════════════════════╤═════════╤═════════╤════════╤═══════════════╗
║ Contract                   │ Version │ Status  │ Action │ Proxy Address ║
╟────────────────────────────┼─────────┼─────────┼────────┼───────────────╢
║ src/HYPE.sol               │ n/a     │ new     │ deploy │               ║
╟────────────────────────────┼─────────┼─────────┼────────┼───────────────╢
║ src/Take.sol               │ n/a     │ new     │ deploy │               ║
╟────────────────────────────┼─────────┼─────────┼────────┼───────────────╢
║ src/TakeMarketSharesV1.sol │ n/a     │ ignored │ none   │               ║
╟────────────────────────────┼─────────┼─────────┼────────┼───────────────╢
║ src/TakeMarketV1.sol       │ n/a     │ ignored │ none   │               ║
╟────────────────────────────┼─────────┼─────────┼────────┼───────────────╢
║ src/TakeRewardsV1.sol      │ n/a     │ new     │ deploy │               ║
╟────────────────────────────┼─────────┼─────────┼────────┼───────────────╢
║ src/Test2.sol              │ n/a     │ new     │ deploy │               ║
╚════════════════════════════╧═════════╧═════════╧════════╧═══════════════╝

Continue? [y/N]: y

1. Locating AddressResolver...
deployContract tx=0x262863b24c6acf5fbbdba23ef12793f5138941f80251a8e2e2ce655d933b552b
AddressResolver is at 0x00B8A57df493830bB833140F0C203d8Fd900603F

2. Deploying contracts...

[src/HYPE.sol]
Creating proxy ProxyHYPE for HYPE
deployContract tx=0xcab5d6b7998fef8eebefb85df2b42106d24f00686fa49d1a67982026339895ad
Deploying HYPE v1
deployContract tx=0x606b79595ce1f9a732580a288a0c40ba53156e2d1a5fdf9d9f3fe74943f09108
Upgrading ProxyHYPE to implementation v1

[src/Take.sol]
Creating proxy ProxyTake for Take
deployContract tx=0xa5623b5a70f65314b6fdd4d3e14b36f7698cf8856cc059ce9bcfda2bd76bb328
Deploying Take v1
deployContract tx=0xaee7db06ecb720c0cb7d41cd14a8a7f87f4f4dd6d409c307107d0040e8008123
Upgrading ProxyTake to implementation v1
```

## `generate-npm-package`

Autogenerate an `index.js` which is importable in Next.js (since JSON loading isn't supported by default), and usable in other tooling (Telegram bots).

```sh
aller generate-npm-pkg --manifest-path contracts/.vercel3/deployments/localhost/manifest.json --out index.js
```

```js
const contracts = require('./index')
const TakeMarketShares = new ethers.Contract(
  contracts.TakeMarketShares.address, 
  contracts.TakeMarketShares.ABI
)
```

![Imgur](https://imgur.com/MwcEVbR)