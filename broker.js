/*
 * KDLサーバールーム温度感仕様 MQTT Broker & Subscriber
 * Author: BathTimeFish
 * Modiried: 2016.1.16
 */

module.exports = function (app) {

    var co = require('co');
    var mongoose = require('mongoose');
    var mqtt = require('mqtt');
    var broker_port = 1883;

    var dbConfig = {
        'MONGOLAB_URL': 'mongodb://kdl:1qaz2wsx3edc@ds047075.mongolab.com:47075/kdl-server-room'
    };

    mongoose.connect(dbConfig.MONGOLAB_URL);
    var db = mongoose.connection;
    db.on('error', console.error.bind(console, 'connection error:'));
    db.once('open', function() {
        console.info('MongoDB Connected.');
    });

    var log_schema = {
        "client": String,
        "env": {
            "temparature": {"type": String},
            "humidity": {"type": String},
            "pressure": {"type": String}
        },
        "createdAt": {"type": Date, "default": Date.now }
    };
    var Model = mongoose.model('Log', log_schema);
    app.set('Model', Model);

    function saveLog(log) {
        return new Promise(function(resolve, reject) {
            log.save(function(err) {
                if(err){ reject(err); }
                resolve(true);
            });
        });
    }

    /**
     * Broker
     */
    mqtt.MqttServer(function(client) {
        var _this = this;
        if (!_this.clients) _this.clients = {};

        client.on('connect', function(packet) {
            client.connack({returnCode: 0});
            client.id = packet.clientId;
            _this.clients[client.id] = client;
        });

        client.on('publish', function(packet) {
            for (var k in _this.clients) {
                _this.clients[k].publish({topic: packet.topic, payload: packet.payload});
            }
        });

        client.on('subscribe', function(packet) {
            var granted = [];
            for (var i = 0; i < packet.subscriptions.length; i++) {
                granted.push(packet.subscriptions[i].qos);
            }
            client.suback({granted: granted, messageId: packet.messageId});
        });

        client.on('pingreq', function(packet) {
            client.pingresp();
        });

        client.on('disconnect', function(packet) {
            client.stream.end();
        });

        client.on('close', function(err) {
            delete _this.clients[client.id];
        });

        client.on('error', function(err) {
            client.stream.end();
            console.log('error!');
        });
    }).listen(broker_port);

    /**
     * Subscriber
     *
     */
    var url = require('url');

    var mqtt_url = url.parse(process.env.CLOUDMQTT_URL || 'mqtt://localhost:1883');
    var auth = (mqtt_url.auth || ':').split(':');

    //var broker = mqtt.connect( 'mqtt://localhost:1883');

    var broker = mqtt.createClient(mqtt_url.port, mqtt_url.hostname, {
      username: auth[0],
      password: auth[1]
    });

    broker.on('connect', function() {
        console.log('Subscriber: Connected to Broker!');
    })
    .subscribe('message', function(err, granted) {
        if( err ){
            console.log("error");
            return;
        }
        console.log('Start subscribe.');
    })
    .on('message', function(topic, message) {
        co(function* () {
            // -- start of co closure
            "use strict";
            console.log("[MQTT]: " + message.toString());
            var data = JSON.parse(message.toString());
            var log = new Model({"client": data.client, "env": {"temparature":data.temparature, "humidity":data.humidity, "pressure":data.pressure}});
            var result = yield saveLog(log);
            // -- end of co closure
        }.bind(this)).catch(function(err) {
            console.log('!!! Catch Errors in co in DB Saving');
            console.log(err);
        }.bind(this));
    })

    // lookup host address
    require('dns').lookup( require('os').hostname(), function( err, add, fam){
        console.log( 'Broker started. listening on ' + add + ':' + broker_port );
    });

};
