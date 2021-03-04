# CKB Liquidable DAO Dapp

This repo contains the dapp-side code in the talk video - [Dapps On CKB: Building A Liquidable DAO workshop]().

![](docs/img/dapp-demo.png)

In order to run this dapp, firstly you should deploy the smart contract on a CKB blockchain.

- dapp
- [smart contract](https://github.com/RetricSu/liquidable-nervos-dao-contract)

## development

this repo contains two parts: [server](packages/client) and [client](packages/server). 

you can check out each part in `./packages`.

## just for fun

This demo is mainly used for teaching about how to  build dapps on CKB, however, you can try improve the project to be a little more like a real product if you want.

some additaional feature and ideas includes:

- [x] add an devnet faucet to make new wallet be able to use this demo
- [ ] add or complete the wallet-related funciton, like:
  - [ ] recent transaction history
  - [ ] wallet balance
  - [ ] your NervosDAO earning
  - [ ] ...
- [ ] a market-place to trade with this puppet cell
- [ ] to show the poential of liquating NervosDAO cell, like a faked defi mining app that can actually runing!

Feel free to submit a PR! 

Happy Coding!
