'use strict';

/**
 * Dependencies
 **/
const gulp = require('gulp'),
	pkg = require('./package.json'),
	runSequence = require('run-sequence'),
	connect = require('gulp-connect'),
	plumber = require('gulp-plumber'),
	zip = require('gulp-zip'),
	jshint = require('gulp-jshint'),
	watchify = require('watchify'),
	browserify = require('browserify'),
	stringify = require('stringify'),
	sourcemaps = require('gulp-sourcemaps'),
	source = require('vinyl-source-stream'),
	buffer = require('vinyl-buffer'),
	template = require('gulp-template'),
	gulpif = require('gulp-if'),
	del = require('del'),
	rename = require('gulp-rename'),
	path = require('path'),
	gutil = require('gulp-util'),
	minifyCss = require('gulp-minify-css'),
	sass = require('gulp-sass'),
	merge = require('merge-stream'),
	_ = require("lodash"),
	uglify = require('gulp-uglify');



const knownOptions = {
  string: 'env',
  default: { env: process.env.NODE_ENV || 'developement' }
};

const options = require("minimist")(process.argv.slice(2),knownOptions);
const buildDirName = options.env=="production"?"dist":"build";

function browserified(source){ 
	return browserify({
		cache: {},
	    packageCache: {},
		entries: source,
		debug:true,
		transform:[
			[stringify,{extensions: ['.html']}]
		]
	});
}


function eachProject(callback){
	return _.reduce(pkg.projects,function(list,project){ 
		list.add(callback(project));
		return list;
	},merge());
}


function bundle(b,dest){
	var basename = path.basename(dest);
	var dirname = path.dirname(dest);
	return b
	    .bundle()
		.on('error', gutil.log.bind(gutil, 'Browserify Error'))
	   	.pipe(source(basename))
	   	.pipe(buffer())
	   	.pipe(sourcemaps.init({loadMaps: true}))
	   	.pipe(gulpif(options.env == "production", uglify({mangle: false})))
    	.pipe(sourcemaps.write('./'))
    	.pipe(gulp.dest(dirname))
}

function task_build_index(project){
	var destDirname = path.dirname(project[buildDirName]+project.bundle.css.dest);
	return gulp.src(project.source+'/index.html')
        .pipe(template({
        	ngtitle:  project.name,
        	bundleJS: project.bundle.js.dest,
        	bundleCSS: project.bundle.css.dest
        }))
        .pipe(gulp.dest(destDirname));
}

function task_browserify(project){
	return bundle(browserified(project.source+project.bundle.js.src),project[buildDirName]+project.bundle.js.dest);
}

function task_lintjs(project){
	return gulp.src(project.source+'/**/*.js')
	    .pipe(jshint())
	    .pipe(jshint.reporter('default'));
}

function task_watchify(project){
	var watchified = watchify(browserified(project.source+project.bundle.js.src));
	watchified.on('update',function(){
		bundle(watchified,project[buildDirName]+project.bundle.js.dest);
	});
	watchified.on('log', gutil.log);
	return bundle(watchified,project[buildDirName]+project.bundle.js.dest);
}

function task_sass(project){
	var destBasename = path.basename(project[buildDirName]+project.bundle.css.dest);
		var destDirname = path.dirname(project[buildDirName]+project.bundle.css.dest);
		return gulp.src(project.source+project.bundle.css.src)
		  .pipe(rename(destBasename))
		  .pipe(sourcemaps.init({loadMaps: true}))
		  .pipe(sass().on('error', sass.logError))
		  .pipe(gulpif(options.env == "production", minifyCss()))
		  .pipe(sourcemaps.write('./'))
		  .pipe(gulp.dest(destDirname));
}

function task_assets(project){
	return gulp.src(project.source+project.bundle.assets.src+'/**/*')
	.pipe(gulp.dest(project[buildDirName]+project.bundle.assets.dest))
}

gulp.task('browserify',function(){
	return eachProject(task_browserify);
});

gulp.task('lint:js',function(){
	return eachProject(task_lintjs);
});

gulp.task('watchify',function(){
	return eachProject(task_watchify);
});

gulp.task('assets',function(){
	return eachProject(task_assets);
});


gulp.task('sass', function () {
	return eachProject(task_sass);
});

gulp.task('build-index',function(){
	return eachProject(task_build_index);
});

gulp.task('serve',function(){
	connect.server({
		root:'build',
		port:1984
	});
});

gulp.task('default',function(){
console.log(options);
	if(options.env == "production"){
		return runSequence(
			['lint:js'],
			['watchify','sass']
		);
	}else{
		_.each(pkg.projects,function(project){
			gulp.watch(project.source+'/**/*.scss',function(event){
				console.log('File ' + path.basename(event.path) + ' was ' + event.type + ', running task "sass"');
				return task_sass(project);
			});
			gulp.watch(project.source+'/assets/**/*',function(event){
				console.log('File ' + path.basename(event.path) + ' was ' + event.type + ', running task "assets"');
				return task_assets(project);
			});
			//gulp.watch(project.source+'/**/*.js',function(event){
			//	console.log('File ' + path.basename(event.path) + ' was ' + event.type + ', running task "lintjs"');
			//	return task_lintjs(project);
			//});
			gulp.watch(project.source+'/index.html',function(event){
				console.log('File ' + path.basename(event.path) + ' was ' + event.type + ', running task "build-index"');
				return task_build_index(project);
			});

		});
		return runSequence(
			['lint:js'],
			['build-index','watchify','sass','assets'],
			['serve']
		);
	}
});



