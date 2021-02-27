import path from "path";
import type {
    WitnessArgs,
    Transaction,
    Cell as FormalCell,
} from "@ckb-lumos/base";
import { initializeConfig } from "@ckb-lumos/config-manager";
import type{
    signedWitnessArgsType
} from "./lib/builder";
import { Builder } from "./lib/builder";
import { Chain } from "./lib/chain";
import { DaoBot } from "./lib/daobot";
import * as Config from "./config/const.json";
import * as User from './config/user.json';
import { get_env_mode } from './lib/helper';
import express from "express";
import cors from "cors";

const corsOptions = {
    origin: Config.CROS_SERVER_LIST,
    optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
    credentials: true
}

// prepare server port
const PORT = get_env_mode() === 'development' ? Config.SERVER_PORT.development : Config.SERVER_PORT.production;
// prepare lumos envirment config
require("dotenv").config();
if (process.env.LUMOS_CONFIG_FILE_DEVELOPMENT && process.env.LUMOS_CONFIG_FILE_PRODUCTION)
    process.env.LUMOS_CONFIG_FILE = get_env_mode() === 'development' ? 
        path.resolve(process.env.LUMOS_CONFIG_FILE_DEVELOPMENT) : 
        path.resolve(process.env.LUMOS_CONFIG_FILE_PRODUCTION);
initializeConfig();

const app = express();
app.use(cors(corsOptions));
app.use('/static', express.static(path.join(__dirname, '../../src/script-examples')))

const chain = new Chain();
const builder = new Builder();
const daobot = new DaoBot(chain.getIndexer());

app.get( "/", ( req, res ) => {
    res.json( "hello, CKB learner!" );
});

app.get( "/dao_pool", async ( req, res ) => {
   try {
        const info = await daobot.get_dao_pool_info(); 
        res.json({status:'ok', data: info});
   } catch (error) {
       res.json({status:'failed', data: error.message});
   }
});

app.get("/list_all_dao_cells", async ( req, res ) => {
    const limit = parseInt(''+req.query.limit) || 10;
    const address = ''+req.query.address;
    // ugly method to pass ts type check..
    const type: "all" | "deposit" | "withdraw" = ''+ ( req.query.type || 'all' ) === "all" ? "all" : ''+ ( req.query.type || 'all' ) === "deposit" ? "deposit" : "withdraw";
    if(address.length === 0)
        return res.json({status:'failed', data:'required valid address.'});

    const cells = await daobot.list_dao_cells(address, type, limit);
    return res.json({status: 'ok', data: cells});
});

app.get("/deposit_dao", async (req, res) => {
    const address = ''+req.query.address;
    const amount = BigInt(''+req.query.amount);

    if(address.length === 0 || amount < daobot.get_min_dao_capacity())
        return res.json({status:'failed', data:`required valid address and amount must be bigger than ${daobot.get_min_dao_capacity()}`});

    try {
        const result = await daobot.deposit(amount, address, address);
        return res.json({status:'ok', data: result});
    } catch (error) {
        return res.json({status: 'failed', data: error.message});    
    }
});

app.get("/list_specail_dao_cells_by_address", async ( req, res ) => {
    const limit = parseInt(''+req.query.limit) || 10;
    const address = ''+req.query.address;
    // ugly as fuck to pass ts type check
    const type: "all" | "deposit" | "withdraw" = ''+ ( req.query.type || 'all' ) === "all" ? "all" : ''+ ( req.query.type || 'all' ) === "deposit" ? "deposit" : "withdraw";
    if(address.length === 0)
        return res.json({status:'failed', data:'required valid address.'});

    const cells = await daobot.list_special_dao_cells(address, type, limit);
    return res.json({status: 'ok', data: cells});
});

app.get("/deposit_special_dao", async (req, res) => {
    const address = ''+req.query.address;
    const amount = BigInt(''+req.query.amount);

    if(address.length === 0 || amount < daobot.get_min_special_dao_capacity())
        return res.json({status:'failed', data:`required valid address and amount must be bigger than ${daobot.get_min_special_dao_capacity()}`});

    try {
        const result = await daobot.deposit_with_special_lock(amount, address, address);
        return res.json({status:'ok', data: result});
    } catch (error) {
        console.log(error);
        return res.json({status: 'failed', data: error.message});    
    }
});

app.get("/get_normal_dao_capacity_by_address", async ( req, res ) => {
    const address = ''+req.query.address;
    if(address.length === 0)
        return res.json({status:'failed', data:'required valid address.'});

    try {
        const total = await daobot.caculate_normal_dao_capacity(address);
        return res.json({status: 'ok', data: total});
    } catch (error) {
        return res.json({status: 'failed', data: error.message});
    }
});

app.get("/get_special_dao_capacity_by_address", async ( req, res ) => {
    const address = ''+req.query.address;
    if(address.length === 0)
        return res.json({status:'failed', data:'required valid address.'});

    try {
        const total = await daobot.caculate_special_dao_capacity(address);
        return res.json({status: 'ok', data: total});
    } catch (error) {
        return res.json({status: 'failed', data: error.message}); 
    }
});

app.get("/get_total_dao_capacity_by_address", async ( req, res ) => {
    const address = ''+req.query.address;
    if(address.length === 0)
        return res.json({status:'failed', data:'required valid address.'});

    try {
        const total = await daobot.caculate_total_dao_capacity(address);
        return res.json({status: 'ok', data: total});
    } catch (error) {
        return res.json({status: 'failed', data: error.message});
    }
});

app.get("/withdraw_normal_dao", async ( req, res ) => {
    const address = ''+req.query.address;
    const cell: FormalCell = JSON.parse(''+req.query.cell);
    if(address.length === 0)
        return res.json({status:'failed', data:'required valid address.'});

    try {
        const result = await daobot.withdraw(address, cell);
        return res.json({status: 'ok', data: result }); 
    } catch (error) {
       return res.json({status:'failed', data: error.message}); 
    }
});

app.get("/withdraw_special_dao", async ( req, res ) => {
    const address = ''+req.query.address;
    const dao_cell: FormalCell = JSON.parse(''+req.query.dao_cell);
    const puppet_cell: FormalCell = JSON.parse(''+req.query.puppet_cell);
    if(address.length === 0)
        return res.json({status:'failed', data:'required valid address.'});

    try {
        const result = await daobot.special_withdraw(address, dao_cell, puppet_cell);
        return res.json({status: 'ok', data: result }); 
    } catch (error) {
        console.log(error);
       return res.json({status:'failed', data: error.message}); 
    }
});

app.get("/unlock_withdraw_dao", async (req, res) => {
    const from = '' + req.query.from;
    const to = '' + req.query.to;
    const type = '' + req.query.type;
    if (from.length === 0) 
        return res.json({ status: 'failed', data: 'required valid from address.' });

    try {
        const withdraw_cell: FormalCell = JSON.parse('' + req.query.withdraw_cell);
        if ( !withdraw_cell.out_point )
            return res.json({ status: 'failed', data: 'withdraw_cell.out_point is undefined.' });

        switch (type) {
            case "special":
                {
                    const puppet_cell = JSON.parse(''+req.query.puppet_cell);
                    const withdraw_tx = await chain.getTransaction(withdraw_cell.out_point.tx_hash);
                    const input_cells = await chain.getCellsFromInputs(withdraw_tx.transaction.inputs);
                    const deposit_cell = await daobot.filterDepositCell(input_cells, withdraw_cell);
                    if(!deposit_cell)
                        return res.json({ status: 'failed', data: 'the pairing depositCell not found' });
                    const result = await daobot.unlock_special_withdraw(from, to, deposit_cell, withdraw_cell, puppet_cell);
                    return res.json({ status: 'ok', data: result });
                }
            
            case "normal":
                {
                    const withdraw_tx = await chain.getTransaction(withdraw_cell.out_point.tx_hash);
                    const input_cells = await chain.getCellsFromInputs(withdraw_tx.transaction.inputs);
                    const deposit_cell = await daobot.filterDepositCell(input_cells, withdraw_cell);
                    if(!deposit_cell)
                        return res.json({ status: 'failed', data: 'the pairing depositCell not found' });
                    const result = await daobot.unlock_withdraw(from, to, deposit_cell, withdraw_cell);
                    return res.json({ status: 'ok', data: result });
                }
            default:
                return res.json({ status: 'failed', data: `unkown type. expect special or normal, found ${type}.` });
        }
    }
    catch (error) {
        return res.json({ status: 'failed', data: error.message });
    }
});

app.get("/transfer_puppet_cell", async ( req, res ) => {
    const from = ''+req.query.from;
    const to = ''+req.query.to;
    if(from.length === 0)return res.json({status:'failed', data:'required valid address.'});

    try {
        const puppet_cell: FormalCell = JSON.parse(''+req.query.puppet_cell);
        const unlock_dao_key = req.query.unlock_dao_key;
        if(unlock_dao_key){
            const result = await daobot.transfer_puppet_cell(puppet_cell, from, to, ''+unlock_dao_key);
            return res.json({status: 'ok', data: result });
        }else{
            const result = await daobot.transfer_puppet_cell(puppet_cell, from, to);
            return res.json({status: 'ok', data: result });
        }
    } catch (error) {
       console.log(error);
       return res.json({status:'failed', data: error.message}); 
    }
});

app.get("/send_tx_with_signature", async ( req, res  ) => {
    const signature: string = ''+req.query.signature;
    const tx: Transaction = JSON.parse(''+req.query.tx);
    const witnessArgs: WitnessArgs = {lock: signature};
    try {
        const witness = builder.serializeWitness(witnessArgs);
        tx.witnesses[0] = witness;
        console.log(JSON.stringify(tx));
        try {
            const data = await builder.send_tx(tx);
            res.json({status:'ok', data: data}); 
        } catch (err) {
           console.log(err);
           res.json({status:'failed', data: err.message}); 
        }
    } catch (error) {
        console.log(error);
        res.json({status:'failed', data: error.message});
    }
});

app.get("/send_tx_with_signatures", async ( req, res  ) => {
    try {
        const signatures: Array<signedWitnessArgsType> = JSON.parse(JSON.stringify(req.query.signatures)).map((s: string) => JSON.parse(s));
        var tx: Transaction = JSON.parse(''+req.query.tx);
        tx.witnesses = await builder.fillWitnessWithSignedWitnessArgs(signatures, tx.witnesses);
        console.log(JSON.stringify(tx));
        try {
            const data = await builder.send_tx(tx);
            res.json({status:'ok', data: data}); 
        } catch (err) {
           console.log(err);
           res.json({status:'failed', data: err.message}); 
        }
    } catch (error) {
        console.log(error);
        res.json({status:'failed', data: error.message});
    }
});


app.get("/get_tx_by_hash", async ( req, res ) => {
    const tx_hash: string = req.query.tx_hash?.toString() || '';
    try {
        const tx = await chain.getTransaction(tx_hash);
        res.json({status:'ok', data: tx});
    } catch (error) {
        console.log(error);
        res.json({status:'failed', data: error.message});
    }
});

app.get("/faucet", async ( req, res ) => {
   const address: string = req.query.address?.toString() || '';
   if(address.slice(0,3) != "ckt" || address.length != 46)
        return res.json({status:'failed', data:'required testnet address.'});

   try {
       const result = await daobot.claim_test_coin(address);
       const signature = builder.signMessage(result.messages[0].message, 0);
       const witnessArgs = { lock: signature };
       const tx = result.tx;
       const witness = builder.serializeWitness(witnessArgs);
       tx.witnesses[0] = witness;
       const data = await builder.send_tx(tx);
       return res.json({ status: 'ok', data: data });
   } catch (error) {
       return res.json({status:'failed', data: error.message})
   }
});


/* 

the pre-required contract used in this demo includes 3 different ones
( meaning that you should have these 3 contracts deployed in your local blockchain before you run this demo )

    1. type-id contract
    2. the special lock contract (the one you wrote by capsule in this demo tutoricail)
    3. secp256k1_blake2b_sighash_all_duel contract (as sharing code import via dynamic loading)

the most common way to do that is to deploy all three contract using capsule. 
otherwise, if you don't have capsule installed in your local machine,   you can try with the following
function providing as an api fashion which give you a simple method to deploy the required contracts in your browser.

here is how:

    1. the source code(binary of the contract) is placed in /src/scripts-examples.
    2. the deployment use the first wallet in ../src/config/user.json, 
       so make sure you have set up the user.json config file correctly.
    3. you should uncomment the router, open your browser, and enter the router url to run the function.
       eg: 
           you can access http://localhost:5000/deploy?f=type_id in your browser to deploy the type_id contract
           you can access http://localhost:5000/deploy?f=nervos-dao-extended-ownership-script in your browser to
            deploy the special lock contract 
           you can access http://localhost:5000/deploy?f=secp256k1_blake2b_sighash_all_duel in your browser to 
           deploy the dynamic loading sharing contract 
    
    4. after deployment, you will see the tx_hash return in your browser. the outpoint of the contract cell 
       is the tx_hash + 0 index by default.
    5. write down the tx_hash, and replace value in ../src/config/dev_config.json 's PUPPET_TYPE_ID / DAO_SPECIAL_LOCK
        / DAO_SPECIAL_LOCK_DEP 's tx_hash.

    6. for code_hash, you can use /get_code_hash router to request.

===== uncomment the following router if you need to init the contract deployment first =====

app.get( "/deploy", async ( req, res ) => {
    const fname = ''+req.query.f;
    const contract = builder.readContractCodeByFileName(fname);
    const result = await daobot.deploy_contract(User.account[0].testnet, contract.code, contract.length);
    const signature = builder.signMessage(result.messages[0].message, 0);
    const witnessArgs = { lock: signature };
    const tx = result.tx;
    try {
        const witness = builder.serializeWitness(witnessArgs);
        tx.witnesses[0] = witness;
        const data = await builder.send_tx(tx);
        return res.json({ status: 'ok', data: data });
    }
    catch (error) {
        console.log(error);
        return res.json({ status: 'failed', data: error.message });
    }
});

app.get("/deploy_dep_group", async (req, res) => {
    const outpoints = [
        // replace with your special lock outpoint
        {
            tx_hash: '0x70e4decd47a460e8a50b86c29efdbcf4219420e7782b9b948b1e5e452e2d5921', 
            index: '0',
        },
        // replace with your secp256k1_blake2b_sighash_all_duel  outpoint
        {
            tx_hash: '0x830b62f0820c4339da104dd3ee85d9e8d2ece47435d2314e9b837e9450909eca', 
            index: '0',
        }
    ]
    const code = await builder.generateDepGroupOutputData(outpoints);
    console.log(code);
    const length = (code.length - 2) / 2;
    const result = await daobot.deploy_contract(User.account[0].testnet, code, length);
    const signature = builder.signMessage(result.messages[0].message, 0);
    const witnessArgs = { lock: signature };
    const tx = result.tx;
    try {
        const witness = builder.serializeWitness(witnessArgs);
        tx.witnesses[0] = witness;
        const data = await builder.send_tx(tx);
        return res.json({ status: 'ok', data: data });
    }
    catch (error) {
        console.log(error);
        return res.json({ status: 'failed', data: error.message });
    } 
});

app.get( "/get_code_hash", async ( req, res ) => {
    const fname = ''+req.query.f;
    const contract = builder.readContractCodeByFileName(fname);
    const code_hash = builder.generateCodeHash(contract.code);
    return res.json({status: 'ok', data: code_hash});
});

===== uncomment the above router if you need to init the contract deployment first =====
*/

app.listen( PORT, () => {
    console.log( `server started at http://localhost:${ PORT }` );
} );
