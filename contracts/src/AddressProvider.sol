// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

// Inheritance
import {Owned} from "./lib/Owned.sol";

// Internal references
import {IMixinResolver} from "./interfaces/IMixinResolver.sol";

struct AddressProviderStore {
    // target name -> address.
    mapping(bytes32 => address) addresses;
}

contract AddressProviderStorage {
    bytes32 constant private STORE_SLOT = bytes32(uint(keccak256("eth.nakamofo.addressprovider.v1")) - 1);

    function _store() internal pure returns (AddressProviderStore storage store) {
        bytes32 s = STORE_SLOT;
        assembly {
            store.slot := s
        }
    }
}

contract AddressProvider is 
    Owned, 
    AddressProviderStorage 
{
    constructor(address _owner) Owned(_owner) {}

    /* ========== RESTRICTED FUNCTIONS ========== */

    function importAddresses(
        bytes32[] calldata names, 
        address[] calldata destinations
    ) 
        external 
        onlyOwner 
    {
        require(names.length == destinations.length, "Input lengths must match");

        for (uint i = 0; i < names.length; i++) {
            bytes32 name = names[i];
            address destination = destinations[i];
            _store().addresses[name] = destination;
            emit AddressImported(name, destination);
        }
    }

    /* ========= PUBLIC FUNCTIONS ========== */

    function rebuildCaches(
        IMixinResolver[] calldata destinations
    ) 
        external 
    {
        for (uint i = 0; i < destinations.length; i++) {
            destinations[i].rebuildAddressCache();
        }
    }

    /* ========== VIEWS ========== */

    function areAddressesImported(
        bytes32[] calldata names, 
        address[] calldata destinations
    ) 
        external view 
        returns (bool) 
    {
        for (uint i = 0; i < names.length; i++) {
            if (_store().addresses[names[i]] != destinations[i]) {
                return false;
            }
        }
        return true;
    }

    function getAddress(bytes32 name) external view returns (address) {
        return _store().addresses[name];
    }

    function requireAddress(bytes32 name, string calldata reason) external view returns (address) {
        address _foundAddress = _store().addresses[name];
        require(_foundAddress != address(0), reason);
        return _foundAddress;
    }

    /* ========== EVENTS ========== */

    event AddressImported(bytes32 name, address destination);
}
