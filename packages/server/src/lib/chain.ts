import { Indexer, CellCollector, TransactionCollector } from "@ckb-lumos/indexer";
import type { 
    QueryOptions,
    OutPoint,
    Cell,
    TransactionWithStatus,
    Input
} from "@ckb-lumos/base";
import User from "../config/user.json";
import Const from "../config/const.json";
import Config from "../config/dev_cofig.json";
import { RPC } from "ckb-js-toolkit";
import utils from './utils';
import { get_env_mode } from './helper';
const { minimalCellCapacity, generateAddress, parseAddress } = require("@ckb-lumos/helpers")

export class Chain {
    private indexer;
    private rpc;

    constructor(){
        this.indexer = new Indexer(Const.RPC_URL, Const.DB_URL);
        this.indexer.startForever();
        this.rpc = new RPC(Const.RPC_URL);
    }

    getIndexer(){
        return this.indexer;
    }

    async getCellsFromInputs(inputs: Input[]): Promise<Cell[]> {
        const outpoints: OutPoint[] = inputs.map(i => i.previous_output );
        const cells = await this.getCellsFromOutpoints(outpoints);
        return cells;
    }

    async queryCell(query: QueryOptions, _limit?: number){
        const limit = _limit || 10;
        const cellCollector = new CellCollector(this.indexer, query);//order: 'desc'
        const result = [];
        for await(const cell of cellCollector.collect()){
            result.push(cell);
            if(result.length >= limit){
                break;
            }
        } 
        return result;
    }

    async getBalance(lock_args: string){
        /**   todo   */
        return 0;
    }

    async queryTransaction(query: QueryOptions, _limit?: number){
        const limit = _limit || 10;
        const txColletor = new TransactionCollector(this.indexer, query);
        const result = [];
        for await(const cell of txColletor.collect()){
            result.push(cell);
            if(result.length > limit){
                break;
            }
        } 
        return result;
    }

    async getInputCellsByOutpoints(
        outpoints: OutPoint[]
      ){
        const cells: Array<any> = [];

        const get_live_cell = async (num: number): Promise<Cell | undefined> => {
            const data = await this.rpc.get_live_cell(outpoints[num], true);
            if(data.status === "live"){
                let c: Cell = {...data.cell.output, ...{data: data.cell.data.content}};
                return c;
            }else{
                return undefined;
            }
        }

        let find_cells = utils.asyncGenerator(0, outpoints.length, get_live_cell);
        for await (let cell of find_cells) {
            if(cell !== undefined)
                cells.push(cell);
        }

        return cells;
    }

    // this function is different from above
    // because it can find the dead cells as well.
    async getCellsFromOutpoints(
        outpoints: OutPoint[]
      ){
        const cells: Array<any> = [];

        const get_cell = async (num: number): Promise<Cell | undefined> => {
            try {
                const tx = await this.getTransaction(outpoints[num].tx_hash);
                const output_cell = tx.transaction.outputs[Number(outpoints[num].index)];
                let c: Cell = { 
                            ...{data: tx.transaction.outputs_data[Number(outpoints[num].index)]}, 
                            ...{out_point: outpoints[num]}, 
                            ...{block_hash: tx.tx_status.block_hash},
                            ...{cell_output: output_cell}
                };
                return c;
            } catch (error) {
                return undefined;
            }
        }

        let find_cells = utils.asyncGenerator(0, outpoints.length, get_cell);
        for await (let cell of find_cells) {
            if(cell !== undefined)
                cells.push(cell);
        }
        return cells;
    }


    async getNewBlocks(limit: number){
        const height =  await this.rpc.get_tip_block_number();
        const blocks:Array<any> = [];

        const fetch = async (num: number)=> {
            const block_number = '0x' + (BigInt(height) - BigInt(num)).toString(16);
            const block = await this.rpc.get_block_by_number(block_number);
            return block;
        }

        let fetching_blocks = utils.asyncGenerator(0, limit, fetch);
        for await (let block of fetching_blocks) {
            blocks.push(block);
        }
        return blocks;
    }

    async getTransaction(tx_hash: string): Promise<TransactionWithStatus> {
        const tx = await this.rpc.get_transaction(tx_hash);
        return tx;
    }

    async getBlockByHash(block_hash: string){
        const block = await this.rpc.get_block(block_hash);
        return block;
    }

    queryWallet(){

    }

    queryCellMetaData(){
        
    }

    queryScript(){

    }

    getChainConfig(){
        return get_env_mode() === 'development' ? Config.development : Config.production;
    }

    getWallets(){
        return User.account;
    }

    getWalletById(id: number){
        return User.account[id];
    }

    getMinimalCapacity(cell: Cell){
        return minimalCellCapacity(cell);
    }
}