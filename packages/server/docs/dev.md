# Getting Started

## Step 1

First,

```sh
git clone https://github.com/RetricSu/dao-demo-server.git
cd dao-demo-server
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

the most common way to do that is to deploy all three contract using [capsule](https://github.com/nervosnetwork/capsule).

otherwise, if you don't have capsule installed in your local machine, the server code already contains the function to deploy all 3 contracts for you. you can check out the details in the end of `../src/server.ts`.

### Lastly...Just For Fun

This demo is mainly use for teaching about hwo to  build dapps on CKB, however, you can try improve the project to be a little more like a real product if you want.

some additaional feature and ideas includes:

- [x] add an devnet faucet to make new wallet be able to use this demo
- [ ] add or complete the wallet-related funciton, like:
  - [ ] recent transaction history
  - [ ] wallet balance
  - [ ] your NervosDAO earning
  - [ ] ...
- [ ] a market-place to trade with this puppet cell
- [ ] to show the poential of liquating NervosDAO cell, like a faked defi mining app that can actually runing!

Feel free to submit a PR! Happy Coding!
