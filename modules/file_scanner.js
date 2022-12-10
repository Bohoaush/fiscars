var fs = require("fs");
var db_connector = require("./db_connector.js");
var logger = require("./logger.js");

const mdnm = "file_scanner";


class FileScanner {
    constructor(dir, table, dbupdwait, fetch_db_each_scan) {
        var prevstate = {files: []};
        var currstate;
        
        var pendingUpdate = [];
        var pendingAdd = [];
        
        var checkedAgainstDatabase = false;
        
        this.scanFiles = function() {
            return new Promise(resolve => {
                if (!checkedAgainstDatabase || fetch_db_each_scan) {
                    prevstate.files = [];
                    db_connector.db.query(("SELECT * FROM " + table + " WHERE fs_file LIKE '" + dir + "%'"), (err, result, fields) => {
                        if (err) {
                            logger.log(mdnm, "ERROR", "Error connecting to database. The application will exit.");
                            throw err;
                        }
                        for (let row of result) {
                            var dbfiledata = {};
                            dbfiledata.name = row.fs_file;
                            dbfiledata.stat = {};
                            dbfiledata.stat.ctimeMs = row.fs_ctimems;
                            dbfiledata.stat.ctime = row.fs_ctime;
                            dbfiledata.stat.ctime.setHours(dbfiledata.stat.ctime.getHours() - ((new Date().getTimezoneOffset())/60));
                            dbfiledata.stat.size = row.fs_size;
                            dbfiledata.updtmfordb = row.fs_update;
                            dbfiledata.statefordb = row.fs_status;
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
                scanDir(dir).then(() => {
                    comparePreviousWithCurrent();
                });
            });
        }


        function scanDir(dirname) {
            return new Promise(resolve => {
                let subdirPromises = [];
                dirname = (dirname + "/");
                fs.readdir(dirname, {withFileTypes: true}, (err, filenames) => {
                    if (err) {
                        logger.log((mdnm), "ERROR", ("Failed to obtain directory listing at " + dirname + "\n" + err));
                    } else {
                        for (let file of filenames) {
                            if (file.isDirectory()) {
                                subdirPromises.push(scanDir(dirname + file.name));
                            } else {
                                var filedata = {};
                                filedata.name = (dirname + file.name);
                                filedata.stat = fs.statSync(dirname + file.name);
                                filedata.isInDb = false;
                                currstate.files.push(filedata);
                            }
                        }
                    }
                    Promise.all(subdirPromises).then(() => resolve());
                });
            });
        }
        
        function comparePreviousWithCurrent() {
            if (fetch_db_each_scan) {
                for (let pendadd of pendingAdd) {
                    pendadd.isInDb = true; // Not actually true - workaround...
                    prevstate.files.push(pendadd);
                    logger.log(mdnm, "WARNING", "File " + pendadd.name + " is still pending add to database. Consider increasing scan interval.");
                }
            } // Workaround to not add duplicate entries to pending if fetching database each check.
            for (let prvfile of prevstate.files) {
                prvfile.isInCurr = false;
                for (let currfile of currstate.files) {
                    if (prvfile.name === currfile.name) {
                        currfile.isInDb = true;
                        prvfile.isInCurr = true;
                        currfile.versifordb = prvfile.versifordb;
                        if (
                            prvfile.stat.ctimeMs != currfile.stat.ctimeMs || 
                            prvfile.stat.size != currfile.stat.size
                        ) {
                            currfile.statefordb = "update";
                            currfile.versifordb++;
                            pendingUpdate.push(currfile);
                        }
                        break;
                    }
                }
                if (!prvfile.isInCurr && prvfile.isInDb) {
                    if (prvfile.statefordb != "deleted") {
                        prvfile.statefordb = "deleted";
                        pendingUpdate.push(prvfile);
                    }
                    currstate.files.push(prvfile);
                }
            }
            for (let currfile of currstate.files) {
                if (!currfile.isInDb) {
                        currfile.statefordb = "new";
                        currfile.versifordb = 1;
                        pendingAdd.push(currfile);
                }
            }
            setTimeout(updateDb, (dbupdwait*1000));
        }
        
        function updateDb() {
            for (let filetodb of pendingUpdate) {
                let currStat;
                if (fs.existsSync(filetodb.name)) {
                    currStat = fs.statSync(filetodb.name);
                } else if (filetodb.statefordb === "deleted") {
                    currStat = filetodb.stat;
                    for (let adpend of pendingAdd) {
                        if (filetodb === adpend) {
                            currStat = false;
                            pendingAdd.splice(pendingAdd.indexOf(adpend), 1);
                            logger.log(mdnm, "WARNING", ("File " + filetodb.name + "was deleted before adding to database."));
                        }
                    }
                }
                if (
                    filetodb.stat.ctimeMs === currStat.ctimeMs &&
                    filetodb.stat.size === currStat.size
                ) {
                    db_connector.db.query('UPDATE ' + table + ' SET fs_status="' + filetodb.statefordb + '", fs_version=' + filetodb.versifordb + ', fs_update="' + (new Date().toISOString()).replace(/\....Z$/, "") + '", fs_size=' + filetodb.stat.size + ', fs_ctime="' + (filetodb.stat.ctime.toISOString()).replace(/\....Z$/, "") + '", fs_ctimems=' + filetodb.stat.ctimeMs + ' WHERE fs_file="' + filetodb.name + '"');
                    pendingUpdate.splice(pendingUpdate.indexOf(filetodb), 1);
                    logger.log(mdnm, "INFO", ("Updated file " + filetodb.name + " in database"));
                    
                }
            }
            for (let filetodb of pendingAdd) {
                let currStat = {};
                if (fs.existsSync(filetodb.name)) {
                    currStat = fs.statSync(filetodb.name);
                }
                if (
                    filetodb.stat.ctimeMs === currStat.ctimeMs &&
                    filetodb.stat.size === currStat.size
                ) {
                    db_connector.db.query('INSERT INTO ' + table + 
                    ' (fs_file, fs_status, fs_version, fs_update, fs_size, fs_ctime, fs_ctimems) VALUES ("' 
                    + filetodb.name + '", "' + filetodb.statefordb + '", 1, "' + (new Date().toISOString()).replace(/\....Z$/, "") + '", ' + filetodb.stat.size + ', "' + (filetodb.stat.ctime.toISOString()).replace(/\....Z$/, "") + '", ' + filetodb.stat.ctimeMs + ')');
                    filetodb.isInDb = true;
                    pendingAdd.splice(pendingAdd.indexOf(filetodb), 1);
                    logger.log(mdnm, "INFO", ("Added file " + filetodb.name + " to database"));
                }
            }
        }
    }
}

module.exports = {
    FileScanner
}
