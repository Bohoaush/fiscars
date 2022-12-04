var fs = require("fs");

const mdnm = "logger";

var logLevel = 0;
var filesaveEnabled = true;
var stamp;

var currFilename = ("./logs/" + ((new Date()).toLocaleDateString('cs-CZ')).replace(/\. /g, "_") + ".log");

function log(that, level, rcvString) {
    let lvlNr;
    switch(level) {
        case "DEBUG":
            lvlNr = 0;
            break;
            
        case "INFO":
            lvlNr = 1;
            break;
            
        case "WARNING":
            lvlNr = 2;
            break;
            
        default:
            lvlNr = 3;
            break;
    }
    if (lvlNr >= logLevel) {
        stamp = (new Date()).toLocaleString('cs-CZ');
        rcvString = ("\n" + stamp + " | " + level + " | " + that + " | " + rcvString + "\n");
        console.log(rcvString);
        if (filesaveEnabled) {
            fs.appendFile(currFilename, rcvString, function (err) {
                if (err) {
                    filesaveEnabled = false;
                    log(mdnm, "ERROR", err);
                    log(mdnm, "ERROR", "disabled saving log file, the reason should be above this line");
                }
            });
        }
    }
}

module.exports = {
    log
}

log(mdnm, "INFO",  "Logger started");
