// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

struct OwnerStore {
    address owner;
    address nominee;
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

    function nominateOwner(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Owner address cannot be 0");
        _ownerStore().nominee = _newOwner;
        emit OwnerNominated(_newOwner);
    }

    function acceptOwnership() external {
        address nominee = _ownerStore().nominee;
        require(msg.sender == nominee, "You must be nominated before you can accept ownership");
        emit OwnerChanged(_ownerStore().owner, nominee);
        _ownerStore().owner = nominee;
        _ownerStore().nominee = address(0);
    }

    function owner() external view returns (address) {
        return _ownerStore().owner;
    }

    event OwnerChanged(address oldOwner, address newOwner);
    event OwnerNominated(address newOwner);
}