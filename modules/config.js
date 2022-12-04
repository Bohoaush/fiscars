var fs = require("fs");

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
            if (data != null) {
                module.exports.settings = JSON.parse(data);
                for (let i = 0; i < module.exports.settings.scan_dirs.length; i++) {
                    module.exports.settings.scan_dirs[i] = module.exports.settings.scan_dirs[i].replace(/\/$/, "");
                }
                
                for (let i = module.exports.settings.db_tbl.length; i < module.exports.settings.scan_dirs.length; i++) {
                    console.log("using first table \"" + module.exports.settings.db_tbl[0] + "\" for " + module.exports.settings.scan_dirs[i]);
                    module.exports.settings.db_tbl.push(module.exports.settings.db_tbl[0]);
                }
                resolve();
            } else {
                reject();
            }
        });
    });
}

function createSettings() {
    return new Promise((resolve, reject) => {
        module.exports.settings = {
            db_hst: "127.0.0.1",
            db_nme: "files",
            db_tbl: ["filedata"],
            db_usr: "",
            db_pwd: "",
            scan_dirs: ["."],
            api_enabled: false,
            api_port: 8086,
            scheduler_enabled: true,
            scheduler_interval_sec: [300]
            
        }
        writeSettingsToFile().then( () => {
            resolve();
        }).catch(err => {
            reject(err);
        });
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
