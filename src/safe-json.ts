// Prevent "Converting circular structure to JSON" errors from crashing the app
// especially those coming from third-party SDKs like MetaMask or Socket.io
(function() {
  const originalStringify = JSON.stringify;
  JSON.stringify = function(value: any, replacer?: any, space?: any) {
    const cache = new WeakSet();
    return originalStringify(value, (key: string, val: any) => {
      if (typeof val === 'object' && val !== null) {
        if (cache.has(val)) {
          return '[Circular]';
        }
        cache.add(val);
      }
      return typeof replacer === 'function' ? replacer(key, val) : val;
    }, space);
  };
  console.log("Safe JSON.stringify initialized");
})();
