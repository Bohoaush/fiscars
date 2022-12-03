var fs = require("fs");
var config = require("./config.js");
var db_connector = require("./db_connector.js");

var prevstate = {files: []};
var currstate;

var checkedAgainstDatabase = false;

function scanFiles() {
    if (!checkedAgainstDatabase) {
        db_connector.db.query("SELECT * FROM filedata", (err, result, fields) => {
            if (err) throw err; //TODO
            console.log(result);
            for (row of result) {
                var dbfiledata = {};
                dbfiledata.name = row.path;
                dbfiledata.stat = {};
                dbfiledata.stat.ctime = row.ctime;
                dbfiledata.stat.size = row.size;
                prevstate.files.push(dbfiledata);
            }
            checkedAgainstDatabase = true;
        });
    } else prevstate = currstate;
    currstate = {files: []};
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
                var filedata = {};
                filedata.name = (dirname + file.name);
                filedata.stat = fs.statSync(dirname + file.name);
                filedata.isInDb = false;
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
                        db_connector.db.query('INSERT INTO ' + config.settings.db_tbl + ' (path, size, ctime) VALUES ("' + filedata.name + '", ' + filedata.stat.size + ', "' + (filedata.stat.ctime.toISOString()).replace(/\....Z$/, "") + '")');
                    }
                } else {
                    
                }
                currstate.files.push(filedata);
            }
        }
    });
}
