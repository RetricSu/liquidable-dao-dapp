async function* asyncGenerator(start: number, end: number, exc: (num: number) => {}) {
    for (let i = start; i < end; i++) {
        const value = await new Promise(resolve => resolve(exc(i)));
    
        yield value;
      }
}

const asyncIterable = {
    [Symbol.asyncIterator]() {
      return {
        i: 0,
        next() {
          if (this.i < 10) {
            return Promise.resolve({ value: this.i++, done: false });
          }
  
          return Promise.resolve({ value:this.i, done: true });
        }
      };
    }
};


export default {
    asyncIterable,
    asyncGenerator
}