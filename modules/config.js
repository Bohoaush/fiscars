var fs = require("fs");
var logger = require("./logger");

const mdnm = "config";

var settings;

module.exports = {
    settings,
    readSettings,
    createSettings,
    writeSettingsToFile
}

function readSettings() {
    return new Promise((resolve, reject) => {
        fs.readFile("./settings.json", function(err, data) {
            if (err) {
                logger.log(mdnm, "ERROR", ("Error reading config file: " + err))
            }
            if (data != null) {
                module.exports.settings = JSON.parse(data);
                for (let i = 0; i < module.exports.settings.scan_dirs.length; i++) {
                    module.exports.settings.scan_dirs[i] = module.exports.settings.scan_dirs[i].replace(/\/$/, "");
                }
                
                var fixIncompleteConfig = [
                    module.exports.settings.db_tbl,
                    module.exports.settings.scheduler_intervals_sec,
                    module.exports.settings.update_db_wait_sec,
                    module.exports.settings.fetch_db_each_scan
                ]
                for (let fixIncompleteConfigPart of fixIncompleteConfig) {
                    for (let i = fixIncompleteConfigPart.length; i < module.exports.settings.scan_dirs.length; i++) {
                        logger.log(mdnm, "WARNING", ("Using first value \"" + fixIncompleteConfigPart[0] + "\" for " + module.exports.settings.scan_dirs[i]));
                        module.exports.settings.db_tbl.push(fixIncompleteConfigPart[0]);
                    }
                }
                logger.log(mdnm,"INFO", "Loaded config file");
                resolve();
            } else {
                logger.log(mdnm, "ERROR", "Couldn't read config file");
                reject();
            }
        });
    });
}

function createSettings(shouldWriteToFile) {
    return new Promise((resolve, reject) => {
        module.exports.settings = {
            db_hst: "127.0.0.1",
            db_nme: "files",
            db_tbl: ["filedata"],
            db_usr: "",
            db_pwd: "",
            scan_dirs: ["."],
            fetch_db_each_scan: [true],
            scheduler_enabled: true,
            scheduler_intervals_sec: [300],
            update_db_wait_sec: [90],
            api_enabled: false,
            api_port: 8086
        }
        if ((!fs.existsSnyc("./settings.json")) || shouldWriteToFile) {
            writeSettingsToFile().then( () => {
                logger.log(mdnm, "WARNING", "Created new settings file");
                resolve();
            }).catch(err => {
                logger.log(mdnm, "ERROR", "Cloudn't write new settings!");
                reject(err);
            });
        } else {
            
        }
    });
}

function writeSettingsToFile() {
    return new Promise((resolve, reject) => {
        fs.writeFile("./settings.json", JSON.stringify(module.exports.settings), (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}
