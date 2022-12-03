var fs = require("fs");
var config = require("./config.js");

var prevstate;
var currstate;

var gotDataFromDatabase = false;

function scanFiles() {
    if (gotDataFromDatabase) prevstate = currstate;
    currstate = {files: []};
    for (dir of config.settings.scan_dirs) {
        scanDir(dir);
        console.log(currstate);
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
                var filedata = {};
                filedata.name = (dirname + file.name);
                filedata.stat = fs.statSync(dirname + file.name);
                filedata.isInDb = false;
                console.log(filedata);
                if (prevstate != undefined && prevstate.files != []) {
                    for (prvfile of prevstate.files) {
                        if (prvfile.name === filedata.name) {
                            filedata.isInDb = true;
                            if (prvfile.stat.ctime != filedata.stat.ctime || prvfile.stat.size != filedata.stat.size) {
                                //TODO update file data in database
                                break;
                            }
                        }
                    }
                    
                    if (filedata.isInDb === false) {
                        //TODO add file data to database
                    }
                } else {
                    //TODO db_connection
                }
                currstate.files.push(filedata);
            }
        }
    });
}
