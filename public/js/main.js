
(function ($) {

  var windowWidth = $(window).width();
  var windowHeight = $(window).height();

  // Avoid clobbering any existing jQueryies.
  $.noConflict(true);

  // Be kind to folks' cpus.
  var requestAnimationFrame = window.requestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.msRequestAnimationFrame;

  // Takes feature data from the JSON API and returns coordinates that can
  // be used to find facial features.
  var Features = function (elem, data) {
    this.elem = elem;
    this.$elem = $(elem);
    this.data = data;
  };

  // Return a deecent set of coordinates of a facial feature.
  Features.prototype.coords = function () {
    var position = this.$elem.position();

    if (this.data.eyesBig || this.data.eyesSmall) {
      var eyes = this.data.eyesBig ? this.data.eyesBig[0] : this.data.eyesSmall[0];

      return {
        x : position.left + eyes.x + ( eyes.width * (1 / 5) ),
        y : position.top + eyes.y + (eyes.height / 2)
      };
    }
    else if (this.data.leftEye || this.data.rightEye) {
      var eye = this.data.leftEye ? this.data.leftEye[0] : this.data.rightEye[0];

      return {
        x : position.left + eye.x + (eye.width / 2),
        y : position.top + eye.y + (eye.height / 2)
      };
    }
  };

  // Render a laser between the specified start and end coordinates.
  var Laser = function (start, end) {
    this.start = start;
    this.end = end;
  };

  // Fire the laser, fading it out and removing it afterwards.
  Laser.prototype.fire = function (callback) {
    this.x = this.start.x + (this.end.x - this.start.x) / 2;
    this.y = this.start.y + (this.end.y - this.start.y) / 2;

    var dx = this.start.x -this.end.x;
    var dy = this.start.y - this.end.y;

    this.length = Math.round( Math.sqrt( Math.pow(dx, 2) + Math.pow(dy, 2) ) );
    this.angle = -1 * Math.round( Math.atan2(dx, dy) * 180 / Math.PI );

    this.width = Math.round( Math.abs( this.length * Math.sin(this.angle) ) );
    this.height = Math.round( Math.abs( this.length * Math.cos(this.angle) ) );

    var top = this.y - (this.length / 2);

    this.elem = $('<div />')
      .css({
        position : 'absolute',
        width : '3px',
        height : this.length + 'px',
        left : this.x + 'px',
        top : top + 'px',
        'background-color' : 'red',
        'box-shadow' : '0 0 10px 5px red',
        'z-index' : 100,
        '-webkit-transform' : 'rotate(' + this.angle + 'deg)',
        '-moz-transform' : 'rotate(' + this.angle + 'deg)',
        'border-radius' : '50%'
      })
      .appendTo('body')
      .fadeOut('fast', function () {
        callback();
        this.remove();
      });

    return this;
  };

  // Return true if the laser intersects the given element.
  Laser.prototype.intersects = function (elem) {
    var $elem = $(elem);
    var pos = $elem.position();
    var left = pos.left;
    var width = $elem.width();
    var top = pos.top;
    var height = $elem.height();

    var minX = this.start.x;
    var maxX = this.end.x;

    if (this.start.x > this.end.x) {
      minX = this.end.x;
      maxX = this.start.x;
    }

    if (maxX > left + width) {
      maxX = left + width;
    }

    if (minX < left) {
      minX = left;
    }

    if (minX > maxX) {
      return false;
    }

    var minY = this.start.y;
    var maxY = this.end.y;

    var dx = this.end.x - this.start.x;

    if (Math.abs(dx) > 0.0000001) {
      var a = (this.end.y - this.start.y) / dx;
      var b = this.start.y - a * this.start.x;
      minY = a * minX + b;
      maxY = a * maxX + b;
    }

    if (minY > maxY) {
      var tmp = maxY;
      maxY = minY;
      minY = tmp;
    }

    if (maxY > top + height) {
      maxY = top + height;
    }

    if (minY < top) {
      minY = top;
    }

    if (minY > maxY) {
      return false;
    }

    return true;
  };

  // Represents an image that's part of the battle.
  var BattleImage = function (image) {
    this.src = image.src;
    this.image = image;
    this.$image = $(image);
    this.features = null;
    this.direction = { x : 1, y : 1 };
    this.shooting = false;
    this.health = 100;
    this.dead = false;
    this.width = 0;
    this.height = 0;
  };

  // Find the facial features on the image.
  BattleImage.prototype.findfeatures = function () {
    var self = this;
    var url = this.$image.find('img').attr('src');
    if (url.indexOf('://') === -1) {
      url = window.location.protocol + '//' + window.location.host + url;
    }

    return $.getJSON('https://epic-laser-battle.com/detect/features?callback=?', { url : url }).done(function (data) {
      if (data.error) {
        console.error(data.error);
      }

      self.features = new Features(self.image, data.features);
    });
  };

  // Prepare the image for battle. Detaches it from the DOM, leaving behind
  // a placeholder so the original DOM isn't disrupted.
  BattleImage.prototype.ready = function () {
    var self = this;
    var dfd = $.Deferred();

    this.$image.one('load', function () {
      var position = self.$image.offset();
      self.width = self.$image.width();
      self.height = self.$image.height();

      self.$image = self.$image
        .wrap(
          $('<span class="placeholder" />')
            .css({ display : 'inline-block' })
            .width( self.width )
            .height( self.height )
        )
        .detach()
        .css({ opacity : '0.75' })
        .wrap('<div />')
        .after($('<div class="battle-hp" />').css({
          height : '10px',
          'background-color' : 'green',
          'z-index' : 100
        }))
        .parent();

      self.image = self.$image.get(0);

      $('body').append(
        self.$image.css({
          position : 'absolute',
          top : position.top + 'px',
          left : position.left + 'px',
          'z-index' : 100
        })
      );

      dfd.resolve();
    }).each(function () {
      if (this.complete) {
        $(this).load();
      }
    });

    return dfd.promise();
  };

  // Return true of the image shoot.
  // TODO: Make this more interesting.
  BattleImage.prototype.shouldShoot = function () {
    return !this.dead && !this.shooting && Math.random() > 0.98;
  };

  // Fire a laser beam from eyes or mouths or something.
  // TODO: Make this more interesting.
  BattleImage.prototype.shoot = function () {
    var self = this;
    var start = this.features && this.features.coords();

    if (!start) {
      // TODO: What to do if they don't have any detected features?
      return;
    }

    // Find a random point within the window.
    var end = {
      x : Math.round( windowWidth * Math.random() ),
      y : Math.round( windowHeight * Math.random() )
    };

    // Fire ze laser!
    this.shooting = true;
    var laser = new Laser(start, end).fire(function () {
      self.shooting = false;
    });

    return laser;
  };

  // Move the image. Detects window boundaries.
  BattleImage.prototype.move = function () {
    if (this.dead || this.shooting) {
      return;
    }

    var pos = this.$image.position();

    // Move a random distance.
    var distance = Math.round( Math.random() * 4 );

    // Change direction on some probability.
    if (pos.left <= 0) {
      this.direction.x = 1;
    }
    else if (pos.left + this.width > windowWidth) {
      this.direction.x = -1;
    }
    else {
      this.direction.x = Math.random() > 0.99 ? this.direction.x * -1 : this.direction.x;
    }

    if (pos.top <= 0) {
      this.direction.y = 1;
    }
    else if (pos.top + this.height > windowHeight) {
      this.direction.y = -1;
    }
    else {
      this.direction.y = Math.random() > 0.99 ? this.direction.y * -1 : this.direction.y;
    }

    var left = (this.direction.x * distance) + pos.left;
    var top = (this.direction.y * distance) + pos.top;

    // Update the position.
    this.$image.css({
      left : left + 'px',
      top : top + 'px'
    });
  };

  // Take damage. Update the HP bar.
  BattleImage.prototype.damage = function () {
    if (this.dead) {
      return;
    }

    this.health -= 1;
    if (this.health === 0) {
      this.destroy();
    }

    this.$image
      .find('.battle-hp')
      .css({
        width : this.health + '%',
        backgroundColor : 'red'
      })
      .animate({
        backgroundColor : 'green'
      }, 'slow');
  };

  // X(
  BattleImage.prototype.destroy = function () {
    this.dead = true;
    this.$image.remove();
  };

  // Conducts an epic laser battle.
  var Battle = function (images) {
    // Convert DOM images into battle images.
    this.images = _(images).map(function (image) {
      return new BattleImage(image);
    });
  };

  // Find the facial features for all the images that are a
  // part of the battle.
  Battle.prototype.findfeatures = function (callback) {
    return $.when.apply($, _(this.images).map(function (image) {
      return image.ready().then(function () {
        return image.findfeatures();
      });
    }));
  };

  // Start the battle!
  Battle.prototype.commence = function () {
    var self = this;

    var loop = function () {
      _(self.images).each(function (image, index) {
        if ( image.shouldShoot() ) {
          var laser = image.shoot();
          if (laser) {
            _(self.images).each(function (otherImage, otherIndex) {
              if (otherIndex !== index) {
                if ( laser.intersects(otherImage.image) ) {
                  otherImage.damage();
                }
              }
            });
          }
        }
        else {
          image.move();
        }
      });

      requestAnimationFrame( _(loop).bind(this) );
    };

    loop();

    return this;
  };

  $.fn.battle = function () {
    var battle = new Battle( this.toArray() );

    battle.findfeatures().done(function () {
      battle.commence();
    });

    return this;
  };

  // Expose a method for the bookmarklet.
  window.EPICLASERBATTLE = function () {
    $(function () {
      $('img').battle();
    });
  };

})(jQuery);
