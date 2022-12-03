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
            db_usr: "",
            db_pwd: "",
            scan_dirs: ["."],
            api_enabled: false,
            api_port: 8086,
            scheduler_enabled: true,
            scheduler_interval_sec: 300
            
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
