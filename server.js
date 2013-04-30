
var https = require('https');
var fs = require('fs');

var express = require('express');
var detect = require('./lib/detect');
var argv = require('optimist')
  .boolean('s')
  .alias('s', 'secure')
  .describe('s', 'Start an HTTPS server.')
  .alias('p', 'port')
  .describe('p', 'Port to run server on.')
  .default('p', 3000)
  .argv;

var app = express();

app.configure(function () {
  app.use( express.static(__dirname + '/public') );
});

app.get('/detect/features', function (req, res) {
  detect.features(req.query.url, function (err, features) {
    res.jsonp({ error : err || false, features : features || {} });
  });
});

if (argv.secure) {
  var options = {
    key : fs.readFileSync('./ssl/rp-key.pem').toString(),
    cert : fs.readFileSync('./ssl/rp-cert.pem').toString()
  };

  require('https').createServer(options, app).listen(app.get('port'), function(){
    console.log("Express server listening on port " + app.get('port'));
  });
}
else {
  app.listen(argv.port);
  console.log('Listening on port', argv.port);
}
