/**
 * 
    _    ____ ____ ____ _  _    ____ _  _ ___     ___  _   _    _  _ ____ _  _ ___  
    |    |___ |__| |__/ |\ |    |    |_/  |__]    |__]  \_/     |__| |__| |\ | |  \ 
    |___ |___ |  | |  \ | \|    |___ | \_ |__]    |__]   |      |  | |  | | \| |__/ 
 * 
 * The popurse of this code is to help developers gain a better understanding
 * about how CKB works by allowing them construct a raw transaction purely by their
 * hands and then serializes the tx and uplpad to blockchain. To learn more about the 
 * whole life cycle of how Transaction got processed in CKB, compares to Bitcoin and 
 * Ethereum, don't forget to check out the following links.
 * 
 * - https://docs.nervos.org/docs/essays/rules
 * - https://github.com/nervosnetwork/ckb-system-scripts/wiki/How-to-sign-transaction
 * - https://docs.ckb.dev/docs/rfcs/0022-transaction-structure/0022-transaction-structure#transaction-hash
 * 
 * ## pre-reqiured
 * 
 * - generate a couple brand new wallet accounts using the command tool ckb-cli
 * - run a CKB devnet on local.
 * - pass the wallets info to /src/user.json. (including password, so !!!do NOT use this wallet in production!!!)
 * 
 * ## useage example 
 *      
        import { Builder } from "./builder";

        // construct the following args 
        // purely by your hand and your mind.

        const raw_tx: RawTransaction;
        const witness_args: WitnessArgs[];
        const input_cells: Cell[];

        // pass the three args above to builder 
        // to generate a real transaction
        // and even to send it out to blockchain!(by RPC)

        const builder = new Builder();
        const tx = builder.sign_P2PKH(raw_tx, witness_args, input_cells);
        const txhash = await builder.send_tx(tx);
        console.log(txhash);
 */
import path from "path";
import fs from "fs";
import * as chainConfig from "../config/dev_cofig.json";
import * as Const from "../config/const.json";
import * as User from "../config/user.json";
import { RPC, validators, normalizers, transformers, Reader } from "ckb-js-toolkit";
import {
  core,
  utils,
  Input,
  Output,
  CellDep,
  Hash,
  Script,
  WitnessArgs,
  OutPoint,
  HexString,
  Transaction,
  RawTransaction,
} from "@ckb-lumos/base";
import { key } from "@ckb-lumos/hd";
import { serializeBigInt, toBigUInt64LE, buf2hex } from "./helper";
import { get_env_mode } from './helper';
import { builtinModules } from "module";

const { CKBHasher, ckbHash } = utils;
const Config = get_env_mode() === 'development' ?  chainConfig.development : chainConfig.production;

export type signingEntries = {
  index: number
  message: HexString
  type: "witness_args_lock" | "witness_args_input_type" | "witness_args_output_type"
}

export type signedWitnessArgsType = {
  index: number
  signature: HexString
  type: "witness_args_lock" | "witness_args_input_type" | "witness_args_output_type"
}

export interface Message {
  index: number;
  message: HexString;
  lock: Script;
}

export interface Cell {
  capacity: HexString;
  lock: Script;
  type?: Script;
  data: HexString;
  out_point?: OutPoint;
}

export interface InputsGroup {
  hash: string;
  child: number[];
}

export interface MultisigScript {
  S: number;
  R: number;
  M: number;
  N: number;
  publicKeyHashes: string[];
}

export type ContractMode = "normal" | "test" | "upgradable";
export type TypeIDConfig = {
  code_hash: HexString,
  hash_type: "type"
}


// todo
// [ ]: improve the capacity caculation, repalce the current hard-code method
// [ ]: improve the tx-fee estimate, repalce the current hard-code method
// [ ]: extract the same interface and type to a single file for better code structure and code sharing
export class Builder {
  private hasher;

  constructor() {
    this.hasher = new CKBHasher();
  }

  sign_P2PKH(
    raw_tx: RawTransaction,
    witnessArgs: WitnessArgs[],
    inputCells: Cell[],
    account_id = 0
  ): Transaction {
    const messages: Message[] = [];
    const signedWitness: HexString[] = [];

    // 0. group the input with same lock script for witness
    const input_groups = this.groupInputs(inputCells);

    for (let i = 0; i < input_groups.length; i++) {
      const group_index = input_groups[i].child[0];

      //reserve dummy lock for the first witness
      const dummy_lock = "0x" + "0".repeat(130);
      let witness_args = witnessArgs[group_index];
      witness_args.lock = dummy_lock;

      this.hasher = new CKBHasher();

      // 1. hash the txHash
      const tx_hash = this.generateTxHash(raw_tx);
      this.hasher.update(tx_hash);

      // 2. hash the witness in groups order.
      // - 2.1 hash the first witness in group
      const firstWitness = new Reader(this.serializeWitness(witness_args));
      this.hasher.update(serializeBigInt(firstWitness.length()));
      this.hasher.update(firstWitness);
      // - 2.2 hash the rest of witness in the same group
      for (let j = 1; j < input_groups[i].child.length; j++) {
        const witness_index = input_groups[i].child[j];
        let witness_args_in_group = witnessArgs[witness_index];
        const witeness_in_group = new Reader(
          this.serializeWitness(witness_args_in_group)
        );
        this.hasher.update(serializeBigInt(witeness_in_group.length()));
        this.hasher.update(witeness_in_group);
      }
      // - 2.3 hash the witness which do not in any input group
      for (let k = raw_tx.inputs.length; k < witnessArgs.length; k++) {
        let witness_args_alone = witnessArgs[k];
        const witeness_alone = new Reader(
          this.serializeWitness(witness_args_alone)
        );
        this.hasher.update(serializeBigInt(witeness_alone.length()));
        this.hasher.update(witeness_alone);
      }

      // 3. generate the sign-message, ready to be signed.
      const sig_hash = this.hasher.digestHex();
      messages.push({
        index: i,
        message: sig_hash, // hex string
        lock: inputCells[i].lock,
      });

      // 4. sign tx
      const signature = this.signMessage(sig_hash, account_id = account_id);

      // 5. put the signature back to the first witness of the group.
      witness_args.lock = signature;
      signedWitness[group_index] = this.serializeWitness(witness_args);
    }
    // 6. return the complete tx which can be uploaded on-chain directly through rpc.
    return { ...raw_tx, ...{ witnesses: signedWitness } };
  }

  sign_Multisig(
    raw_tx: RawTransaction,
    multisigScript: MultisigScript,
    witnessArgs: WitnessArgs[],
    inputCells: Cell[],
    account_ids: number[]
  ){
    /** to do */
    const messages: Message[] = [];
    const signedWitness: HexString[] = [];

    const M = multisigScript.M;

    // 0. group the input with same lock script for witness
    const input_groups = this.groupInputs(inputCells);

    for (let i = 0; i < input_groups.length; i++) {
      const group_index = input_groups[i].child[0];

      const serializedMultisigScript = this.serializeMultisigScript(multisigScript);
      //const multisigScriptHash = this.generateMultisigScriptHash(serializedMultisigScript);
      const dummy_lock = serializedMultisigScript + "0".repeat(130 * M);
      let witness_args = witnessArgs[group_index];
      witness_args.lock = dummy_lock;

      this.hasher = new CKBHasher();

      // 1. hash the txHash
      const tx_hash = this.generateTxHash(raw_tx);
      this.hasher.update(tx_hash);

      // 2. hash the witness in groups order.
      // - 2.1 hash the first witness in group
      const firstWitness = new Reader(this.serializeWitness(witness_args));
      this.hasher.update(serializeBigInt(firstWitness.length()));
      this.hasher.update(firstWitness);
      // - 2.2 hash the rest of witness in the same group
      for (let j = 1; j < input_groups[i].child.length; j++) {
        const witness_index = input_groups[i].child[j];
        let witness_args_in_group = witnessArgs[witness_index];
        const witeness_in_group = new Reader(
          this.serializeWitness(witness_args_in_group)
        );
        this.hasher.update(serializeBigInt(witeness_in_group.length()));
        this.hasher.update(witeness_in_group);
      }
      // - 2.3 hash the witness which do not in any input group
      for (let k = raw_tx.inputs.length; k < witnessArgs.length; k++) {
        let witness_args_alone = witnessArgs[k];
        const witeness_alone = new Reader(
          this.serializeWitness(witness_args_alone)
        );
        this.hasher.update(serializeBigInt(witeness_alone.length()));
        this.hasher.update(witeness_alone);
      }

      // 3. generate the sign-message, ready to be signed.
      const sig_hash = this.hasher.digestHex();
      messages.push({
        index: i,
        message: sig_hash, // hex string
        lock: inputCells[i].lock,
      });
      console.log(sig_hash);
      this.hasher = new CKBHasher();

      // 4. sign tx with each account
      for(let l=0;l<account_ids.length;l++){
        const signature = this.signMessage(sig_hash, account_ids[l]);

        // 5. put the signature back to the first witness of the group.
        const sig_offset = serializedMultisigScript.length + l * 130;
        witness_args.lock = witness_args.lock?.substring(0, sig_offset) + signature.slice(2) + witness_args.lock?.substring(sig_offset+130);
      }

      signedWitness[group_index] = this.serializeWitness(witness_args);
    }
    // 6. return the complete tx which can be uploaded on-chain directly through rpc.
    return { ...raw_tx, ...{ witnesses: signedWitness } };
  }

  sign_CustomTypeScript(
    raw_tx: RawTransaction,
    witnessArgs: WitnessArgs[]
  ){
    
  }

  deploy_contract(
    compiled_code: HexString, // the smart contract code compiled into hex string
    length: number, // how much the output cell which contains the actual contract code needs
    raw_tx_without_output: RawTransaction,
    input_cells: Cell[],
    mode: ContractMode,
    account_id = 0,
    tx_fee = 1 // uint: ckb
  ): Transaction{
    if(mode === "upgradable")
      return this.deploy_upgradable_contract(compiled_code, length, raw_tx_without_output, input_cells, account_id, tx_fee);

    // first let's complete the raw transaction with outputs and output-data
    if(mode === "normal"){ 
      // contract is immutable in normal mode
      raw_tx_without_output.outputs[0] = {
        capacity: '0x' + (BigInt(length + 100) * 100000000n).toString(16),
        lock: {
          code_hash: Const.BURNER_LOCK.code_hash,
          args: Const.BURNER_LOCK.args,
          hash_type: Const.BURNER_LOCK.hash_type === "type"?"type":"data"
        }
      };
      raw_tx_without_output.outputs_data[0] = compiled_code;

    }else{
      // in test mode, the contract cell can be consumed like normal cell by owner
      raw_tx_without_output.outputs[0] = {
        capacity: '0x' + (BigInt(length + 100) * 100000000n).toString(16),
        lock: {
          code_hash: Config.SCRIPTS.SECP256K1_BLAKE160.CODE_HASH,
          args: User.account[account_id].lock_arg,
          hash_type: Config.SCRIPTS.SECP256K1_BLAKE160.HASH_TYPE == "type"?"type":"data"
        }
      };
      raw_tx_without_output.outputs_data[0] = compiled_code;

    }

    // after construct the contract cell, let's give the rest money back to owner
    const remain_balance = BigInt(input_cells[0].capacity) - BigInt(raw_tx_without_output.outputs[0].capacity) - BigInt(tx_fee) * 100000000n;
    if( remain_balance > 0 ){
      raw_tx_without_output.outputs[1] = {
        capacity: '0x' + remain_balance.toString(16),
        lock: {
          code_hash: Config.SCRIPTS.SECP256K1_BLAKE160.CODE_HASH,
          args: User.account[account_id].lock_arg,
          hash_type: Config.SCRIPTS.SECP256K1_BLAKE160.HASH_TYPE == "type"?"type":"data"
        }
      }
      raw_tx_without_output.outputs_data[1] = '0x';
    }

    // now we can sign this tx and ready to send it through RPC.
    const witnessArgs: WitnessArgs[] = [{
      lock: '0x'
    }]
    const tx = this.sign_P2PKH(raw_tx_without_output, witnessArgs, input_cells, account_id = account_id);
    return tx;
  }

  /**
   * use type id to deploy a unique type hash and upgradable contract
   * only support one type-id each time(so the first output index is set to 0)
   * 
   * upgradable-contract workflow:
   * 1. find the dep cell with type-id code in data filed
   * 2. construct the output cell with the following:
   *    2.1 ref the type-id cell as dep cell in tx
   *    2.2 set type script of output-cell to match the type-id cell
   *    2.3 put your contract code in output-cell's data filed.
   * 3. sign tx and send.
   * 
   * @param compiled_code 
   * @param length 
   * @param raw_tx_without_output 
   * @param input_cells 
   * @param account_id 
   */
  deploy_upgradable_contract(
    compiled_code: HexString, // the smart contract code compiled into hex string
    length: number, // how much the output cell which contains the actual contract code needs
    raw_tx_without_output: RawTransaction,
    input_cells: Cell[],
    account_id = 0,
    tx_fee = 1 // uint: ckb
  ): Transaction{
    // todo
    const type_id = this.generateTypeIDContractCode();
    const first_input_outpoint: OutPoint = raw_tx_without_output.inputs[0].previous_output;
    const first_output_index: number = 0;
    raw_tx_without_output.outputs[0] = {
      capacity: '0x' + (BigInt(length + 300) * 100000000n).toString(16),
      lock: {
        code_hash: Config.SCRIPTS.SECP256K1_BLAKE160.CODE_HASH,
        args: User.account[account_id].lock_arg,
        hash_type: Config.SCRIPTS.SECP256K1_BLAKE160.HASH_TYPE === "type"?"type":"data"
      },
      type: {
        code_hash: this.generateCodeHash(type_id.code),
        args: this.generateTypeIDArgs(raw_tx_without_output.inputs[0]),//this.generateTypeIDArgsHash(first_input_outpoint, first_output_index),
        hash_type: 'data'
      }
    };
    console.log('typeid args:')
    console.log(this.generateTypeIDArgsHash(first_input_outpoint, first_output_index));
    raw_tx_without_output.outputs_data[0] = compiled_code;

    // after construct the contract cell, let's give the rest money back to owner
    const remain_balance = BigInt(input_cells[0].capacity) - BigInt(raw_tx_without_output.outputs[0].capacity) - BigInt(tx_fee) * 100000000n;
    if( remain_balance > 0 ){
      raw_tx_without_output.outputs[1] = {
        capacity: '0x' + remain_balance.toString(16),
        lock: {
          code_hash: Config.SCRIPTS.SECP256K1_BLAKE160.CODE_HASH,
          args: User.account[account_id].lock_arg,
          hash_type: Config.SCRIPTS.SECP256K1_BLAKE160.HASH_TYPE == "type"?"type":"data"
        }
      }
      raw_tx_without_output.outputs_data[1] = '0x';
    }

    // now we can sign this tx and ready to send it through RPC.
    const witnessArgs: WitnessArgs[] = [{
      lock: '0x'
    }]
    const tx = this.sign_P2PKH(raw_tx_without_output, witnessArgs, input_cells, account_id = account_id);
    return tx;
  }

  deployTypeID(
    raw_tx_without_output: RawTransaction,
    input_cells: Cell[],
    account_id = 0
  ): Transaction{
    const {length, code} = this.generateTypeIDContractCode();
    return this.deploy_contract(code, length, raw_tx_without_output, input_cells, "normal", account_id);
  }

  async generateDepGroupOutputData(outpoints: object[]){
    const serialized_outpoints = [];
    for await (const op of outpoints){
      serialized_outpoints.push(
        new Reader(
          core.SerializeOutPoint(normalizers.NormalizeOutPoint(op))
        ).serializeJson()
      );
    }
    var output_data = '0x02000000';
    for await (const sop of serialized_outpoints){
      output_data += sop.slice(2);
    }
    return output_data;
  }

  generateRawTxTemplate(
    cell_deps: CellDep[] = [],
    header_deps: Hash[] = [],
    inputs: Input[] = [],
    outputs: Output[] = [],
    outputs_data: HexString[] = [],
    version: HexString = Const.TX_VERSION
  ){
    let raw_tx: RawTransaction = {
      cell_deps: cell_deps,
      header_deps: header_deps,
      inputs: inputs,
      outputs: outputs,
      outputs_data: outputs_data,
      version: version
    }
    return raw_tx;
  }

  generateTxTemplate(
    cell_deps: CellDep[] = [],
    header_deps: Hash[] = [],
    inputs: Input[] = [],
    outputs: Output[] = [],
    outputs_data: HexString[] = [],
    witnesses: HexString[] = [],
    version: HexString = Const.TX_VERSION
  ){
    let tx: Transaction = {
      cell_deps: cell_deps,
      header_deps: header_deps,
      inputs: inputs,
      outputs: outputs,
      outputs_data: outputs_data,
      witnesses: witnesses,
      version: version
    }
    return tx;
  }

  generateCodeHash(code: HexString | Cell){
    const hasher = new CKBHasher();
    if(typeof code === 'string'){
      hasher.update(code);
      return hasher.digestHex();
    }else if(typeof code === 'object'){
      hasher.update(code.data)
      return hasher.digestHex();
    }else{
      throw new Error("unsuported type of code.");
    }
  }

  generateScriptHash(script: Script){
    const serialized_script = core.SerializeScript(normalizers.NormalizeScript(script));
    console.log(serialized_script)
    const hasher = new CKBHasher();
    hasher.update(serialized_script);
    return hasher.digestHex();
  }

  generateTestContractCode(){ // carrot example
    const file = path.resolve(Const.TEST_CONTRACT);
    const complied_code = fs.readFileSync(file);
    return {
      length: complied_code.byteLength,
      code: '0x' + complied_code.toString('hex')
    };
  }

  readContractCodeByFileName(filename: string){
    const file = path.resolve( Const.CONTRACT_CODE_PREFIX_PATH + filename);
    const complied_code = fs.readFileSync(file);
    return {
      length: complied_code.byteLength,
      code: '0x' + complied_code.toString('hex')
    };
  }

  generateTestUpgradableContractCode(){
    const file = path.resolve(Const.TEST_UPGRADABLE_CONTRACT);
    const complied_code = fs.readFileSync(file);
    return {
      length: complied_code.byteLength,
      code: '0x' + complied_code.toString('hex')
    };
  }

  generateTypeIDContractCode(){
    const file = path.resolve(Const.TYPE_ID_CONTRACT);
    const complied_code = fs.readFileSync(file);
    return {
      length: complied_code.byteLength,
      code: '0x' + complied_code.toString('hex')
    };
  }

  // when a cell ref the TypeID script for the first time,
  // TypeID will consider it a init operation
  // and try to construct the first unique id
  // 1. by hashing the first input as a unique key
  //    and place it in the args data filed in output cell's type script.
  // 2. besides, we will additionally hash a second args(output-index) 
  //    to enable dev to generate multiple differernt typeID in one transaction.
  // this function helps to generate such two args.
  // see: https://github.com/nervosnetwork/ckb/blob/develop/script/src/type_id.rs#L46-L71
  generateTypeIDArgsHash(
    first_input_outpoint: OutPoint,
    first_output_index: number
  ): HexString{
    const f_op = core.SerializeOutPoint(normalizers.NormalizeOutPoint(first_input_outpoint));
    const hasher = new CKBHasher();
    hasher.update(f_op);
    hasher.update(toBigUInt64LE(first_output_index));
    return hasher.digestHex();
  }

  // in demo, we try encode the whole input as args rather than its hash 
  // for simplicity and convience to better teach the type-id idea to newbee.
  // but in production, we really use generateTypeIDArgsHash() method.
  generateTypeIDArgs(
    first_input: Input,
  ): HexString{
    return '0x'+buf2hex(core.SerializeCellInput(normalizers.NormalizeCellInput(first_input)));
  }

  // the multisigArgs acuttally is the lock_arg of the multisig address.
  // the method to generate multisigArgs is quite simple: 
  //    1. serialize the multisigScript, and get first 20th-blake2b-hash
  //    2. if since is not null, just append it after.
  generateMultisigArgs(serializedMultisigScript: string, since: string): string{
    let sinceLE = "0x";
    if (since != null) {
        sinceLE = toBigUInt64LE(BigInt(since));
    }
    return (new CKBHasher().update(serializedMultisigScript).digestHex().slice(0, 42) +
        sinceLE.slice(2));
  }

  serializeMultisigScript(multisigScript: MultisigScript): string{
    if (multisigScript.S !== 0)throw new Error("S in MultisigScript must be 0 now!");

    if (multisigScript.R < 0 || multisigScript.R > 255) {
      throw new Error("`R` should be less than 256!");
    }
    if (multisigScript.M < 0 || multisigScript.M > 255) {
        throw new Error("`M` should be less than 256!");
    }
    if (multisigScript.N < 0 || multisigScript.N > 255) {
      throw new Error("`M` should be less than 256!");
    }
    if (multisigScript.publicKeyHashes.length !== multisigScript.N) {
      throw new Error("`N` should match the length of publickeyhashes!");
    }
    // TODO: validate publicKeyHashes
    return ("0x00" +
        ("00" + multisigScript.R.toString(16)).slice(-2) +
        ("00" + multisigScript.M.toString(16)).slice(-2) +
        ("00" + multisigScript.N.toString(16)).slice(-2) +
        multisigScript.publicKeyHashes.map((h) => h.slice(2)).join(""));
  }
  
  groupInputs(inputCells: Cell[]): InputsGroup[] {
    var groups: InputsGroup[] = [];
    inputCells.forEach((cell, index) => {
      this.hasher = new CKBHasher();
      this.hasher.update(
        new Reader(
          core.SerializeScript(normalizers.NormalizeScript(cell.lock))
        ).serializeJson()
      );
      const scripthash = this.hasher.digestHex();

      // find if the same scripthash group exits.
      // if exits, push the current inputcells's index into this group.
      // else, create a new group and push the first item.
      const group = groups.find((g) => g.hash === scripthash);
      if (group) {
        const i = groups.findIndex((g) => g.hash === scripthash);
        groups[i].child.push(index);
      } else {
        groups.push({
          hash: scripthash,
          child: [index],
        });
      }
    });

    return groups;
  }

  generateTxHash(raw_tx: RawTransaction): HexString {
    return ckbHash(
      core.SerializeRawTransaction(normalizers.NormalizeRawTransaction(raw_tx))
    ).serializeJson();
    // try {
    //   return ckbHash(
    //     core.SerializeRawTransaction(normalizers.NormalizeRawTransaction(raw_tx))
    //   ).serializeJson();
    // } catch (error) {
    //   return error.message; 
    // }
  }

  signMessage(msg: HexString, account_id:number=0): HexString {
    const private_key = User.account[account_id].private_key;
    return key.signRecoverable(msg, private_key);
  }

  signMessageByPrivKey(msg: HexString, privKey: HexString): HexString{
    return key.signRecoverable(msg, privKey);
  }

  async send_tx(tx: Transaction): Promise<HexString>{
    const rpc = new RPC(Const.RPC_URL);
    const real_txHash = await rpc.send_transaction(tx);
    return real_txHash;
  }

  toSimpleMessage(
    tx_hash: HexString,
    length: ArrayBuffer,
    witness: Reader
  ): HexString {
    this.hasher = new CKBHasher();
    this.hasher.update(tx_hash);
    this.hasher.update(length);
    this.hasher.update(witness);
    return this.hasher.digestHex();
  }

  toMessage(
    tx_hash: HexString,
    raw_tx: RawTransaction,
    witnesses: HexString[],
    inputCells: Cell[]
  ): Message[] {
    const messages: Message[] = [];
    const signedWitness: HexString[] = [];

    // 0. group the input with same lock script for witness
    const input_groups = this.groupInputs(inputCells);
    //console.log(input_groups);

    for (let i = 0; i < input_groups.length; i++) {
      const group_index = input_groups[i].child[0];
      
      //reserve dummy lock for the first witness
      const dummy_lock = "0x" + "0".repeat(130);
      let witness_args = this.deserializeWitnessArgs(witnesses[group_index]);
      witness_args.lock = dummy_lock;

      this.hasher = new CKBHasher();

      // 1. hash the txHash
      this.hasher.update(tx_hash);

      // 2. hash the witness in groups order.
      // - 2.1 hash the first witness in group
      const firstWitness = new Reader(this.serializeWitness(witness_args));
      this.hasher.update(serializeBigInt(firstWitness.length()));
      this.hasher.update(firstWitness);
      // - 2.2 hash the rest of witness in the same group
      for (let j = 1; j < input_groups[i].child.length; j++) {
        const witness_index = input_groups[i].child[j];
        const witeness_in_group = new Reader(witnesses[witness_index] ? witnesses[witness_index] : '0x');
        this.hasher.update(serializeBigInt(witeness_in_group.length()));
        this.hasher.update(witeness_in_group);
      }
      // - 2.3 hash the witness which do not in any input group
      for (let k = raw_tx.inputs.length; k < witnesses.length; k++) {
        const witeness_alone = new Reader(witnesses[k] ? witnesses[k] : '0x');
        this.hasher.update(serializeBigInt(witeness_alone.length()));
        this.hasher.update(witeness_alone);
      }

      // 3. generate the sign-message, ready to be signed.
      const sig_hash = this.hasher.digestHex();
      messages.push({
        index: i,
        message: sig_hash, // hex string
        lock: inputCells[i].lock,
      });
    }
    return messages;
  }

  deserializeWitnessArgs(witness: HexString) {
    // todo: complete this function for input_type and output_type
    return {lock:'', input_type: '', output_type:''}
  }

  serializeWitnesses(witnessArgs: WitnessArgs[]) {
    return witnessArgs.map((w) =>
      new Reader(
        core.SerializeWitnessArgs(normalizers.NormalizeWitnessArgs(w))
      ).serializeJson()
    );
  }

  serializeWitness(witnessArg: WitnessArgs) {
    return new Reader(
        core.SerializeWitnessArgs(normalizers.NormalizeWitnessArgs(witnessArg))
    ).serializeJson();
  }

  FillSignedWitnesses(
    tx: Transaction,
    messages: Message[],
    witnesses: HexString[]
  ) {
    if (messages.length !== witnesses.length) {
      throw new Error("Invalid number of witnesses!");
    }
    for (let i = 0; i < messages.length; i++) {
      tx.witnesses[messages[i].index] = witnesses[i];
    }
    return tx;
  }

  async fillWitnessWithSignedWitnessArgs(
    witness_args_list: Array<signedWitnessArgsType>,
    witnesses: HexString[]
  ): Promise<HexString[]>{
    //todo: this func is not genernal for all witnesses
    console.log(witness_args_list);
    for await ( const w of witness_args_list ){
      switch (w.type) {
        case 'witness_args_lock':
          if(witnesses[w.index] !== '0x55000000100000005500000055000000410000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'
            && witnesses[w.index] !== '0x'
            && witnesses[w.index]
          ){//it has some input-type witness, let's just keep it by keeping the first 40 unchanged
            const lock_witness = this.serializeWitness({
              lock: w.signature
            });
            witnesses[w.index] = witnesses[w.index].slice(0, 42) + 
                                 lock_witness.slice(42) + 
                                 witnesses[w.index].slice(lock_witness.length);
            break;
          } 

          witnesses[w.index] = this.serializeWitness({
            lock: w.signature
          });
          break;
        
        case 'witness_args_input_type':
          witnesses[w.index] = this.serializeWitness({
            input_type: w.signature
          });
          break;
        
        case 'witness_args_output_type':
          witnesses[w.index] = this.serializeWitness({
            output_type: w.signature
          });
          break;
      };
    }
    return witnesses;
  }

  async generateSpecialUnlockDaoWitness(signatrue: string): Promise<string>{
    const depositHeaderDepIndex = 0;
    const witness_args = {
      lock: signatrue,
      input_type: toBigUInt64LE(BigInt(depositHeaderDepIndex)),
    }
    return this.serializeWitness(witness_args);
  }

    
}

