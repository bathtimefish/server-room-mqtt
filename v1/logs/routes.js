module.exports = function(app) {
    var co = require('co');

    function getAllLogs() {
        return new Promise(function(resolve, reject) {
            var result = {
                "success": false,
                "error": null,
                "data": null
            };
            var Log = app.get('Model');
            Log.find().lean().exec({}, function(err, doc) {
                if(err) {
                    result.error = err;
                    reject(result);
                }
                result.success = true;
                result.error = null;
                result.data = doc;
                resolve(result);
            });
        });
    }

    app.get('/', function(req, res) {
        co(function* () {
            // -- start of co closure
            "use strict";
            var result = yield getAllLogs();
            res.json(result);
            // -- end of co closure
        }.bind(this)).catch(function(err) {
            res.json(err);
        }.bind(this));
    });

};
