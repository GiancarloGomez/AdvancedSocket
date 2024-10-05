module.exports = function( grunt ) {

    // tasks
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-eslint');
    grunt.loadNpmTasks('grunt-terser');

    // register tasks
    grunt.registerTask('build',   ['eslint','concat','terser']);
    grunt.registerTask('default', ['build']);

    // initialize
    grunt.initConfig({

        pkg : grunt.file.readJSON('package.json'),

        banner : [
            ' // ----------------------------------------------------------------------------',
            ' // <%= pkg.description %>',
            ' // v<%= pkg.version %> - released <%= grunt.template.today("yyyy-mm-dd HH:MM") %>',
            ' // <%= pkg.versionDetails %>',
            ' // Licensed under the MIT license.',
            ' // <%= pkg.homepage %>',
            ' // ----------------------------------------------------------------------------',
            ' // Copyright (C) 2013-<%= grunt.template.today("yyyy") %> <%= pkg.author %>',
            ' // ----------------------------------------------------------------------------',
            '\n'
        ].join('\n'),

        concat: {
            options: {
                stripBanners: true,
                banner: '<%= banner %>',
            },
            dist: {
                src: ['src/advancedsocket.js'],
                dest: 'dist/advancedsocket.full.js',
            },
        },

        eslint: {
            files: [
                'gruntfile.js',
                'src/**/*.js',
            ],
        },

        terser: {
            options: {
                format : {
                    ecma        : 2016,
                    quote_style : 3
                }
            },
            js : {
                files : [{
                    expand : true,
                    src    : 'dist/*.full.js',
                    ext    : '.min.js'
                }]
            }
        },
    });

};