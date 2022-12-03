var scanner = require("./file_scanner.js");

module.exports = {
    start,
    stop
}

function start(seconds) {
    setInterval(scanner.scanFiles, (seconds * 1000));
}

function stop() {
    clearInterval(scanner.scanFiles);
}
