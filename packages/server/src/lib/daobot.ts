import { Indexer, CellCollector, TransactionCollector } from "@ckb-lumos/indexer";
import { 
    createTransactionFromSkeleton,
    sealTransaction,
    transactionSkeletonToObject,
    objectToTransactionSkeleton,
    TransactionSkeleton, 
    parseAddress} from "@ckb-lumos/helpers";
import { secp256k1Blake160, dao, common } from "@ckb-lumos/common-scripts";
import type { 
    QueryOptions,
    OutPoint,
    Cell,
    Script,
    Transaction,
    Input,
} from "@ckb-lumos/base";
import { utils } from "@ckb-lumos/base";
import * as User from "../config/user.json";
import * as pjConfig from "../config/const.json";
import * as chainConfig from "../config/dev_cofig.json";
import { get_env_mode } from "./helper";
import { Builder } from "./builder";
import { getConfig } from "@ckb-lumos/config-manager";
import { isNullOrUndefined } from "util";
const Config = get_env_mode() === 'development' ?  chainConfig.development : chainConfig.production;


// the return type when you create a tx but needs to send it to user for signing to complete.
export type ReadyTxType = {
    messages: {
        type: string;
        index: number;
        message: string;
    }[]
    tx: Transaction
} 

export type daobotType = {
    ListType: "all" | "deposit" | "withdraw"
}

export class DaoBot {

    private indexer;
    private min_fee;
    private min_dao_capacity;
    private min_special_dao_capacity;
    private min_puppet_cell_capacity;
    private max_claim_coin;

    constructor(indexer: Indexer){
        this.indexer = indexer;
        this.min_fee = 100000000n; //shanon
        this.min_dao_capacity = 12200000000n; // 122 ckb
        this.min_special_dao_capacity = 12000000000n;// 122 ckb
        this.min_puppet_cell_capacity = 16400000000n; //164 ckb 
        this.max_claim_coin = 1000000000000n; // 10000 ckb
    }

    async get_dao_pool_info(){
        var total_cells = 0;
        var total_capacity = BigInt(0);
        var address_list: Array<string> = [];
        //todo: complete following caculations
        var averageDepositTime = 0;// hours
        var claimedCompensation = BigInt(0);
        var estimatedAPR = 0; // % percentage

        const query: QueryOptions = {
            type: {
                code_hash: Config.SCRIPTS.DAO.CODE_HASH,
                hash_type: Config.SCRIPTS.DAO.HASH_TYPE === "type" ? "type" : "data",
                args: '0x',
            }
        }
        const cellCollector = new CellCollector(this.indexer, query);//order: 'desc'
        for await(const cell of cellCollector.collect()){
            total_cells++;
            total_capacity += BigInt(cell.cell_output.capacity);
            
            if(!address_list.includes(cell.cell_output.lock.args)){ 
                // estimate total, did not caculate the overlap with special NervosDAO
                address_list.push(cell.cell_output.lock.args);
            }
        } 

        return {
            total_cells: total_cells,
            total_capacity: total_capacity.toString(),
            total_address: address_list.length,
            averageDepositTime: averageDepositTime,
            claimedCompensation: claimedCompensation.toString(),
            estimatedAPR: estimatedAPR,
        }
    }

    async deposit(amount: bigint, from: string, to: string): Promise<any> {
        var skeleton = TransactionSkeleton({ cellProvider: this.indexer });
        skeleton = await dao.deposit(skeleton, from, to, amount);
        skeleton = await secp256k1Blake160.payFee(skeleton, from, this.min_fee);
        skeleton = secp256k1Blake160.prepareSigningEntries(skeleton);
        return {
            messages: skeleton.get("signingEntries").toArray(),
            tx: createTransactionFromSkeleton(skeleton)
        };
    }

    async list_dao_cells(address: string, type: daobotType["ListType"], limit: number = 10){
        var total = 0;
        var dao_cells = [];
        const cellCollector = new dao.CellCollector(
          address,
          this.indexer,
          type,
        )
        for await (const cell of cellCollector.collect()) {
            total++;

            if(total >= limit){
                break;
            }else{
                dao_cells.push(cell);
            }
        }
        return dao_cells;
    }

    async list_puppet_cells(address: string, limit: number = 100){
        var puppet_cells = [];
        var puppet_type_hashes = [];
        const lock_script = parseAddress(address, {config: getConfig()});
        const cellCollector = new CellCollector(this.indexer, {
            lock: lock_script
        });//order: 'desc'
        for await(const cell of cellCollector.collect()){
            if(cell.cell_output.type?.code_hash === Config.SCRIPTS.PUPPET_TYPE_ID.CODE_HASH){
                puppet_cells.push(cell);
                puppet_type_hashes.push(utils.computeScriptHash(cell.cell_output.type));
            }
            
            if(puppet_cells.length >= limit){
                break;
            }
        };
        return {puppet_cells: puppet_cells, hash_list: puppet_type_hashes};
    }

    async list_special_dao_cells(address: string, type: daobotType["ListType"], limit: number = 100){
        // todo: [bug] if you have more than 100 puppet cell, 
        // chance is that it might not be able to find the pairning dao cells 
        // due to the default limit param.

        var dao_cells = [];
        var dao_pairing_puppet = [];
        const {puppet_cells, hash_list} = await this.list_puppet_cells(address);

        const daoTypeScript: Script = {
            code_hash: Config.SCRIPTS.DAO.CODE_HASH,
            hash_type: Config.SCRIPTS.DAO.HASH_TYPE === "data" ? "data" : "type",
            args: "0x",
        };
        const cellCollector = new CellCollector(this.indexer, {
            type: daoTypeScript
        });
        for await(const cell of cellCollector.collect()){
            const cell_lock = cell.cell_output.lock;
            // locate special dao cell
            if(cell_lock.code_hash === Config.SCRIPTS.DAO_SPECIAL_LOCK.CODE_HASH){
                // if the dao cell special lock's args is in puppet cell list, 
                // then we got one special dao cell.
                if(hash_list.includes(cell_lock.args) && this.checkDaoType(cell, type) ){
                    dao_cells.push(cell);
                    // don't forget to push the puppet cell paired with dao cell
                    const id = hash_list.findIndex(hash => hash === cell_lock.args);
                    dao_pairing_puppet.push( puppet_cells[id] );
                }
            }

            if(dao_cells.length >= limit)
                break;
        }
        return {dao_cells: dao_cells, puppet_cells: dao_pairing_puppet};
    }

    checkDaoType(cell: Cell, type: daobotType["ListType"]): boolean{
        if(type==="all")return true;

        return this.getDaoType(cell) === type;
    }

    getDaoType(cell: Cell): daobotType["ListType"]{
        if(cell.data === "0x"+"0".repeat(16))
            return "deposit";
        else 
            return "withdraw"; 
    }

    async caculate_normal_dao_capacity(address: string): Promise<bigint> {
        var total = BigInt(0);
        const collector = new dao.CellCollector(address, this.indexer, 'all');
        for await( const cell of collector.collect()){
            total = total + BigInt(cell.cell_output.capacity);
        }
        return total;
    }

    async caculate_special_dao_capacity(address: string): Promise<bigint> {
        const {dao_cells} = await this.list_special_dao_cells(address, 'all', 100);
        var total = BigInt(0);
        for(const cell of dao_cells){
            total = total + BigInt(cell.cell_output.capacity);
        }
        return total;
    }

    async caculate_total_dao_capacity(address: string): Promise<bigint> {
        var total = BigInt(0);
        const normal_capacity = await this.caculate_normal_dao_capacity(address);
        const special_capacity = await this.caculate_special_dao_capacity(address);    
        total = normal_capacity + special_capacity;
        return total;
    }

    async getMaxWithdrawCapacity(address: string) {
       //dao.calculateMaximumWithdraw()
       //dao.calculateDaoEarliestSince()
    }

    async withdraw(address: string, cell: Cell): Promise<ReadyTxType> {
        var skeleton = TransactionSkeleton({ cellProvider: this.indexer });
        skeleton = await dao.withdraw(skeleton, cell);
        skeleton = await secp256k1Blake160.payFee(skeleton, address, this.min_fee);
        skeleton = secp256k1Blake160.prepareSigningEntries(skeleton);
        return {
            messages: skeleton.get("signingEntries").toArray(),
            tx: createTransactionFromSkeleton(skeleton),
        };
    }

    async special_withdraw(address: string, _dao_cell: Cell, puppet_cell: Cell): Promise<ReadyTxType>{
       

        const dao_cell = _dao_cell
        const dao_lock_args = _dao_cell.cell_output.lock.args;

        var skeleton = TransactionSkeleton({ cellProvider: this.indexer });
        skeleton = await secp256k1Blake160.payFee(skeleton, address, this.min_fee);

        skeleton = skeleton.update('inputs', (inptus) => inptus.push(puppet_cell));
        skeleton = skeleton.update('outputs', (outputs) => outputs.push(puppet_cell));
        
        var fake_normal_dao_cell: Cell = dao_cell;
        
        fake_normal_dao_cell.cell_output.lock = {
            code_hash: Config.SCRIPTS.SECP256K1_BLAKE160.CODE_HASH,
            hash_type: Config.SCRIPTS.SECP256K1_BLAKE160.HASH_TYPE === "type" ? "type" : "data",
            args: puppet_cell.data,
        };
        //console.log(_dao_cell);
        skeleton = await dao.withdraw(skeleton, fake_normal_dao_cell);
        const dao_cell_id: number = skeleton.inputs.count() - 1;
        skeleton = skeleton.update('inputs', (inputs) => inputs.update(dao_cell_id, () => dao_cell));

        var output_dao_cell = {...dao_cell, ...{data: skeleton.outputs.get(dao_cell_id)!.data}};
        output_dao_cell.cell_output.lock.args = dao_lock_args;
        output_dao_cell.cell_output.lock.code_hash = Config.SCRIPTS.DAO_SPECIAL_LOCK.CODE_HASH;
        output_dao_cell.cell_output.lock.hash_type = Config.SCRIPTS.DAO_SPECIAL_LOCK.HASH_TYPE === "type" ? "type" : "data"; 
        console.log(output_dao_cell); 
        skeleton = skeleton.update('outputs', (outputs) => outputs.update(dao_cell_id, () => output_dao_cell));
        skeleton = skeleton.update('cellDeps', (celldeps) => celldeps.push(
            {
                 out_point: {
                     tx_hash: Config.SCRIPTS.PUPPET_TYPE_ID.TX_HASH,
                     index: Config.SCRIPTS.PUPPET_TYPE_ID.INDEX
                 },
                 dep_type: Config.SCRIPTS.PUPPET_TYPE_ID.DEP_TYPE === "code" ? "code" : "dep_group",
            },
            {
                out_point: {
                    tx_hash: Config.SCRIPTS.DAO_SPECIAL_LOCK_DEP.TX_HASH,
                    index: Config.SCRIPTS.DAO_SPECIAL_LOCK_DEP.INDEX
                },
                dep_type: Config.SCRIPTS.DAO_SPECIAL_LOCK_DEP.DEP_TYPE === "code" ? "code" : "dep_group",
            })
        );

        skeleton = secp256k1Blake160.prepareSigningEntries(skeleton);
        // let's replace the special dao signing entry with tx_hash.
        const builder = new Builder();
        skeleton = skeleton.update("signingEntries", (signingEntries) => 
            signingEntries.set(dao_cell_id, {
                type: 'witness_args_lock',
                index: dao_cell_id,
                message: builder.generateTxHash(createTransactionFromSkeleton(skeleton))
            })
        );
        //console.log(skeleton.get("signingEntries").toArray()); 
        return {
            messages: skeleton.get("signingEntries").toArray(),
            tx: createTransactionFromSkeleton(skeleton),
        };
    }

    async unlock_withdraw(from_info: string, to: string, deposit_cell: Cell, withdraw_cell: Cell): Promise<ReadyTxType> {
        var skeleton = TransactionSkeleton({ cellProvider: this.indexer });
        skeleton = await secp256k1Blake160.payFee(skeleton, from_info, this.min_fee);
        skeleton = await dao.unlock(skeleton, deposit_cell, withdraw_cell, to, from_info);
        skeleton = secp256k1Blake160.prepareSigningEntries(skeleton);
        return {
            messages: skeleton.get("signingEntries").toArray(),
            tx: createTransactionFromSkeleton(skeleton),
        }; 
    }

    async unlock_special_withdraw(from_info: string, to: string, deposit_cell: Cell, withdraw_cell: Cell, puppet_cell: Cell): Promise<ReadyTxType> {
        var skeleton = TransactionSkeleton({ cellProvider: this.indexer });
        skeleton = await secp256k1Blake160.payFee(skeleton, from_info, this.min_fee);
        skeleton = await secp256k1Blake160.setupInputCell(skeleton, puppet_cell);
        // add puppet cell and its celldep into tx
        // skeleton = skeleton.update('inputs', (inputs) => inputs.push(puppet_cell));
        // update outputs with one cell just as same as puppet cell
        // skeleton = skeleton.update('outputs', (outputs) => outputs.push(puppet_cell));
        //todo: re-write
        skeleton = skeleton.update('cellDeps', (celldeps) => celldeps.push({
            out_point: {
                tx_hash: Config.SCRIPTS.PUPPET_TYPE_ID.TX_HASH,
                index: Config.SCRIPTS.PUPPET_TYPE_ID.INDEX,
            },
            dep_type: Config.SCRIPTS.PUPPET_TYPE_ID.DEP_TYPE === "code" ? "code" : "dep_group",
        }));
        var fake_normal_dao_cell: Cell = withdraw_cell;
        fake_normal_dao_cell.cell_output.lock = {
            code_hash: Config.SCRIPTS.SECP256K1_BLAKE160.CODE_HASH,
            hash_type: Config.SCRIPTS.SECP256K1_BLAKE160.HASH_TYPE === "type" ? "type" : "data",
            args: '0x'+'0'.repeat(20)//place a different address to reserve place for signature   //puppet_cell.data,
        };
        skeleton = await dao.unlock(skeleton, deposit_cell, fake_normal_dao_cell, to, from_info);
        const dao_cell_id: number = skeleton.inputs.count() - 1;
        skeleton = skeleton.update('inputs', (inputs) => inputs.update(dao_cell_id, () => withdraw_cell));
        skeleton = skeleton.update('cellDeps', (celldeps) => celldeps.push(
            {
                out_point: {
                    tx_hash: Config.SCRIPTS.DAO_SPECIAL_LOCK_DEP.TX_HASH,
                    index: Config.SCRIPTS.DAO_SPECIAL_LOCK_DEP.INDEX
                },
                dep_type: Config.SCRIPTS.DAO_SPECIAL_LOCK_DEP.DEP_TYPE === "code" ? "code" : "dep_group",
            })
        );
         
        skeleton = secp256k1Blake160.prepareSigningEntries(skeleton);
        // let's replace the special dao signing entry with tx_hash.
        console.log(skeleton.get("signingEntries").toArray())
        const builder = new Builder();
        skeleton = skeleton.update("signingEntries", (signingEntries) => 
            {
                for(const se of signingEntries){
                    if(se.index === dao_cell_id){

                        return signingEntries.set(signingEntries.indexOf(se), {
                            type: 'witness_args_lock',
                            index: dao_cell_id,
                            message: builder.generateTxHash(createTransactionFromSkeleton(skeleton))
                        })
                    }
                }
                return signingEntries;
            }
        );
        return {
            messages: skeleton.get("signingEntries").toArray(),
            tx: createTransactionFromSkeleton(skeleton),
        }; 
    }

    async filterDepositCell(cells: Cell[], withdraw_cell: Cell){
        for await( const cell of cells){
            if(
                cell.cell_output.capacity === withdraw_cell.cell_output.capacity &&

                cell.cell_output.lock.code_hash === withdraw_cell.cell_output.lock.code_hash &&
                cell.cell_output.lock.args === withdraw_cell.cell_output.lock.args &&
                cell.cell_output.lock.hash_type === withdraw_cell.cell_output.lock.hash_type &&

                cell.cell_output.type?.code_hash === withdraw_cell.cell_output.type?.code_hash &&
                cell.cell_output.type?.args === withdraw_cell.cell_output.type?.args &&
                cell.cell_output.type?.hash_type === withdraw_cell.cell_output.type?.hash_type
            ){
                return cell;
            }
        }

        return undefined;
    }

    async transfer_puppet_cell(cell: Cell, from: string, to: string, unlock_dao_public_key?: string): Promise<ReadyTxType>{
        var skeleton = TransactionSkeleton({ cellProvider: this.indexer });
        skeleton = await secp256k1Blake160.payFee(skeleton, from, this.min_fee);
        skeleton = await secp256k1Blake160.setupInputCell(skeleton, cell, from);
        // update the output puppet cell to new owner
        const puppet_cell_id = createTransactionFromSkeleton(skeleton).outputs.length - 1;
        const to_lock_script = parseAddress(to, {config: getConfig()});
        // var new_puppet_cell = cell;
        // new_puppet_cell.cell_output.lock = to_lock_script;
        // new_puppet_cell.data = unlock_dao_public_key || to_lock_script.args;
        // todo: here is a bug so use below ugly dum methods.
        skeleton = skeleton.update('outputs', (outputs) => outputs.set(puppet_cell_id, {
            cell_output: {
                capacity: cell.cell_output.capacity,
                lock: {
                    code_hash: cell.cell_output.lock.code_hash,
                    hash_type: cell.cell_output.lock.hash_type,
                    args: to_lock_script.args,
                },
                type: cell.cell_output.type,
            },
            data: unlock_dao_public_key || to_lock_script.args,
            block_hash: cell.block_hash,
            out_point: cell.out_point
        }));
        skeleton = skeleton.update('cellDeps', (celldeps) => celldeps.push({
            out_point: {
                tx_hash: Config.SCRIPTS.PUPPET_TYPE_ID.TX_HASH,
                index: Config.SCRIPTS.PUPPET_TYPE_ID.INDEX,
            },
            dep_type: Config.SCRIPTS.PUPPET_TYPE_ID.DEP_TYPE === "code" ? "code" : "dep_group",
        }));
        
        skeleton = secp256k1Blake160.prepareSigningEntries(skeleton);
        return {
            messages: skeleton.get("signingEntries").toArray(),
            tx: createTransactionFromSkeleton(skeleton),
        };  
    }

    // utils function
    caculate_apr(){

    }

    caculate_earning(){

    }

    async generate_puppet_cell(from: string, to: string): Promise<ReadyTxType> {
        var skeleton = TransactionSkeleton({ cellProvider: this.indexer });
        skeleton = await common.transfer(skeleton, [from], to, this.min_puppet_cell_capacity);
        skeleton = await common.payFee(skeleton, [from], this.min_fee);
        skeleton = common.prepareSigningEntries(skeleton);
        return {
            messages: skeleton.get("signingEntries").toArray(),
            tx: createTransactionFromSkeleton(skeleton),
        };    
    }

    async deposit_with_special_lock(amount: bigint, from: string, to: string): Promise<ReadyTxType> {
        var skeleton = TransactionSkeleton({ cellProvider: this.indexer });
        
        // prepare for puppet cell
        skeleton = await secp256k1Blake160.payFee(skeleton, from, this.min_fee);
        // console.log(from, to, BigInt(this.min_fee), JSON.stringify(createTransactionFromSkeleton(skeleton), null, 2));
        skeleton = await secp256k1Blake160.transfer(skeleton, from, from, this.min_puppet_cell_capacity);
        // console.log(from, to, BigInt(this.min_puppet_cell_capacity), JSON.stringify(createTransactionFromSkeleton(skeleton), null, 2));
        // let's edit some details to form the puppet cell with type id.
        var puppet_tx = transactionSkeletonToObject(skeleton);
        const puppet_input_id = puppet_tx.inputs.length - 1;
        const puppet_id = puppet_tx.outputs.length - 1;
        var puppet_output_cell = puppet_tx.outputs[puppet_id].cell_output;
        const builder = new Builder();
        const first_input_arg = {
            previous_output: {
                tx_hash: puppet_tx.inputs[puppet_input_id].out_point?.tx_hash || '',
                index: puppet_tx.inputs[puppet_input_id].out_point?.index || '',
            },
            since: skeleton.inputSinces.get(0) || '0x0'
        }
        puppet_output_cell.type = {
            code_hash: Config.SCRIPTS.PUPPET_TYPE_ID.CODE_HASH,
            hash_type: Config.SCRIPTS.PUPPET_TYPE_ID.HASH_TYPE === 'data' ? 'data' : 'type',
            args: builder.generateTypeIDArgs(first_input_arg),
        }
        const puppet_type_hash = utils.computeScriptHash(puppet_output_cell.type);
        puppet_tx.outputs[puppet_id].cell_output.type = puppet_output_cell.type;
        puppet_tx.outputs[puppet_id].data = puppet_output_cell.lock.args;
        // remember to add type id script dep
        puppet_tx.cellDeps.push({
            out_point: {
                tx_hash: Config.SCRIPTS.PUPPET_TYPE_ID.TX_HASH,
                index: Config.SCRIPTS.PUPPET_TYPE_ID.INDEX,
            },
            dep_type: Config.SCRIPTS.PUPPET_TYPE_ID.DEP_TYPE == 'code' ? 'code' : 'dep_group',
        });
        skeleton = objectToTransactionSkeleton(puppet_tx);
      
        // prepare for dao cell
        skeleton = await dao.deposit(skeleton, from, to, amount);
        // let's edit some details to form the special dao cell.
        const tx = transactionSkeletonToObject(skeleton);
        // 1. take above pupept cell's type hash as dao_cell's special lock script args
        const dao_cell_id = tx.outputs.findIndex(output => output.cell_output.type?.code_hash === Config.SCRIPTS.DAO.CODE_HASH);
        const dao_cell = tx.outputs[dao_cell_id].cell_output;
        dao_cell.lock = {
            code_hash: Config.SCRIPTS.DAO_SPECIAL_LOCK.CODE_HASH,
            hash_type: Config.SCRIPTS.DAO_SPECIAL_LOCK.HASH_TYPE === 'data' ? 'data' : 'type',
            args: puppet_type_hash, 
        };
        tx.outputs[dao_cell_id].cell_output.lock = dao_cell.lock;
        // 2. re-transform to txSkeleton to generate signing messages and return to user.
        var my_tx_skeleton = objectToTransactionSkeleton(tx);
        // 3. now we can add pay fee
        // my_tx_skeleton = await secp256k1Blake160.payFee(my_tx_skeleton, from, this.min_fee);
        my_tx_skeleton = secp256k1Blake160.prepareSigningEntries(my_tx_skeleton);
        return {
            messages: my_tx_skeleton.get("signingEntries").toArray(),
            tx: createTransactionFromSkeleton(my_tx_skeleton),
        }; 
    }

    //# utils function
    get_min_dao_capacity(){
        return this.min_dao_capacity;
    } 

    get_min_special_dao_capacity(){
        return this.min_special_dao_capacity;
    }


    //# pre-required contract deployment
    async deploy_contract(from: string, contract_code: string, code_length: number | bigint | string): Promise<ReadyTxType> {
        var skeleton = TransactionSkeleton({ cellProvider: this.indexer });
        skeleton = await secp256k1Blake160.transfer(skeleton, from, from, BigInt(code_length+'00000000'));
        skeleton = await secp256k1Blake160.payFee(skeleton, from,  this.min_fee);
        // update the contract output_cell's data
        skeleton = skeleton.update('outputs', (output) => output.update(0, (cell) => {
            cell.data = contract_code;
            cell.cell_output.lock = {
                code_hash: pjConfig.BURNER_LOCK.code_hash,
                hash_type: pjConfig.BURNER_LOCK.hash_type === "data" ? "data" : "type",
                args: pjConfig.BURNER_LOCK.args,
            };
            return cell;
        }));
        skeleton = secp256k1Blake160.prepareSigningEntries(skeleton);
        return {
            messages: skeleton.get("signingEntries").toArray(),
            tx: createTransactionFromSkeleton(skeleton),
        };
    }

    //# faucet
    async claim_test_coin(to_addr: string): Promise<ReadyTxType>{
        var skeleton = TransactionSkeleton({ cellProvider: this.indexer });
        // the first wallet in user.json is miner
        const miner = User.account[0].testnet;
        skeleton = await secp256k1Blake160.transfer(skeleton, miner,  to_addr, this.max_claim_coin);
        skeleton = await secp256k1Blake160.payFee(skeleton, miner,  this.min_fee);
        skeleton = secp256k1Blake160.prepareSigningEntries(skeleton);
        return {
            messages: skeleton.get("signingEntries").toArray(),
            tx: createTransactionFromSkeleton(skeleton),
        };
    }
}