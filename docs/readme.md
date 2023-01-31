## Deployer.

### How does the deployer work?

Deployment is made up of a few system contracts:

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
