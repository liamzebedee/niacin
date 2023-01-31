# /

Continuous deployment for Solidity.

```sh
cli/                               # Deployer CLI tooling.
example-project/                   # An example project using the deployer.
contracts/                         # Contracts for continuous deployment.
docs/                              # Documentation on the deployer.
```

## Tutorial (WIP).

**DO NOT USE THIS IN PRODUCTION, STILL HEAVILY INDEV AND ALPHA CODE**/

 1. Install the `vercel3-contracts` into your Forge project - `forge install liamzebedee/vercel3-pipeline`.
 2. Install the vercel3 deployer command - `npm i -G vercel3-deploy`.
 3. Deploy `vercel3-deploy --project-dir . --project-type foundry --input-manifest ./.vercel3/deployments/localhost/manifest.json`

Benefits for user:

 * All contracts are deployed with upgradeability built-in.
 * Instant tracking of deployment artifacts in the `manifest.json`.
 * Automatically generate a JS module containing deployment info/abi's, for use in frontends/subgraphs.

### Dynamically linking to contracts.

Rather than manually copying-and-pasting addresses everywhere, wouldn't it be easier if you could automatically resolve them? 

Use the `MixinResolver`:

```sol
import "@vercel3/lib/MixinResolver.sol";
import "./IERC20.sol";

contract SlayAMM is
    MixinResolver 
{
    constructor(address _resolver) MixinResolver(_resolver) {
    }

    function resolverAddressesRequired() public override pure returns (bytes32[] memory addresses) {
        bytes32[] memory requiredAddresses = new bytes32[](2);
        requiredAddresses[0] = bytes32("SlayToken");
        return requiredAddresses;
    }

    function slayToken() internal view returns (address) {
        return IERC20(requireAndGetAddress(bytes32("SlayToken")));
    }

    function mint() external {
        slayToken().transfer(msg.sender, 1e18 * 50);
    }
}
```