(function () {

	function $loadScripts(options, cb) {
		options = options || {}
		options.files = options.files || [];
		options.withCache = options.withCache || true;
		options.debug = options.debug || false;
		cb = cb || function () { };
		var m_head = document.getElementsByTagName("head")[0];
		function log(t) {
			if (options.debug) { console.log('loadScripts: ' + t); }
		}
		function normalizeFile(filename) {
			if (!options.withCache) {
				if (filename.indexOf('?') === -1)
					filename += '?no_cache=' + new Date().getTime();
				else
					filename += '&no_cache=' + new Date().getTime();
			}
			return filename;
		}
		function endsWith(str, suffix) {
			if (str === null || suffix === null)
				return false;
			return str.indexOf(suffix, str.length - suffix.length) !== -1;
		}
		function loadCss(filename) {
			// HTMLLinkElement
			var link = document.createElement("link");
			link.rel = "stylesheet";
			link.type = "text/css";
			link.href = normalizeFile(filename);

			log('Loading style ' + filename);
			link.onload = function () {
				log('Loaded style "' + filename + '".');
			};

			link.onerror = function () {
				log('Error loading style "' + filename + '".');
			};

			m_head.appendChild(link);
		}

		function loadJs(libs, oncomplete) {
			var lib = libs[0];
			if (lib) {
				var script = document.createElement('script');
				script.type = 'text/javascript';
				script.src = normalizeFile(lib);
				script.onload = function () {
					log('Loaded script "' + lib + '".');
					libs.shift();
					loadJs(libs, oncomplete);
				};
				script.onerror = function () {
					log('Error loading script "' + lib + '".');
					libs.shift();
					loadJs(libs, oncomplete);
				}
				log('Loading script "' + lib + '".');
				m_head.appendChild(script);
			} else {
				oncomplete();
			}
		}

		var jsfiles = []
		options.files.forEach(function (file, i, array) {
			if (endsWith(file, '.css')) {
				loadCss(file);
			} else if (endsWith(file, '.js')) {
				jsfiles.push(file)
			}
			if (array.length === i) loadJs(jsfiles, cb);
		});
	}


	function $findLocalServer(mi, cb, i) {
		i = i || 2;
		$.ajax({
			url: 'http://192.168.1.' + i + ':53240/',
			method: 'HEAD',
			timeout: 250,
			cache: false
		})
			.done(function () {
				cb(null, 'http://192.168.1.' + i + ':53240');
			})
			.fail(function () {
				if (i < mi) {
					$findLocalServer(mi, cb, i + 1);
				} else {
					cb('unable to find local server');
				}
			});
	}

	function $onboot(boot) {
		console.log('versionCode:', BuildInfo.versionCode);
		if (boot.versionCode > BuildInfo.versionCode) {
			alert('New Updates available');
			window.open('market://details?id=' + BuildInfo.packageName, '_system', 'location=yes');
			return $vmandi.exit();
		}
		window.ROOT_SERVER = boot.server;
		window.STATIC_SERVER = boot.server + '/static';
		var app_url = STATIC_SERVER + '/' + boot.app;
		$.ajax({
			url: app_url,
			timeout: 5000,
			cache: false
		}).done(function (data) {
			var tempDom = $('<temp>').append(data);
			var jsEntryPoint = $('script[data-entry-point]', tempDom).attr('src');
			var cssEntryPoint = jsEntryPoint.split('.js').join('') + '.css';
			var libs = [], scripts = $('link[rel="stylesheet"]:not([data-boot-exclude])', tempDom);

			for (var i = 0; i < scripts.length; i++) {
				var src = scripts[i].getAttribute('href');
				if (src && src !== cssEntryPoint) {
					libs.push(src);
				}
			}
			$loadScripts({ files: libs }, function () {
				$loadScripts({
					files: [STATIC_SERVER + '/' + cssEntryPoint],
					withCache: false
				}, function () {

					libs = [];
					scripts = $('script:not([data-boot-exclude])', tempDom);
					for (var i = 0; i < scripts.length; i++) {
						var src = scripts[i].getAttribute('src');
						if (src && src !== jsEntryPoint) {
							libs.push(src);
						}
					}

					$loadScripts({ files: libs }, function () {
						$('script,link,meta,title', tempDom).remove();
						var html = tempDom.html().trim();
						$(html).appendTo(document.body);

						$loadScripts({
							files: [STATIC_SERVER + '/' + jsEntryPoint],
							withCache: false
						});
					});

				});
			});

		}).fail(function (jqXHR, textStatus, exception) {
			$vmandi.exit('not found app in remote server.');
		});
	}

	var major = 1,
		minor = 1,
		patch = 0;
	var json = {
		server: "https://vmandi.acmems.in",
		app: "index.html",
		versionCode: major * 10000 + minor * 100 + patch
	}
	window._DEBUG = BuildInfo.debug;
	if (!_DEBUG) {
		$onboot(json);
	} else {
		$findLocalServer(10, function (err, server) {
			if (err) {
				$vmandi.exit(err);
			} else {
				json.server = server;
				$onboot(json);
			}
		});
	}
})();

