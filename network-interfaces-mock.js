// Preload patch: load before anything else (node -r ./network-interfaces-mock.js app.js)
// so every later os.networkInterfaces() call sees an empty interface list.
const os = require("os");
os.networkInterfaces = () => ({});
