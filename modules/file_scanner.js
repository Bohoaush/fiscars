var fs = require("fs");
var db_connector = require("./db_connector.js");


class FileScanner {
    constructor(dir, table) {
        var prevstate = {files: []};
        var currstate;

        var checkedAgainstDatabase = false;
        
        console.log("table - " + table);
        
        this.scanFiles = function() {
            if (!checkedAgainstDatabase) {
                db_connector.db.query(("SELECT * FROM " + table), (err, result, fields) => {
                    if (err) throw err; //TODO
                    console.log(result);
                    for (let row of result) {
                        var dbfiledata = {};
                        dbfiledata.name = row.path;
                        dbfiledata.stat = {};
                        dbfiledata.stat.ctime = row.ctime;
                        dbfiledata.stat.size = row.size;
                        dbfiledata.isInDb = true;
                        prevstate.files.push(dbfiledata);
                    }
                    checkedAgainstDatabase = true;
                });
            } else prevstate = currstate;
            currstate = {files: []};
            scanDir(dir);
        }


        function scanDir(dirname) {
            dirname = (dirname + "/");
            fs.readdir(dirname, {withFileTypes: true}, (err, filenames) => {
                if (err) throw err; //TODO
                console.log(filenames);
                for (let file of filenames) {
                    if (file.isDirectory()) {
                        scanDir(dirname + file.name);
                    } else {
                        var filedata = {};
                        filedata.name = (dirname + file.name);
                        filedata.stat = fs.statSync(dirname + file.name);
                        filedata.isInDb = false;
                        if (prevstate != undefined && prevstate.files != []) {
                            for (let prvfile of prevstate.files) {
                                if (prvfile.name === filedata.name) {
                                    filedata.isInDb = true;
                                    if (prvfile.stat.ctime.getTime() != filedata.stat.ctime.getTime() || prvfile.stat.size != filedata.stat.size) {
                                        /*console.log("\n\nupdating: " + filedata.name + "\nctime:\n" + filedata.stat.ctime.getTime() + "\n" + prvfile.stat.ctime.getTime() + "\nsize:\n" + filedata.stat.size + "\n" + prvfile.stat.size);*/
                                        db_connector.db.query('UPDATE ' + table + ' SET size=' + filedata.stat.size + ', ctime="' + (filedata.stat.ctime.toISOString()).replace(/\....Z$/, "") + '" WHERE path="' + filedata.name + '"');
                                        break;
                                    }
                                }
                            }
                            
                            if (filedata.isInDb === false) {
                                console.log("isInDb checked");
                                db_connector.db.query('INSERT INTO ' + table + ' (path, size, ctime) VALUES ("' + filedata.name + '", ' + filedata.stat.size + ', "' + (filedata.stat.ctime.toISOString()).replace(/\....Z$/, "") + '")');
                                filedata.isInDb = true;
                            }
                        } else {
                            
                        }
                        currstate.files.push(filedata);
                    }
                }
            });
        }
    }
}

module.exports = {
    FileScanner
}
