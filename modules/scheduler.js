var scanner = require("./file_scanner.js");
var config = require("./config.js");

scanners = [];

function startAll() {
    for (dir of config.settings.scan_dirs) {
        console.log(("dir - " + dir + "\ntbl - " + config.settings.db_tbl[config.settings.scan_dirs.indexOf(dir)]));
        scanners.push(new scanner.FileScanner(dir, config.settings.db_tbl[config.settings.scan_dirs.indexOf(dir)]));
    }
    for (filescanner of scanners) {
        start(filescanner, config.settings.scheduler_interval_sec[scanners.indexOf(filescanner)]);
    }
}

function stopAll() {
    for (filescanner of scanners) {
        stop(filescanner);
    }
    scanners = [];
}

function scanNow(dir_index) {
    scanners[dir_index].scanFiles();
}

module.exports = {
    startAll,
    stopAll,
    scanNow
}

function start(filescanner, seconds) {
    console.log(filescanner);
    setInterval(filescanner.scanFiles, (seconds * 1000));
}

function stop(filescanner) {
    clearInterval(filescanner.scanFiles);
}
