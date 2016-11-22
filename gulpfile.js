var gulp = require('gulp');
var plugins = require('gulp-load-plugins')();
var runSequence = require('run-sequence');
var wiredep = require('wiredep').stream;
var del = require('del');
var assign = require('lodash/assign');
var browserify = require('browserify');
var watchify = require('watchify');
var babelify = require('babelify');
var mergeStream = require('merge-stream');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var args = process.argv.slice(3);

gulp.task('clean', () => {
    del(['build']);
});

gulp.task('css', () => {
    return gulp.src('public/scss/*.scss')
        .pipe(plugins.sass())
        .pipe(plugins.sass.sync().on('error', plugins.sass.logError))
        .pipe(plugins.autoprefixer({
            browsers: ['last 5 versions']
        }))
        .pipe(gulp.dest('public/css'));
});

gulp.task('wire-dep', () => {
    var injectJsFiles = [
        'public/js/**/*.module.js',
        'public/js/**/*.config.js',
        'public/js/*.js'
    ];
    var wireDepOptions = {
        bowerJson: require('./bower.json'),
        directory: 'bower_components',
        ignorePath: '..'
    };
    return gulp
        .src('public/index.html')
        .pipe(wiredep(wireDepOptions))
        .pipe(plugins.inject(gulp.src(injectJsFiles)))
        .pipe(plugins.inject(gulp.src('public/css/*.css')))
        .pipe(gulp.dest('public'));
});

gulp.task('copy', () => {
    return mergeStream(
        gulp.src('public/imgs/**/*').pipe(plugins.imagemin({optimizationLevel: 4})).pipe(gulp.dest('build/public/imgs/')),
        gulp.src([
            'bower_components/bootstrap/fonts/*',
            'bower_components/font-awesome/fonts/*'
        ]).pipe(gulp.dest('build/public/fonts')),
        gulp.src('public/json/*.json').pipe(gulp.dest('build/public/json')),
        gulp.src('public/manifest.json').pipe(gulp.dest('build/public')),
        gulp.src('public/templates/*.html').pipe(gulp.dest('build/public/templates')))

});

function createBundle(src) {
    if (!src.push) {
        src = [src];
    }

    var customOpts = {
        entries: src,
        debug: true
    };
    var opts = assign({}, watchify.args, customOpts);
    var b = watchify(browserify(opts));

    b.transform(babelify.configure({
        stage: 1
    }));

    b.on('log', plugins.util.log);
    return b;
}

function bundle(b, outputPath) {
    var splitPath = outputPath.split('/');
    var outputFile = splitPath[splitPath.length - 1];
    var outputDir = splitPath.slice(0, -1).join('/');

    return b.bundle()
        .on('error', plugins.util.log.bind(plugins.util, 'Browserify Error'))
        .pipe(source(outputFile))
        .pipe(buffer())
        .pipe(plugins.sourcemaps.init({loadMaps: true}))
        .pipe(plugins.sourcemaps.write('./'))
        .pipe(gulp.dest('build/public/' + outputDir));
}

var jsBundles = {
    'js/polyfills/promise.js': createBundle('./public/js/polyfills/promise.js'),
    'js/polyfills/url.js': createBundle('./public/js/polyfills/url.js'),
    'sw.js': createBundle(['./public/js/sw/index.js', './public/js/sw/preroll/index.js'])
};

gulp.task('client-bundler', () => {
    return mergeStream.apply(null,
        Object.keys(jsBundles).map(function(key) {
            return bundle(jsBundles[key], key);
        })
    );
});



gulp.task('babelify-client', () => {
    var assets = plugins.useref({searchPath: './'});
    var cssFilter = plugins.filter('**/*.css', {restore: true});
    var jsFilter = plugins.filter(['**/*.js', '!**/*.*.js'], {restore: true});
    var appJsFilter = plugins.filter('**/*.*.js', {restore: true});
    gulp.src('public/index.html').pipe(plugins.plumber()).pipe(assets).pipe(cssFilter).pipe(plugins.csso({comments: false})).pipe(plugins.sourcemaps.init()).pipe(plugins.sourcemaps.write('./')).pipe(cssFilter.restore)
        .pipe(jsFilter).pipe(plugins.uglify()).pipe(jsFilter.restore)
        .pipe(appJsFilter).pipe(plugins.uglify()).pipe(plugins.babel({stage: 1})).pipe(jsFilter.restore)
        .pipe(gulp.dest('build/public'))
});

gulp.task('babelify-server', () => {
    return gulp.src('server/**/*.js')
        .pipe(plugins.babel({stage: 1}))
        .on('error', plugins.util.log.bind(plugins.util))
        .pipe(gulp.dest('build/server'));
});

gulp.task('cache-templates', () => {
    var templateCacheOptions = {
        file: 'app.templatesCache.js',
        options: {
            module: 'egen-feed',
            standAlone: false,
            root: '/templates'
        }
    };
    return gulp
        .src('public/templates/*.html')
        .pipe(plugins.minifyHtml({empty: true}))
        .pipe(plugins.angularTemplatecache(
            templateCacheOptions.file,
            templateCacheOptions.options
        ))
        .pipe(gulp.dest('public/js'))
});

gulp.task('server', () => {
    plugins.developServer.listen({
        path: './index.js',
        cwd: './build/server',
        args: args
    });
    gulp.watch([
        'build/server/**/*.js'
    ], plugins.developServer.restart);
});

gulp.task('refresh', (callback) => {
    runSequence('css', 'wire-dep', 'copy', 'babelify-client', 'cache-templates', 'client-bundler', 'babelify-server', callback);
});

gulp.task('heroku', (callback) => {
    runSequence('clean', 'cache-templates', 'css', 'wire-dep', 'copy', 'babelify-client', 'client-bundler', 'babelify-server','exit', callback);

});

gulp.task('exit', () => {
    process.exit(0);
});


gulp.task('serve', (callback) => {
    runSequence('clean', 'cache-templates', 'css', 'wire-dep', 'copy', 'babelify-client', 'client-bundler', 'babelify-server', 'server', callback);
});