Basically:

Target
    Name
    Address

Deployment
    Target
    Address
    Version: Int
    Tx: Transaction

Build
    Artifact
        Name
        Path
        ABI
        Bytecode



Build ->

    Load manifest
    Search contracts
    Find targets
    Detect changed targets - bytecode changed
        Compare against manifest
        set "overwrite" true
        set "deployed" based on existence in the manifest
    
    Begin deployment
    Upsert AddressResolver
        Load from system contracts
    
    Map targets:
        Upsert Proxy
            {"type":"upsert_proxy", details:{proxy}}
        Deploy Implementation
            {"type":"deploy_impl", details:{impl}}
    
    Now upgrade
        addressresolver.importAddresses()
            {"type":"import_addresses", details:{tx}}

        map targets:
            Proxy.upgradeTo(implementation)
                {"type":"upgrade_impl", details:{from_impl, to_impl, target, version}}
        map impls:
            # it's important that we map all past impls, as you might delete a deployed contract.
            # but it's addressresolver cache still needs to be updated.
            impls.rebuildCache()
                {"type":"rebuild_cache", details:{impl}}

    now write to the manifest:
        actions
        targets = actions.filter(type => "upgrade_impl").reduce((acc, action, i) => {
            return {
                [action.target]: {
                    address: action.to_impl,
                    version: i + 1,
                    abi: asdasd,
                    deployTx: {}
                }
            }
        }, {})


the new manifest

