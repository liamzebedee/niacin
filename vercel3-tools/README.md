vercel3-tools
=============

This repo contains the CLI tooling necessary to enable vercel3:

 * **deployer**.
 * **generate-npm-package**. Autogenerate an `index.js` with your contract deployments, usable in Next.js and the wider JS ecosystem.

Inspirations: Synthetix v2 deployer, Synthetix v3 Store pattern, tBTC Factories

## Deployer.

The deployer is designed to remove the hassle of smart contract deployments.

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
node build/index.js deploy --project-dir ./contracts
```

### Example.

```sh
(base) ➜  vercel3-tools git:(master) ✗ node build/index.js deploy --project-dir ./contracts
Project directory: /Users/liamz/Documents/Projects/vercel3/take.xyz/vercel3-tools/contracts
forge build
No files changed, compilation skipped
[
  'src/AddressResolver.sol',
  'src/example/TakeMarket.sol',
  'src/example/TakeMarketShares.sol',
  'src/Proxy.sol',
  'src/SystemStatus.sol'
]
Deploying from account: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

AddressResolver deployed at 0xC1e0A9DB9eA830c52603798481045688c8AE99C2

Deploying contracts...

[src/example/TakeMarket.sol]
Deploying ProxyTakeMarket
Deploying TakeMarket (impl)
Upgrading ProxyTakeMarket

[src/example/TakeMarketShares.sol]
Deploying ProxyTakeMarketShares
Deploying TakeMarketShares (impl)
Upgrading ProxyTakeMarketShares

[src/SystemStatus.sol]
Deploying ProxySystemStatus
Deploying SystemStatus (impl)
Upgrading ProxySystemStatus

Importing addresses into AddressResolver

Rebuilding MixinResolver caches...
Rebuilding cache for ProxyTakeMarket
Rebuilding cache for TakeMarket
Rebuilding cache for ProxyTakeMarketShares
Rebuilding cache for TakeMarketShares
Rebuilding cache for ProxySystemStatus
Done rebuilding caches
mkdir: path already exists: .vercel3
mkdir: path already exists: .vercel3/deployments
mkdir: path already exists: .vercel3/deployments/localhost
```

## `generate-npm-package`

Autogenerate an `index.js` which is importable in Next.js (since JSON loading isn't supported by default), and usable in other tooling (Telegram bots).

```sh
node build/index.js generate-npm-pkg --manifest-path contracts/.vercel3/deployments/localhost/manifest.json --out index.js
```

```js
const contracts = require('./index')
const TakeMarketShares = new ethers.Contract(
  contracts.TakeMarketShares.address, 
  contracts.TakeMarketShares.ABI
)
```

![Imgur](https://imgur.com/MwcEVbR)