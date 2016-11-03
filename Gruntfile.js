module.exports = function(grunt) {
	// Load grunt tasks automatically
	require('load-grunt-tasks')(grunt);

	// Time how long tasks take. Can help when optimizing build times
	require('time-grunt')(grunt);

	grunt.loadNpmTasks('grunt-serve');
	// Configurable paths for the application
	var appConfig = {
		app: require('./bower.json').appPath || 'app',
		dist: 'dist'
	};

	// Define the configuration for all the tasks
	grunt.initConfig({

		serve: {
			options: {
				port: 9000,
				hostname: 'localhost'
			}
		},

		//The actual grunt server settings
		connect: {
			options: {
				port: 9000,
				hostname: 'localhost',
				livereload: 35729,
				useAvailablePort: false,
				protocol: 'http',
				base: './apps/index.html'
			}
		}
	});
};	