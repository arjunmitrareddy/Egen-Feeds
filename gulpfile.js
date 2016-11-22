var gulp = require('gulp');
var plugins = require('gulp-load-plugins')();
var runSequence = require('run-sequence');
var wiredep = require('wiredep').stream;
var del = require('del');
var mergeStream = require('merge-stream');
var args = process.argv.slice(3);
require('events').EventEmitter.prototype._maxListeners = 100;
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
        gulp.src('public/templates/*.html').pipe(gulp.dest('build/public/templates')))

});

gulp.task('babelify-client', () => {
    var assets = plugins.useref({searchPath: './'});
    var cssFilter = plugins.filter('**/*.css', {restore: true});
    var jsFilter = plugins.filter('**/*.js', {restore: true});
    gulp.src('public/index.html').pipe(plugins.plumber()).pipe(assets).pipe(cssFilter).pipe(plugins.csso({comments: false})).pipe(plugins.sourcemaps.init()).pipe(plugins.sourcemaps.write('./')).pipe(cssFilter.restore)
        .pipe(jsFilter).pipe(jsFilter.restore)
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

gulp.task('heroku', (callback) => {
    runSequence('clean', 'cache-templates', 'css', 'wire-dep', 'copy', 'babelify-client', 'babelify-server', callback);

});

gulp.task('exit', () => {
    process.exit(0);
});


gulp.task('serve', (callback) => {
    runSequence('clean', 'cache-templates', 'css', 'wire-dep', 'copy', 'babelify-client', 'babelify-server', 'server', callback);
});