var mysql = require('mysql');
var config = require('./config.js');
var logger = require('./logger.js');

const mdnm = "db_connector";

var db;

module.exports = {
    db,
    openConnection
}

function openConnection() {
    module.exports.db = mysql.createConnection({
        host: config.settings.db_hst,
        user: config.settings.db_usr,
        password: config.settings.db_pwd
    });
    
    module.exports.db.connect(function(err) {
        if (err) {
            logger.log(mdnm, "ERROR", "Failed connecting to database, the application will exit");
            throw err;
        }
        module.exports.db.query("USE " + config.settings.db_nme);
        logger.log(mdnm, "INFO", "Connected to database");
    });
}
