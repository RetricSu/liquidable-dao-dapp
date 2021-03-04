# Getting Started

## Step 1

```sh
git clone https://github.com/RetricSu/liquidable-dao-dapp.git
cd liquidable-dao-dapp/packages/server
yarn install
```

## Step 2

Create a .env file and add the following content

```md
LUMOS_CONFIG_NAME="DEV"
LUMOS_CONFIG_FILE="src/config/lumos_config_development.json"

LUMOS_CONFIG_FILE_DEVELOPMENT="src/config/lumos_config_development.json"
LUMOS_CONFIG_FILE_PROUDCTION="src/config/lumos_cofnig_production.json"
```

## Step 3

Run a devnet or testnet ( [How?](https://docs.nervos.org/docs/basics/guides/devchain) ). 

Depending on your running blockchain, you may need to update the json file in `../src/config` folder.

## Step 4

You should have these 3 contracts deployed in your local blockchain before you run this demo:

1. [type-id](https://xuejie.space/2020_02_03_introduction_to_ckb_script_programming_type_id/) contract
2. [the special lock](https://github.com/RetricSu/liquidable-nervos-dao-contract) contract (the main one of this demo)
3. [secp256k1_blake2b_sighash_all_duel](https://github.com/jjyr/ckb-dynamic-loading-secp256k1) contract (a sharing code import via [dynamic loading](https://docs.nervos.org/docs/labs/capsule-dynamic-loading-tutorial))

the most common way to do that is to deploy all three contract using [capsule](https://github.com/nervosnetwork/capsule). you can check out instruction on the [smart comtract repo](https://github.com/RetricSu/liquidable-nervos-dao-contract).

however, if you don't have capsule installed in your local machine, the server code already contains the function to deploy all 3 contracts for you. you can check out the details in the end of [../src/server.ts](../src/server.ts) file.

## Step 5

now you are ready to start the server.

```sh
  yarn server
```
