var fs = require("fs");
var db_connector = require("./db_connector.js");
var logger = require("./logger.js");

const mdnm = "file_scanner";


class FileScanner {
    constructor(dir, table, dbupdwait, fetch_db_each_scan, ignoredfiles) {
        var prevstate = {files: []};
        var currstate;
        var recentlyDbAdded;
        
        var pendingUpdate = [];
        var pendingAdd = [];
        
        var checkedAgainstDatabase = false;
        var checkRunningLock = false;
        
        this.scanFiles = function() {
            if (!checkRunningLock) {
                logger.log(mdnm, "INFO", ("Starting scan for " + dir));
                checkRunningLock = true;
                return new Promise((resolve,reject) => {
                    if (!checkedAgainstDatabase || fetch_db_each_scan) {
                        prevstate.files = [];
                        db_connector.db.query(("SELECT * FROM " + table + " WHERE fs_file LIKE '" + dir + "%'"), (err, result, fields) => {
                            if (err) {
                                reject(err);
                            }
                            if (Symbol.iterator in result) {
                                for (let row of result) {
                                    var dbfiledata = {};
                                    dbfiledata.name = row.fs_file;
                                    dbfiledata.stat = {};
                                    dbfiledata.stat.ctimeMs = row.fs_ctimeMs;
                                    dbfiledata.stat.ctime = row.fs_ctime;
                                    dbfiledata.stat.ctime.setHours(dbfiledata.stat.ctime.getHours() - ((new Date().getTimezoneOffset())/60));
                                    dbfiledata.stat.size = row.fs_size;
                                    dbfiledata.updtmfordb = row.fs_update;
                                    dbfiledata.statefordb = row.fs_status;
                                    dbfiledata.versifordb = row.fs_version;
                                    dbfiledata.isInDb = true;
                                    prevstate.files.push(dbfiledata);
                                }
                            } else {
                                reject("db check result not iterable!");
                            }
                            checkedAgainstDatabase = true;
                            recentlyDbAdded = [];
                            resolve();
                        });
                    } else {
                        prevstate = currstate;
                        resolve();
                    }
                    currstate = {files: []};
                }).then( () => {
                    scanDir(dir).then(() => {
                        checkRunningLock = false;
                        comparePreviousWithCurrent();
                    }).catch(err => {
                        logger.log(mdnm, "ERROR", "Directory scanning failed for reason: " + err);
                        checkRunningLock = false;
                    });
                }).catch(err => {
                    logger.log(mdnm, "ERROR", "Error fetching " + table + " database table: " + err);
                    checkRunningLock = false;
                });
            } else {
                logger.log(mdnm, "WARNING", "Not starting new scan for " + dir + ", previous scan is still running. Consider increasing scan interval");
            }
        }


        function scanDir(dirname) {
            return new Promise((resolve,reject) => {
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
                                if (file.name == "dontscan.abort") {
                                    reject("file induced scan abort");
                                }
                                var filedata = {};
                                filedata.name = (dirname + file.name);
                                if (fs.existsSync(filedata.name)) {
                                    filedata.stat = fs.statSync(filedata.name);
                                    filedata.isInDb = false;
                                    currstate.files.push(filedata);
                                }
                            }
                        }
                    }
                    Promise.all(subdirPromises).then(() => resolve()).catch((err) => reject(err));
                });
            });
        }
        
        function comparePreviousWithCurrent() {
            for (let prvfile of prevstate.files) {
                prvfile.isInCurr = false;
                for (let currfile of currstate.files) {
                    if (prvfile.name === currfile.name) {
                        currfile.isInDb = true;
                        prvfile.isInCurr = true;
                        currfile.versifordb = prvfile.versifordb;
                        if (
                            (
                                prvfile.stat.ctimeMs != currfile.stat.ctimeMs || 
                                prvfile.stat.size != currfile.stat.size
                            ) ||
                            (prvfile.statefordb == "deleted")
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
            if (fetch_db_each_scan) {
                for (let pendadd of pendingAdd) {
                    pendadd.isInDb = true; // Not actually true - workaround...
                    prevstate.files.push(pendadd);
                    logger.log(mdnm, "WARNING", "File " + pendadd.name + " is still pending add to database. Consider increasing scan interval.");
                }
                for (let recadd of recentlyDbAdded) {
                    recadd.isInDb = true;
                    prevstate.files.push(recadd);
                }
            } // Workaround to not add duplicate entries to pending if fetching database each check.
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
                let currStat = {};
                if (fs.existsSync(filetodb.name)) {
                    currStat = fs.statSync(filetodb.name);
                } else if (filetodb.statefordb === "deleted") {
                    currStat = filetodb.stat;
                    for (let adpend of pendingAdd) {
                        if (filetodb === adpend) {
                            currStat.ctimeMs = false;
                            pendingAdd.splice(pendingAdd.indexOf(adpend), 1);
                            logger.log(mdnm, "WARNING", ("File " + filetodb.name + "was deleted before adding to database."));
                        }
                    }
                } else {
                    console.log(filetodb.stat + "\n" + currStat);
                }
                for (let ignoredfile of ignoredfiles) {
                    if (filetodb.name.match(ignoredfile)) {
                        break;
                    }
                    filetodb.verifyAdd = true;
                }
                if (
                    filetodb.stat.ctimeMs === currStat.ctimeMs &&
                    filetodb.stat.size === currStat.size &&
                    filetodb.verifyAdd
                ) {
                    db_connector.db.query('UPDATE ' + table + ' SET fs_status="' + filetodb.statefordb + '", fs_version=' + filetodb.versifordb + ', fs_update="' + (new Date().toISOString()).replace(/\....Z$/, "") + '", fs_size=' + filetodb.stat.size + ', fs_ctime="' + (filetodb.stat.ctime.toISOString()).replace(/\....Z$/, "") + '", fs_ctimems=' + filetodb.stat.ctimeMs + ' WHERE fs_file="' + filetodb.name + '"');
                    pendingUpdate.splice(pendingUpdate.indexOf(filetodb), 1);
                    logger.log(mdnm, "INFO", ("Updated file " + filetodb.name + " in database"));
                    
                } else if (currStat.ctimeMs && filetodb.verifyAdd) {
                    filetodb.stat.ctimeMs = currStat.ctimeMs;
                    filetodb.stat.size = currStat.size;
                } else {
                    pendingUpdate.splice(pendingUpdate.indexOf(filetodb), 1);
                }
            }
            for (let filetodb of pendingAdd) {
                let currStat = {};
                if (fs.existsSync(filetodb.name)) {
                    currStat = fs.statSync(filetodb.name);
                }
                for (let ignoredfile of ignoredfiles) {
                    if (filetodb.name.match(ignoredfile)) {
                        break;
                    }
                    filetodb.verifyAdd = true;
                }
                if (
                    filetodb.stat.ctimeMs === currStat.ctimeMs &&
                    filetodb.stat.size === currStat.size &&
                    filetodb.verifyAdd
                ) {
                    db_connector.db.query(('INSERT INTO ' + table + 
                    ' (fs_file, fs_status, fs_version, fs_update, fs_size, fs_ctime, fs_ctimems) VALUES ("' 
                    + filetodb.name + '", "' + filetodb.statefordb + '", 1, "' + (new Date().toISOString()).replace(/\....Z$/, "") + '", ' + filetodb.stat.size + ', "' + (filetodb.stat.ctime.toISOString()).replace(/\....Z$/, "") + '", ' + filetodb.stat.ctimeMs + ')'), (err, result) => {
                        if (err) {
                            logger.log(mdnm, "ERROR", ("Error adding new entry into the database: got error " + err.code + " during sql command '" + err.sql + "' The affected file will be excluded from queue pending add to avoid further errors."));
                            pendingAdd.splice(pendingAdd.indexOf(filetodb), 1);
                        } else {
                            filetodb.isInDb = true;
                            recentlyDbAdded.push(filetodb);
                            pendingAdd.splice(pendingAdd.indexOf(filetodb), 1);
                            logger.log(mdnm, "INFO", ("Added file " + filetodb.name + " to database"));
                        }
                    });
                } else if (filetodb.verifyAdd){
                    filetodb.stat.ctimeMs = currStat.ctimeMs;
                    filetodb.stat.size = currStat.size;
                } else {
                    pendingAdd.splice(pendingAdd.indexOf(filetodb), 1);
                }
            }
        }
    }
}

module.exports = {
    FileScanner
}
