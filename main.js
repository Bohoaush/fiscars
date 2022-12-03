var config = require ("./modules/config.js");
var scheduler = require("./modules/scheduler.js");
var db_conn = require("./modules/db_connector.js");

config.readSettings().then( () => {
    scheduler.start(config.settings.scheduler_interval_sec);
    db_conn.openConnection();
}).catch( () => {
    config.createSettings().then( () => {
        
        scheduler.start(config.settings.scheduler_interval_sec);
    }).catch((err) => {
        //TODO
        console.log(err);
    });
});
