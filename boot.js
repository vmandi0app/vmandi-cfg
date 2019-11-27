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

	var css_files = options.files.filter(function (file) {
		return endsWith(file, '.css');
	});
	css_files.forEach(function (file) {
		loadCss(file);
	});
	var js_files = options.files.filter(function (file) {
		return endsWith(file, '.js');
	});

	loadJs(js_files, cb);
}


function $findLocalServer(mi, cb, i) {
	i = i || 2;
	var err;
	var url = 'http://192.168.1.' + i
		+ ':53240/static/_dbg.json?r=' + Math.random();
	$.getJSON(url, function (json) {
		cb(err, 'http://192.168.1.' + i + ':53240');
	}).fail(function () {
		if (i <= mi) {
			$findLocalServer(mi, cb, i + 1);
		} else {
			cb('unable to find boot.json');
		}
	});
}

function $onboot(boot) {
	if (boot.versionCode > BuildInfo.versionCode) {
		alert('New Updates available');
		window.open('market://details?id=' + BuildInfo.packageName, '_system', 'location=yes');
		return $vmandi.exit();
	}
	window.ROOT_SERVER = boot.server;
	window.STATIC_SERVER = boot.server + '/static';
	// var libs = boot.libs.map(function (lib) {
	// 	return STATIC_SERVER + '/' + lib;
	// });
	$loadScripts({
		files: boot.libs,
		debug: _DEBUG
	}, function () {
		var app_url = STATIC_SERVER + '/' + boot.app + '?r=' + Math.random();
		$.ajax({
			url: app_url,
			timeout: 5000,
		}).done(function (data) {
			var tempDom = $('<temp>').append(data);
			var jsfile = $('script[data-entry-point]', tempDom).attr('src');
			var cssfile = jsfile.split('.js').join('') + '.css';
			$('script,link,meta,title', tempDom).remove();
			var html = tempDom.html().trim();

			$(html).appendTo(document.body);
			$loadScripts({
				files: [
					STATIC_SERVER + '/' + cssfile,
					STATIC_SERVER + '/' + jsfile
				],
				withCache: false,
				debug: _DEBUG
			});
		}).fail(function (jqXHR, textStatus, exception) {
			$vmandi.exit('not found app in remote server.');
		});
	});
}


(function () {
	window._DEBUG = BuildInfo.debug;
	var json = {
		server: "https://vmandi.acmems.in",
		libs: [
			'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.11.2/css/all.min.css',
			'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.11.2/css/v4-shims.min.css',
			'https://cdnjs.cloudflare.com/ajax/libs/ol3/4.6.5/ol.js',
			'https://cdnjs.cloudflare.com/ajax/libs/ol3/4.6.5/ol.css',
			'https://cdnjs.cloudflare.com/ajax/libs/photoswipe/4.1.3/photoswipe.min.js',
			'https://cdnjs.cloudflare.com/ajax/libs/photoswipe/4.1.3/photoswipe.min.css',
			'https://cdnjs.cloudflare.com/ajax/libs/photoswipe/4.1.3/photoswipe-ui-default.min.js',
			'https://cdnjs.cloudflare.com/ajax/libs/photoswipe/4.1.3/default-skin/default-skin.min.css',
			'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.6/cropper.min.js',
			'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.6/cropper.min.css',
			'https://cdnjs.cloudflare.com/ajax/libs/fastclick/1.0.6/fastclick.min.js',
			'https://cdnjs.cloudflare.com/ajax/libs/knockout/3.5.0/knockout-min.js',
			'https://cdn.jsdelivr.net/npm/knockout-secure-binding/dist/knockout-secure-binding.min.js'
		],
		app: "index.html",
		versionCode: 1
	}
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

