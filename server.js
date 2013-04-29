
var express = require('express');
var detect = require('./lib/detect');

var app = express();

app.configure(function () {
  app.use( express.static(__dirname + '/public') );
});

app.get('/detect/features', function (req, res) {
  detect.features(req.query.url, function (err, features) {
    res.jsonp({ error : err || false, features : features || {} });
  });
});

var port = process.env.PORT || 3000;
app.listen(port);
console.log('Listening on port ' + port);
