# smart-contracts
Example stateful and stateless smart contracts.

## Requirements

### Install a node
[Docs](https://developer.algorand.org/docs/run-a-node/setup/install/)

### Install SDK
```shell
npm install algosdk
```

### Config
If you are running your own Algorand node and not using sandbox, change those variables:
- algod-token
- algod-address
- algod-port

### Run contract deployment file
```shell
node StatefulCreator.js <YOUR_ACCOUNT_MNEMONIC>
```