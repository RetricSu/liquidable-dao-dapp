import axios from 'axios';
import config from '../config/constant.json';
import utils from '../utils/index';
import type {
    Transaction,
    QueryOption, 
    RawTransaction, 
    WitnessArgs,
    HexString,
    Cell,
    DaoCellType
} from '../types/blockchain';
import type { SignedWitnessArgsType } from '../types/signing';

axios.defaults.withCredentials = true;

class Api{

    base_url: string;

    constructor(){
        this.base_url = utils.get_env_mode() === 'development' ? config.development_server_url : config.production_server_url;
    };

    async get_dao_pool_info(){
        let res = await axios.get(`${this.base_url}/dao_pool`);
        return res.data;
    }

    async listAllDaoCells(address: string, type: DaoCellType = 'deposit', limit: number = 10){
        let res = await axios.get(`${this.base_url}/list_all_dao_cells`, { 
            params:{
                address: address,
                type: type,
                limit: limit,
            }
        });
        return res.data;
    }

    async listSpecialDaoCells(address: string, type: DaoCellType = 'deposit', limit: number = 10){
        let res = await axios.get(`${this.base_url}/list_specail_dao_cells_by_address`, { 
            params:{
                address: address,
                type: type,
                limit: limit,
            }
        });
        return res.data;
    }

    async deposit(address: string, amount: BigInt){
        let res = await axios.get(`${this.base_url}/deposit_dao`, { 
            params:{
                address: address,
                amount: amount
            }
        });
        return res.data;
    }

    async special_deposit(address: string, amount: BigInt){
        let res = await axios.get(`${this.base_url}/deposit_special_dao`, { 
            params:{
                address: address,
                amount: amount
            }
        });
        return res.data;
    }

    async withdraw_normal_dao(address: string, cell: Cell){
        let res = await axios.get(`${this.base_url}/withdraw_normal_dao`, { 
            params:{
                address: address,
                cell: cell
            }
        });
        return res.data;
    }

    async withdraw_special_dao(address: string, dao_cell: Cell, puppet_cell: Cell){
        let res = await axios.get(`${this.base_url}/withdraw_special_dao`, { 
            params:{
                address: address,
                dao_cell: dao_cell,
                puppet_cell: puppet_cell,
            }
        });
        return res.data;
    }

    async unlock_normal_dao(from: string, to: string, cell: Cell){
        let res = await axios.get(`${this.base_url}/unlock_withdraw_dao`, { 
            params:{
                from: from,
                to: to,
                withdraw_cell: cell
            }
        });
        return res.data;
    }

    async unlock_special_dao(from: string, to: string, dao_cell: Cell, puppet_cell: Cell){
        let res = await axios.get(`${this.base_url}/unlock_withdraw_dao`, { 
            params:{
                from: from,
                to: to,
                type: 'special',
                withdraw_cell: dao_cell,
                puppet_cell: puppet_cell,
            }
        });
        return res.data;
    }

    async transfer_dao(from: string, to: string, puppet_cell: Cell){
        let res = await axios.get(`${this.base_url}/transfer_puppet_cell`, { 
            params:{
                from: from,
                to: to,
                puppet_cell: puppet_cell,
            }
        });
        return res.data;
    }

    async get_normal_dao_capacity(address: string){
        let res = await axios.get(`${this.base_url}/get_normal_dao_capacity_by_address`, { 
            params:{
                address: address
            }
        });
        return res.data;
    } 
    
    async get_special_dao_capacity(address: string){
        let res = await axios.get(`${this.base_url}/get_special_dao_capacity_by_address`, { 
            params:{
                address: address
            }
        });
        return res.data;
    }

    async get_total_dao_capacity(address: string){
        let res = await axios.get(`${this.base_url}/get_total_dao_capacity_by_address`, { 
            params:{
                address: address
            }
        });
        return res.data;
    }

    async sendTxWithSignature(signature: string, tx: Transaction){
        let res = await axios.get(`${this.base_url}/send_tx_with_signature`, {
            params: {
                signature: signature,
                tx: tx
            }
        });
        return res.data;
    }

    async sendTxWithSignatures(signatures: Array<SignedWitnessArgsType>, tx: Transaction){
        let res = await axios.get(`${this.base_url}/send_tx_with_signatures`, {
            params: {
                signatures: signatures,
                tx: tx
            }
        });
        return res.data;
    }

    async claim_faucet(address: string){
        let res = await axios.get(`${this.base_url}/faucet`, {
            params: {
                address: address,
            }
        });
        return res.data;
    }
}

export default Api;
