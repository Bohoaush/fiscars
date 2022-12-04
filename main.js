var config = require ("./modules/config.js");
var scheduler = require("./modules/scheduler.js");
var db_conn = require("./modules/db_connector.js");

config.readSettings().then( () => {
    db_conn.openConnection();
    scheduler.startAll();
}).catch( () => {
    config.createSettings().then( () => {
        db_conn.openConnection();
        scheduler.startAll();
    }).catch((err) => {
        //TODO
        console.log(err);
    });
});
