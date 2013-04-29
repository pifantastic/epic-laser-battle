
module.exports = function (grunt) {
  grunt.initConfig({
    pkg : grunt.file.readJSON('package.json'),
    license : grunt.file.read('LICENSE.txt'),
    concat : {
      options : {
        separator : ';',
        banner : '/*! <%= pkg.name %> - v<%= pkg.version %> - ' +
          '<%= grunt.template.today("yyyy-mm-dd") %> */\n\n' +
          '<%= license %>'
      },
      dist : {
        src : [
          'build/header.js',
          'public/js/vendor/jquery.js',
          'public/js/vendor/underscore.js',
          'public/js/main.js',
          'build/footer.js'
        ],
        dest : 'public/epic-laser-battle.js'
      }
    },
    uglify : {
      options : {
        preserveComments : 'some'
      },
      build : {
        files : {
          'public/epic-laser-battle.min.js': ['public/epic-laser-battle.js']
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');

  grunt.registerTask('build', ['concat', 'uglify']);
};
