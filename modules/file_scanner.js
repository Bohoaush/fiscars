var fs = require("fs");
var config = require("./config.js");

var dbsestate;
var currstate;

function scanFiles() {
    for (dir of config.settings.scan_dirs) {
        scanDir(dir);
    }
}

module.exports = {
    scanFiles
}


function scanDir(dirname) {
    dirname = (dirname + "/");
    fs.readdir(dirname, {withFileTypes: true}, (err, filenames) => {
        for (file of filenames) {
            if (file.isDirectory()) {
                scanDir(dirname + file.name);
            } else {
                console.log("regular file: " + dirname + file.name);
            }
        }
    });
}
