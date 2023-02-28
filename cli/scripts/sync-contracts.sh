set -ex

sync() {
    name=$1
    cp ../contracts/out/$name.sol/$name.json src/contracts/artifacts/$name.json
}

sync "AddressResolver"
sync "Proxy"
sync "DSProxy"
sync "DSProxyFactory"
sync "DSProxyCache"

# cp ../contracts/out/AddressResolver.sol/AddressResolver.json src/contracts/artifacts/AddressResolver.json
# cp ../contracts/out/AddressResolver.sol/AddressResolver.json src/contracts/artifacts/AddressResolver.json