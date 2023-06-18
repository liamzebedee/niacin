// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

struct OwnerStore {
    address owner;
}

contract OwnerStorage {
    bytes32 constant STORE_SLOT = bytes32(uint(keccak256("eth.nakamofo.niacin.v1.owner")) - 1);

    function _ownerStore() internal pure returns (OwnerStore storage store) {
        bytes32 s = STORE_SLOT;
        assembly {
            store.slot := s
        }
    }
}

contract Owned is OwnerStorage {
    constructor(address _owner) {
        require(_owner != address(0), "Owner address cannot be 0");
        _ownerStore().owner = _owner;
        emit OwnerChanged(address(0), _owner);
    }

    modifier onlyOwner {
        _onlyOwner();
        _;
    }

    function _onlyOwner() private view {
        require(msg.sender == _ownerStore().owner, "Only the contract owner may perform this action");
    }

    function setOwner(address _owner) external onlyOwner {
        require(_owner != address(0), "Owner address cannot be 0");
        emit OwnerChanged(_ownerStore().owner, _owner);
        _ownerStore().owner = _owner;
    }

    function owner() external view returns (address) {
        return _ownerStore().owner;
    }

    event OwnerChanged(address oldOwner, address newOwner);
}