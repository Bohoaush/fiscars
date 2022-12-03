var config = require ("./modules/config.js");
var scheduler = require("./modules/scheduler.js");

config.readSettings().then( () => {
    scheduler.start(config.settings.scheduler_interval_sec);
}).catch( () => {
    config.createSettings().then( () => {
        scheduler.start(config.settings.scheduler_interval_sec);
    }).catch((err) => {
        //TODO
        console.log(err);
    });
});
