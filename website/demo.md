niacin alpha 
============

**1. Install the CLI**.

```sh
npm i -D niacin-cli
```

**2. Install the contracts**.

```sh
forge install liamzebedee/niacin-contracts
```

**3. Start playing**.

```sh
niacin init
```

## Writing your first deploy script.

```sh
forge build
niacin deploy YourContractA YourContractB
```

## Checking your deployments.

```sh
niacin status
```

## Running multichain deployments.

Niacin is oriented around the `manifest` file, which describes all the information about a deployment to an EVM chain.

You can operate on different chains by switching the manifest you are using with the `--manifest` argument.

Niacin does safety checks on chain ID, so you can't overwrite your deployments by accident.

Here's an example:

```sh
export PRIVATE_KEY="0x"

# Deploy multichain.
mkdir deployments/
RPC_URL=""                             niacin deploy -a --manifest deployments/local.json
RPC_URL="https://polygon‑rpc.com"      niacin deploy -a --manifest deployments/polygon.json --gas-estimator polygon
RPC_URL="https://arb1.arbitrum.io/rpc" niacin deploy -a --manifest deployments/arbitrum.json

# Generate index.js API's.
niacin generate-npm-pkg --manifest deployments/local.json    > deployments/local.js
niacin generate-npm-pkg --manifest deployments/polygon.json  > deployments/polygon.js
niacin generate-npm-pkg --manifest deployments/arbitrum.json > deployments/arbitrum.js

# Interact with contracts.
niacin call --manifest deployments/local.json
niacin call --manifest deployments/polygon.json
niacin call --manifest deployments/arbitrum.json

# Get deployments status for each chain.
niacin status --manifest deployments/local.json
niacin status --manifest deployments/polygon.json
niacin status --manifest deployments/arbitrum.json
```

## Using dependency injection.

Say you have two contracts, a `ProtocolManager` and a `FeePool`, and you want to get the address of the FeePool contract.

```sol
// FeePool.sol
contract FeePool {
    // ...
}
```

Niacin automatically links your contract dependencies together. Just import the `MixinResolver` as so:

```sol
// ProtocolManager.sol
import {MixinResolver} from "niacin-contracts/mixins/MixinResolver.sol";

contract ProtocolManager is
    MixinResolver
{
    function getDependencies() public override pure returns (bytes32[] memory addresses) {
        bytes32[] memory requiredAddresses = new bytes32[](1);
        requiredAddresses[0] = bytes32("FeePool");
        return requiredAddresses;
    }

    function feePool() internal view returns (FeePool) {
        return FeePool(requireAddress(bytes32("FeePool")));
    }

    function swap() external {
        FeePool pool = feePool();
        // do whatever you want.
    }
}
```

## Automagic NPM interface.

```sh
niacin generate-npm-pkg --manifest manifest.json > index.js
```

You can use this in your JS code like so:

```js
const deployments = require('./index.js')
const ethers = require('ethers')

const provider = new ethers.providers.JsonRpcProvider()
const ProtocolManager = new ethers.Contract(
    deployments.ProtocolManager.address,
    deployments.ProtocolManager.abi,
    provider
)
```

## Automagic CLI interface.

You can also automatically use Niacin from the CLI:

```sh
# Show your deployments
niacin call

# Call a specific contract
niacin call ProtocolManager
```

**BUG:** Note that for now, arguments which are hexadecimal strings (addresses, bytes) must be enclosed with quotes and without the `0x` prefix. e.g. `0x12312313` -> `"12312313"`.

## More features.

Import third-party contracts from Etherscan EVM chains:

```sh
niacin add-vendor             --name Curve3Pool --fetch-from-etherscan https://optimistic.etherscan.io/address/0x1337BedC9D22ecbe766dF105c9623922A27963EC
niacin generate-sol-interface --name Curve3Pool > src/vendor/Curve3Pool.sol
niacin generate-npm-pkg                         > index.js
```

Not yet integrated: autogenerated contract UI's.

## Initializing contracts.

Due to how upgradeable contracts are implemented, you cannot use constructors. Instead, Niacin provides a simple `initialize` which can be called from a postdeploy script.

Import the `MixinInitializable` and write an `initialize` function with the `initializer` modifier:

```sol
// ProtocolManager.sol
import {MixinResolver} from "niacin-contracts/mixins/MixinResolver.sol";
import {MixinInitializable} from "niacin-contracts/mixins/MixinInitializable.sol";

contract ProtocolManager is
    MixinResolver,
    MixinInitializable
{   
    function initialize() 
        public 
        initializer 
    {
        // $TEMPEST_TREE_LEVELS_GLOBAL
        initialize_MerkleTreeAccumulator(21, IHasher(requireAddress("MiMC")));
    }

    function getDependencies() public override pure returns (bytes32[] memory addresses) {
        bytes32[] memory requiredAddresses = new bytes32[](1);
        requiredAddresses[0] = bytes32("FeePool");
        return requiredAddresses;
    }

    function feePool() internal view returns (FeePool) {
        return FeePool(requireAddress(bytes32("FeePool")));
    }

    function swap() external {
        FeePool pool = feePool();
        // do whatever you want.
    }
}
```

I'm still working on the UX of initializers.

For now, you can write a simple `postdeploy` script which will run after invoking `niacin deploy` for a deployment. 

Create a new script `postdeploy.js` and include this code:

```js
module.exports = async function (niacin) {
    const {
        ProtocolManager
    } = niacin.contracts

    await niacin.initialize({
        contract: ProtocolManager,
        args: []
    })
}
```

Open the `.niacinrc.js` and paste the following:

```
module.exports = {
    version: "0.1.0",
    ignore: [],
    scripts: {
        initialize: require('./deploy/initialize')
    }
}
```

Your initializer will now run as part of `niacin deploy`.