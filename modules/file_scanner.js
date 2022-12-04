var fs = require("fs");
var db_connector = require("./db_connector.js");


class FileScanner {
    constructor(dir, table) {
        var prevstate = {files: []};
        var currstate;
        
        var pendingUpdate = [];
        var pendingAdd = [];
        
        var checkedAgainstDatabase = false;
        
        console.log("table - " + table);
        
        this.scanFiles = function() {
            return new Promise(resolve => {
                if (!checkedAgainstDatabase) {
                    db_connector.db.query(("SELECT * FROM " + table), (err, result, fields) => {
                        if (err) throw err; //TODO
                        console.log(result);
                        for (let row of result) {
                            var dbfiledata = {};
                            dbfiledata.name = row.fs_file;
                            dbfiledata.stat = {};
                            dbfiledata.stat.ctime = row.fs_ctime;
                            dbfiledata.stat.size = row.fs_size;
                            dbfiledata.updtmfordb = row.fs_update;
                            dbfiledata.statefordb = row.fs_state;
                            dbfiledata.versifordb = row.fs_version;
                            dbfiledata.isInDb = true;
                            prevstate.files.push(dbfiledata);
                        }
                        checkedAgainstDatabase = true;
                        resolve();
                    });
                } else {
                    prevstate = currstate;
                    resolve();
                }
                currstate = {files: []};
            }).then( () => {
                scanDir(dir);
            });
        }


        function scanDir(dirname) {
            dirname = (dirname + "/");
            fs.readdir(dirname, {withFileTypes: true}, (err, filenames) => {
                if (err) throw err; //TODO
                console.log(filenames);
                for (let prvfile of prevstate.files) {
                    
                }
                for (let file of filenames) {
                    if (file.isDirectory()) {
                        scanDir(dirname + file.name);
                    } else {
                        var filedata = {};
                        filedata.name = (dirname + file.name);
                        filedata.stat = fs.statSync(dirname + file.name);
                        filedata.isInDb = false;
                        currstate.files.push(filedata);
                    }
                }
                comparePreviousWithCurrent();
            });
        }
        
        function comparePreviousWithCurrent() {
            for (let prvfile of prevstate.files) {
                console.log("first");
                prvfile.isInCurr = false;
                for (let currfile of currstate.files) {
                    if (prvfile.name === currfile.name) {
                        currfile.isInDb = true;
                        prvfile.isInCurr = true;
                        currfile.versifordb = prvfile.versifordb;
                        if (
                            prvfile.stat.ctime.getTime() != currfile.stat.ctime.getTime() || 
                            prvfile.stat.size != currfile.stat.size
                        ) {
                            currfile.statefordb = "update";
                            currfile.versifordb++;
                            pendingUpdate.push(currfile);
                        }
                        break;
                    }
                }
                if (!prvfile.isInCurr) {
                    if (prvfile.statefordb != "deleted") {
                        prvfile.statefordb = "deleted";
                        pendingUpdate.push(prvfile);
                        console.log("deteled " + prvfile.name);
                    }
                    currstate.files.push(prvfile);
                }
            }
            for (let currfile of currstate.files) {
                console.log(currfile);
                if (!currfile.isInDb) {
                    currfile.statefordb = "new";
                    pendingAdd.push(currfile);
                }
            }
            setTimeout(updateDb, 1000); //TODO change to 90000 (90s) after testing
        }
        
        function updateDb() {
            for (let filetodb of pendingUpdate) {
                let currStat;
                if (fs.existsSync(filetodb.name)) {
                    currStat = fs.statSync(filetodb.name);
                } else if (filetodb.statefordb === "deleted") {
                    currStat = filetodb.stat;
                }
                if (
                    filetodb.stat.ctime.getTime() === currStat.ctime.getTime() &&
                    filetodb.stat.size === currStat.size
                ) {
                    db_connector.db.query('UPDATE ' + table + ' SET fs_status="' + filetodb.statefordb + '", fs_version=' + filetodb.versifordb + ', fs_update="' + (new Date().toISOString()).replace(/\....Z$/, "") + '", fs_size=' + filetodb.stat.size + ', fs_ctime="' + (filetodb.stat.ctime.toISOString()).replace(/\....Z$/, "") + '" WHERE fs_file="' + filetodb.name + '"');
                }
            }
            pendingUpdate = [];
            for (let filetodb of pendingAdd) {
                let currStat = fs.statSync(filetodb.name);
                if (
                    filetodb.stat.ctime.getTime() === currStat.ctime.getTime() &&
                    filetodb.stat.size === currStat.size
                ) {
                    db_connector.db.query('INSERT INTO ' + table + 
                    ' (fs_file, fs_status, fs_version, fs_update, fs_size, fs_ctime) VALUES ("' 
                    + filetodb.name + '", "' + filetodb.statefordb + '", 1, "' + (new Date().toISOString()).replace(/\....Z$/, "") + '", ' + filetodb.stat.size + ', "' + (filetodb.stat.ctime.toISOString()).replace(/\....Z$/, "") + '")');
                    filetodb.isInDb = true;
                }
            }
            pendingAdd = [];
        }
    }
}

module.exports = {
    FileScanner
}
