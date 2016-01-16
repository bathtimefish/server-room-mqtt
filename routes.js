module.exports = function(app) {

    // APIステータスを表示する
    app.get('/', function(req, res) {
        var status = {
            'name': 'KDL ServerRoom Sensing API',
            'version': '0.1.0'
        };
        res.json(status);
    });

};
