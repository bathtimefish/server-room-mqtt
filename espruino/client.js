var config = {
  wifiSSID: '[SSID]',
  wifiKey: '[PASSWORD]',
  mqttHost: '[MQTT HOST IP]'
};

var client_id = "1111";
var pth_message = null;

I2C2.setup({scl:B10,sda:B3});
var bme = require("BME280").connect(I2C2);

setInterval(function() {
  bme.readRawData();
  var temp_cal = bme.calibration_T(bme.temp_raw);
  var press_cal = bme.calibration_P(bme.pres_raw);
  var hum_cal = bme.calibration_H(bme.hum_raw);
  var temp_act = temp_cal / 100.0;
  var press_act = press_cal / 100.0;
  var hum_act = hum_cal / 1024.0;

  console.log("Temperature: " + temp_act + " C");
  console.log("Humidity: "+ hum_act+" %");
  console.log("Pressure: " + press_act + " hPa");

  pth_message = "{"
    + "\"client\":" + client_id + ","
    + "\"temparature\":" + temp_act.toString() + ","
    + "\"humidity\":" + hum_act.toString() + ","
    + "\"pressure\":" + press_act.toString()
    + "}";
}, 2000);

var mqtt = require("MQTT");
var wifi, sensor,temp;

mqtt.create(config.mqttHost);

mqtt.on('connected', function() {
  console.log('mqtt connected');
  var topic = "test/espruino";
  setInterval(function() {
    var message = pth_message;
    if(!pth_message) message = 'NULL';
    mqtt.publish(topic, message);
  }, 2000);
});

// main
function main(){
  // WIFI
  Serial1.setup(115200, { rx: B7, tx : B6 });
  wifi = require("ESP8266WiFi_0v25").connect(Serial1, function(err) {
    wifi.reset(function(err) {
      if (err) throw err;
      wifi.connect( config.wifiSSID , config.wifiKey, function (err) {
        if (err) throw err;
        console.log("Connected");
        mqtt.connect();
      });
    });
  });
}

setTimeout(function() {
  console.log('start connection');
  main();
}, 5000);
