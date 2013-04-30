
var https = require('https');
var http = require('http');
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
  .describe('secure-port', 'Port to run secure server on.')
  .default('secure-port', 443)
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
    key : fs.readFileSync('./ssl/key.pem').toString(),
    ca: [fs.readFileSync('./ssl/ca.primary').toString(), fs.readFileSync('./ssl/ca.secondary').toString()],
    cert : fs.readFileSync('./ssl/cert.pem').toString()
  };

  require('https').createServer(options, app).listen(argv['secure-port'], function () {
    console.log('secure server listening on port', argv['secure-port']);
  });
}

http.createServer(app).listen(argv.port);
console.log('server listening on port', argv.port);
