import * as Const from '../config/const.json';

const serializeBigInt = function (i: number) {
    const view = new DataView(new ArrayBuffer(8));
    view.setUint32(0, i, true);
    return view.buffer;
}

const toBigUInt64LE = function (num:number | bigint) {
    const bnum = BigInt(num);
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64LE(bnum);
    return `0x${buf.toString("hex")}`;
}

const buf2hex = function (buffer: ArrayBuffer) { // buffer is an ArrayBuffer
    return Array.prototype.map.call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2)).join('');
}

const get_env_mode = function(){
    // check if we are in development or production
    // if mode === 'development', code should run on local
    // if mode === 'production', code should be deployed on server
    // todo: maybe auto test using os === 'ubuntu' or something.
    return Const.mode;
}

export {
    serializeBigInt,
    toBigUInt64LE,
    buf2hex,
    get_env_mode,
}