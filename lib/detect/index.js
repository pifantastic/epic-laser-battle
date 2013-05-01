
/**
 * Core.
 */
var fs = require('fs');
var path = require('path');

/**
 * NPM
 */
var async = require('async');
var cv = require('opencv');
var request = require('request');
var Tempfile = require('temporary/lib/file');
var im = require('imagemagick');
var LRU = require('lru-cache');

// LRU cache to avoid re-downloading images
// over and over and over again.
var CACHE = new LRU(1000);

// HAAR Cascade files.
var DATA = __dirname + '/data/';
var FACE = path.join(DATA, 'haarcascade_frontalface_default.xml');
var EYES = path.join(DATA, 'haarcascade_eye.xml');
var EYES_SMALL = path.join(DATA, 'haarcascade_mcs_eyepair_small.xml');
var EYES_BIG = path.join(DATA, 'haarcascade_mcs_eyepair_big.xml');
var LEFT_EYE = path.join(DATA, 'haarcascade_mcs_lefteye.xml');
var RIGHT_EYE = path.join(DATA, 'haarcascade_mcs_righteye.xml');
var LEFT_EAR = path.join(DATA, 'haarcascade_mcs_leftear.xml');
var RIGHT_EAR = path.join(DATA, 'haarcascade_mcs_rightear.xml');
var MOUTH = path.join(DATA, 'haarcascade_mcs_mouth.xml');
var NOSE = path.join(DATA, 'haarcascade_mcs_nose.xml');

/**
 * Download the image at a specific URL to a temporary file.
 *
 * @param  {String}   url
 * @param  {Function} callback
 * @return {String}   The path to the downloaded file.
 */
var download = function (url, callback) {
  var key = 'download:' + url;

  var cached = CACHE.get(key);
  if (typeof cached !== 'undefined') {
    callback(null, cached);
  }

  var tmp = new Tempfile();

  request(url)
    .on('error', callback)
    .on('end', function () {
      CACHE.set(key, tmp.path);
      callback(null, tmp.path);
    })
    .pipe( fs.createWriteStream(tmp.path) );
};

var resize = function (src, dest, width, height, callback) {
  var key = 'resize:' + src + ':' + width + ':' + height;

  var cached = CACHE.get(key);
  if (typeof cached !== 'undefined') {
    return callback(null, cached);
  }

  im.identify(src, function (err, id) {
    if (err) {
      return callback(err);
    }

    if (id.width > width && id.height > height) {
      CACHE.set(key, false);
      return callback(null, false);
    }

    im.resize({
      srcPath : src,
      dstPath : dest,
      width : width,
      height : height
    }, function (err, stdout) {
      if (err) {
        return callback(err);
      }

      CACHE.set(key, true);
      callback(null, true);
    });
  });

};

exports.features = function (url, callback) {
  var key = 'features:' + url;

  var cached = CACHE.get(key);
  if (typeof cached !== 'undefined') {
    return callback(null, cached);
  }

  async.waterfall([
    // Download image.
    function (cb) {
      download(url, cb);
    },
    // Read image.
    function (path, cb) {
      cv.readImage(path, cb);
    }
  ], function (err, image) {
    if (err) {
      return callback(err);
    }

    // Find features on image.
    async.parallel({
      face : featureDetectFn(image, FACE),
      eyes : featureDetectFn(image, EYES),
      eyesBig : featureDetectFn(image, EYES_BIG),
      eyesSmall : featureDetectFn(image, EYES_SMALL),
      leftEye : featureDetectFn(image, LEFT_EYE),
      rightEye : featureDetectFn(image, RIGHT_EYE),
      mouth : featureDetectFn(image, MOUTH),
      nose : featureDetectFn(image, NOSE),
      leftEar : featureDetectFn(image, LEFT_EAR),
      rightEar : featureDetectFn(image, RIGHT_EAR)
    }, function (err, result) {
      if (err) {
        return callback(err);
      }

      // Remove empty features.
      for (var feature in result) {
        if (result[feature].length === 0) {
          delete result[feature];
        }
      }

      CACHE.set(key, result);
      callback(null, result);
    });
  });
};

var featureDetectFn = function (image, feature) {
  return function (callback) {
    image.detectObject(feature, {}, callback);
  };
};
