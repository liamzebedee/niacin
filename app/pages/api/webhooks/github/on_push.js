

// On push
// Begin a new deployment
// Clone the repo
// Run the build script for the contracts
// Once we have the contract code, we initiate the blockchain deployment
// each of these have their own logging instance


function startDeployment() {
    // context: project id
    // load the contract artifacts
    // for each artifact
        // construct a tx which deploys the artifact to an address
        // run the tx
        // get the deployed address in return
}

function runTx() {
    // instantiate a cairo vm
    // load the tx into the vm
    // shit: how do we avoid loading the entire state into the VM?
    // uhhhhhh.
    // rewrite the cairo-rs vm.
    // we need to be able to load the state into the VM, but not the entire state.
    // can we make a dumber proto?
    // there are two approaches:
    // 1. interupt when we need to load state, and load it async from DB
    // 2. mandate all calls specify state upfront, solana style
    // why don't we just interrupt the storage_load builtin?

    // hmmmm.
    // _storage_read
    // https://sourcegraph.com/github.com/starkware-libs/cairo-lang@master/-/blob/src/starkware/starknet/core/os/syscall_utils.py?L889-890
    // https://sourcegraph.com/github.com/lambdaclass/starknet_in_rust@ac1b2574ae92b27dc0eefaa6aa968a4112433405/-/blob/src/core/syscalls/business_logic_syscall_handler.rs?L142:36-142:53
    // intercept the syscall handler

    // how are contracts loaded in the starknet example?
    // class_hash is the hash of the contract code
    // and somewhere that code is stored.

    // hmmm.
    // okay.
    // so it seems like this might be harder than anticipated.
    // two approaches:
    // 1. talk to fed.
    // 2. stick with cairo. but don't support the starknet api.
    //    what do we really need for a demo?
    //    the ability to read/write contract state.
    //    this needs to be really easy for developers.
    //    what could go wrong? they can't use many of the builtins

    // @storage_var
    // @external
    // @view
    // @contract_interface
    // @event
    // @contract_interface

    // and then on top:
    // the different types of starknet features:
    // - @starknet_entry_point
    // - @starknet_delegate_call
    // - delegate call
    // - contracthash
    // etc.


    // that's way more than 2wks of work
    // 
    // okay.
    // maybe we could do something better with EVM.
    // though it wont be starkware related.
    // but it will be a good demo.

    // load the EVM state dynamically from the DB
    // generate a proof of EVM execution
    // and then store this proof and bundle it up

    // developers write cairo programs
    // they can store state by using our API
    // it's not gonna be that easy dammit.


    // okay alternative approach:
    // we write a new API for storage-read and storage-write
    // it's a macro which transforms the prorgam
    // obviously this doesn't really work with anyhting
    

    // imagine this but for EVM
    // you spin up an EVM
    // deploying the contracts looks like this:
    // every contract is wrapped in a proxy
    // like synthetix
    

}

