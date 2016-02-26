/**
 * Javascript Task Runner
 * @author Alvin Lin (alvin.lin.dev@gmail.com)
 */

// Dependencies
var gulp = require('gulp');

var compilerPackage = require('google-closure-compiler');
var closureCompiler = compilerPackage.gulp();
var cssnano = require('gulp-cssnano');
var gjslint = require('gulp-gjslint');
var less = require('gulp-less');
var path = require('path');
var plumber = require('gulp-plumber');
var rename = require('gulp-rename');

gulp.task('default', ['js-lint', 'js-compile', 'less']);

gulp.task('js', ['js-lint', 'js-compile']);

gulp.task('lint', ['js-lint']);

gulp.task('js-lint', function() {
  return gulp.src(['./extern/*.js',
                   './shared/*.js',
                   './public/js/**/*.js' ])
    .pipe(gjslint({
      flags: ['--jslint_error indentation',
              '--jslint_error well_formed_author',
              '--jslint_error braces_around_type',
              '--jslint_error unused_private_members',
              '--jsdoc',
              '--max_line_length 80',
              '--error_trace'
             ]
    }))
    .pipe(gjslint.reporter('console'));
});

gulp.task('js-compile', function() {
  var basePath = path.dirname(__filename);

  return gulp.src(['./shared/*.js',
                   './public/js/**/*.js' ])
    .pipe(plumber())
    .pipe(closureCompiler({
      externs: [
        compilerPackage.compiler.CONTRIB_PATH + '/externs/jquery-1.9.js',
        basePath + '/extern/extern.js'
      ],
      warning_level: 'VERBOSE',
      compilation_level: 'ADVANCED_OPTIMIZATIONS',
      js_output_file: 'minified.js'
    }))
    .pipe(gulp.dest('./public/dist'));
});

gulp.task('less', function() {
  return gulp.src('./public/less/styles.less')
    .pipe(plumber())
    .pipe(less({ compress: true}))
    .pipe(autoprefixer())
    .pipe(cssnano())
    .pipe(rename(function(path) {
      path.basename = 'minified';
      path.extname = '.css';
    }))
    .pipe(gulp.dest('./public/dist'));
});

gulp.task('watch-js', function() {
  gulp.watch(['./shared/*.js',
              './public/js/**/*.js'], ['js-compile']);
});

gulp.task('watch-less', function() {
  gulp.watch('./public/less/*.less', ['less']);
});

gulp.task('watch', function() {
  gulp.watch(['./shared/*.js',
              './public/js/**/*.js'], ['js-compile']);
  gulp.watch('./public/less/*.less', ['less']);
});
