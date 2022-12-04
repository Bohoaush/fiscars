var config = require ("./modules/config.js");
var scheduler = require("./modules/scheduler.js");
var db_conn = require("./modules/db_connector.js");
var logger = require("./modules/logger.js");

config.readSettings().then( () => {
    db_conn.openConnection();
    scheduler.startAll();
}).catch( () => {
    config.createSettings().then( () => {
        db_conn.openConnection();
        scheduler.startAll();
    }).catch((err) => {
        logger.log("main", "ERROR", "Couldn't read nor generate settings, the application will exit");
        throw err;
    });
});
