## Deployer.

### How does the deployer work?

The vercel3 architecture is based on these concepts:

 - **targets**: a target is a stable identity for a contract, with a name and a proxy which forwards to the current implementation. e.g. `SNXToken`
 - **an address registry**. the address registry allows developers to use other contracts in the system by their target's name, rather than copy-pasting addresses. e.g. `getContract("SNXToken")`. It is basically [dependency injection](https://en.wikipedia.org/wiki/Dependency_injection).
 - **a resolver mixin**: the `MixinResolver` allows any contract to resolve its dependencies.

These concepts are implemented in the following contracts:

 - **AddressResolver**: A centralized registry that maps contract name -> latest deployed address.
 - **MixinResolver**: A mixin which allows any contract to resolve a contract name to its latest deployment. The MixinResolver loads its entries from a cache, which is manually reloaded upon deployment of new contracts.
 - **Proxy**: An extremely minimal proxy, which forwards calls via `delegatecall` to an implementation contract.

Deployment follows this basic pipeline:

 - Find contracts to be deployed.
 - Check if their bytecode has changed, if it has, stage them.
 - Get/create the `AddressResolver`.
 - For each deployable contract:
   - Get/create the contract `Proxy`. The proxy functions as a stable identity for the contract. We sometimes refer to it as the "**target**".
   - Deploy the new implementation.
   - Upgrade the proxy to the new implementation.
 - Import all new targets into the `AddressResolver` registry.
 - Rebuild the MixinResolver caches for all contracts we are tracking.
