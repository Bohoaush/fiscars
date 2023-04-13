var scanner = require("./file_scanner.js");
var config = require("./config.js");
var logger = require("./logger.js");

const mdnm = "scheduler";

scanners = [];

function startAll() {
    for (dir of config.settings.scan_dirs) {
        scanners.push(
            new scanner.FileScanner(
                dir, 
                config.settings.db_tbl[config.settings.scan_dirs.indexOf(dir)],
                config.settings.update_db_wait_sec[config.settings.scan_dirs.indexOf(dir)],
                config.settings.fetch_db_each_scan[config.settings.scan_dirs.indexOf(dir)],
                config.settings.ignr_file[config.settings.scan_dirs.indexOf(dir)]
            )
        );
        logger.log(mdnm, "INFO", ("Initialized file scanner for " + dir));
    }
    for (filescanner of scanners) {
        start(filescanner, config.settings.scheduler_intervals_sec[scanners.indexOf(filescanner)]);
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
    setInterval(filescanner.scanFiles, (seconds * 1000));
    logger.log(mdnm, "INFO", ("Scheduled file scanner " + scanners.indexOf(filescanner) + " every " + seconds + "s"));
}

function stop(filescanner) {
    clearInterval(filescanner.scanFiles);
    logger.log(mdnm, "INFO", ("Cleared schedule of file scanner " + scanners.indexOf(filescanner)));
}
