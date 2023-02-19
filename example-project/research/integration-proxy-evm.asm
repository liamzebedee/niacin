// an EVM integration proxy
// this sits before the bytecode of a contract
// and is responsible for calling the integration proxy address in order to check if the system is online
// if the system is online, the integration proxy will call the contract's bytecode
// if the system is offline, the integration proxy will revert
// this is a safety mechanism to prevent the contract from being called when the system is offline

PUSH20 0xbebebebebebebebebebebebebebebebebebebebe

// construct the calldata
// the first 4 bytes are the function selector
PUSH4 0x999790ec

// 

// isSystemOnline() 




// CALL requires:
// 1. gas
// 2. address
// 3. value
// 4. offset
// 5. size
// 6. offset
// 7. size

// Thus the operand order is: gas, to, value, in offset, in size, out offset, out size.

// gas
PUSH1 0x64

// address
PUSH20 0xbebebebebebebebebebebebebebebebebebebebe

// value
PUSH1 0x0

// in offset
// the in data is simply the 4-byte function selector
PUSH1 0x0