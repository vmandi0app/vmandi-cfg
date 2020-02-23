(function () {


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
      var elems = $('link[rel="stylesheet"]:not([data-boot-exclude])', tempDom);
      elems.each(function (i, el) {
        var src = el.getAttribute('href');
        if (src) {
          src = src !== cssEntryPoint ? src : STATIC_SERVER + '/' + cssEntryPoint + '?_=' + new Date().getTime();
          // $('<link rel="stylesheet" href="' + src + '">').appendTo(document.head)
          console.log(src);
        }
      })
      elems = $('script:not([data-boot-exclude])', tempDom);
      // $('script,link,meta,title', tempDom).remove();
      // var html = tempDom.html().trim();
      // $(html).appendTo(document.body);

      elems.each(function (i, el) {
        var src = el.getAttribute('src');
        if (src) {
          src = src !== cssEntryPoint ? src : STATIC_SERVER + '/' + jsEntryPoint + '?_=' + new Date().getTime();
          // $('<script src="' + src + '"></script>').appendTo(document.body);
          console.log(src);
        }
      })

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
