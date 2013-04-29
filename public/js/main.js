
(function ($) {

  $.noConflict(true);

  var requestAnimationFrame = window.requestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.msRequestAnimationFrame;

  var Features = function (elem, data) {
    this.elem = elem;
    this.$elem = $(elem);
    this.data = data;
  };

  Features.prototype.coords = function () {
    var position = this.$elem.position();

    if (this.data.eyesBig || this.data.eyesSmall) {
      var eyes = this.data.eyesBig[0] || this.data.eyesSmall[0];

      return {
        x : position.left + eyes.x + ( eyes.width * (1 / 5) ),
        y : position.top + eyes.y + (eyes.height / 2)
      };
    }
    else if (this.data.leftEye || this.data.rightEye) {
      var eye = this.data.leftEye[0] || this.data.rightEye[0];

      return {
        x : position.left + eye.x + (eye.width / 2),
        y : position.top + eye.y + (eye.height / 2)
      };
    }
  };

  var Laser = function (start, end) {
    this.start = start;
    this.end = end;
  };

  Laser.prototype.fire = function (callback) {
    this.x = this.start.x + (this.end.x - this.start.x) / 2;
    this.y = this.start.y + (this.end.y - this.start.y) / 2;

    var dx = this.start.x -this.end.x;
    var dy = this.start.y - this.end.y;

    this.length = Math.round( Math.sqrt( Math.pow(dx, 2) + Math.pow(dy, 2) ) );
    this.angle = -1 * Math.round( Math.atan2(dx, dy) * 180 / Math.PI );

    this.width = Math.round( Math.abs( this.length * Math.sin(this.angle) ) );
    this.height = Math.round( Math.abs( this.length * Math.cos(this.angle) ) );

    this.elem = $('<div />')
      .css({
        position : 'absolute',
        width : '3px',
        height : this.length + 'px',
        left : this.x + 'px',
        top : this.y - (this.length / 2) + 'px',
        'background-color' : 'red',
        'box-shadow' : '0 0 10px 5px red',
        'z-index' : 100,
        '-webkit-transform' : 'rotate(' + this.angle + 'deg)',
        'border-radius' : '50%'
      })
      .appendTo('body')
      .fadeOut('fast', function () {
        callback();
        this.remove();
      });

    var pos = this.elem.position();

    this.p1 = {
      x : this.x,
      y : pos.top
    };
    this.p2 = {
      x : this.x + this.width,
      y : pos.top + this.height
    };

    return this;
  };

  Laser.prototype.intersects = function (elem) {
    var $elem = $(elem);
    var pos = $elem.position();
    var left = $elem.position().left;
    var width = $elem.width();
    var top = pos.top;
    var height = $elem.height();

    var minX = this.p1.x;
    var maxX = this.p2.x;

    if (this.p1.x > this.p2.x) {
        minX = this.p2.x;
        maxX = this.p1.x;
    }

    if (maxX > this.left + this.width)
        maxX = this.left + this.width;

    if (minX < this.left)
        minX = this.left;

    if (minX > maxX)
        return false;

    var minY = this.p1.y;
    var maxY = this.p2.y;

    var dx = this.p2.x - this.p1.x;

    if (Math.abs(dx) > 0.0000001) {
        var a = (this.p2.y - this.p1.y) / dx;
        var b = this.p1.y - a * this.p1.x;
        minY = a * minX + b;
        maxY = a * maxX + b;
    }

    if (minY > maxY) {
        var tmp = maxY;
        maxY = minY;
        minY = tmp;
    }

    if (maxY > this.top + this.height)
        maxY = this.top + this.height;

    if (minY < this.top)
        minY = this.top;

    if (minY > maxY)
        return false;

    return true;
  };

  var BattleImage = function (image) {
    this.src = image.src;
    this.image = image;
    this.$image = $(image);
    this.features = null;
    this.direction = { x : 1, y : 1 };
    this.shooting = false;
    this.health = 100;
    this.dead = false;
  };

  BattleImage.prototype.findfeatures = function () {
    var self = this;
    var url = this.$image.find('img').attr('src');

    return $.getJSON('/detect/features?callback=?', { url : url }).done(function (data) {
      if (data.error) {
        console.error(data.error);
      }

      self.features = new Features(self.image, data.features);
    });
  };

  BattleImage.prototype.ready = function () {
    var self = this;
    var dfd = $.Deferred();

    this.$image.load(function () {
      var position = self.$image.position();

      self.$image = self.$image
        .wrap(
          $('<span class="placeholder" />')
            .css({ display : 'inline-block' })
            .width( self.$image.width() )
            .height( self.$image.height() )
        )
        .detach()
        .css({ opacity : '0.75' })
        .wrap('<div />')
        .after($('<div class="battle-hp" />').css({
          height : '3px',
          'background-color' : 'green',
          'box-shadow' : '0 0 10px 5px green',
          'z-index' : 100,
          'border-radius' : '50%'
        }))
        .parent();

      self.image = self.$image.get(0);

      $('body').append(
        self.$image.css({
          position : 'absolute',
          top : position.top + 'px',
          left : position.left + 'px'
        })
      );

      dfd.resolve();
    });

    return dfd.promise();
  };

  BattleImage.prototype.shouldShoot = function () {
    return !this.dead && !this.shooting && Math.random() > 0.98;
  };

  BattleImage.prototype.shoot = function () {
    var self = this;
    var start = this.features && this.features.coords();

    if (!start) {
      // TODO: What to do if they don't have any detected features?
      return;
    }

    // Find a random point within the window.
    var end = {
      x : Math.round( $(window).width() * Math.random() ),
      y : Math.round( $(window).height() * Math.random() )
    };

    this.shooting = true;
    var laser = new Laser(start, end).fire(function () {
      self.shooting = false;
    });

    return laser;
  };

  BattleImage.prototype.move = function () {
    if (this.dead || this.shooting) {
      return;
    }

    var pos = this.$image.position();

    // Move a random distance.
    var distance = Math.round( Math.random() * 4 );

    // Change direction on some probability.
    this.direction.x = Math.random() > 0.99 ? this.direction.x * -1 : this.direction.x;
    this.direction.y = Math.random() > 0.99 ? this.direction.y * -1 : this.direction.y;

    var left = (this.direction.x * distance) + pos.left;
    var top = (this.direction.y * distance) + pos.top;

    // Update the position.
    this.$image.css({
      left : (left < 0 ? 0 : left) + 'px',
      top : (top < 0 ? 0 : top) + 'px'
    });
  };

  BattleImage.prototype.damage = function () {
    if (this.dead) {
      return;
    }

    this.health -= 1;
    if (this.health === 0) {
      this.destroy();
    }

    this.$image.find('.battle-hp').css({ width : this.health + '%' });
  };

  BattleImage.prototype.destroy = function () {
    this.dead = true;
    this.$image.remove();
  };

  var Battle = function (images) {
    this.images = _(images).map(function (image) {
      return new BattleImage(image);
    });
  };

  Battle.prototype.findfeatures = function (callback) {
    return $.when.apply($, _(this.images).map(function (image) {
      return image.ready().then(function () {
        return image.findfeatures();
      });
    }));
  };

  Battle.prototype.commence = function () {
    var self = this;

    var loop = function () {
      if (!self.stopped) {
        _(self.images).each(function (image, index) {
          if ( image.shouldShoot() ) {
            var laser = image.shoot();
            _(self.images).each(function (otherImage, otherIndex) {
              if (otherIndex !== index) {
                if ( laser.intersects(otherImage.image) ) {
                  otherImage.damage();
                }
              }
            });
          }
          else {
            image.move();
          }
        });
      }

      requestAnimationFrame( _(loop).bind(this) );
    };

    loop();

    return this;
  };

  Battle.prototype.stop = function () {
    this.stopped = true;
    return this;
  };

  Battle.prototype.start = function () {
    this.stopped = false;
    return this;
  };

  $.fn.battle = function () {
    var battle = new Battle( this.toArray() );

    battle.findfeatures().done(function () {
      battle.commence();
    });

    return this;
  };

  $('img').battle();

})(jQuery);
