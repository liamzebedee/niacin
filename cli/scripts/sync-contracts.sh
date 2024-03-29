#!/usr/bin/env bash
set -ex

sync() {
    name=$1
    cp ../contracts/out/$name.sol/$name.json src/contracts/artifacts/$name.json
}


rm -rf ./src/contracts/artifacts/
mkdir -p ./src/contracts/artifacts/

sync "AddressProvider"
sync "Proxy"
sync "MixinResolver"
sync "MixinInitializable"


# sync "DSProxy"
# sync "DSProxyFactory"
# sync "DSProxyCache"

# cp ../contracts/out/AddressResolver.sol/AddressResolver.json src/contracts/artifacts/AddressResolver.json
# cp ../contracts/out/AddressResolver.sol/AddressResolver.json src/contracts/artifacts/AddressResolver.json