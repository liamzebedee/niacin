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

cp ../contracts/out/DSProxy.sol/DSProxy.json src/contracts/artifacts/DSProxy.json
cp ../contracts/out/DSProxy.sol/DSProxyCache.json src/contracts/artifacts/DSProxyCache.json
# sync "DSProxy"
# sync "DSProxyCache"

# sync "DSProxyFactory"

# cp ../contracts/out/AddressResolver.sol/AddressResolver.json src/contracts/artifacts/AddressResolver.json
# cp ../contracts/out/AddressResolver.sol/AddressResolver.json src/contracts/artifacts/AddressResolver.json