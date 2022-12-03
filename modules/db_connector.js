var mysql = require('mysql');
var config = require('./config.js');

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
        if (err) throw err; //TODO
        //Connection established
        console.log("connected db");
        module.exports.db.query("USE " + config.settings.db_nme);
    });
}
