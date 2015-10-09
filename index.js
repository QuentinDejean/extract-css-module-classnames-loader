var processCss = require('css-loader/lib/processCss');
var loaderUtils = require('loader-utils');
var mkpath = require('mkpath');
var path = require('path');
var fs = require('fs');

var files = {};
var timer;

module.exports = function (source, map) {
  if (this.cacheable) this.cacheable();
  var currentFilePath = this.resourcePath;
  var query = loaderUtils.parseQuery(this.query);
  var moduleMode = query.modules || query.module;
  var outputFile = query.outputFile;
  var rootPath = query.rootPath || '/';
  var minimalJson = !!query.minimalJson;
  var options = this.options.extractCssModuleClassnames || {};

  processCss(source, null, {
    mode: moduleMode ? 'local' : 'global',
    loaderContext: {
      options: {
        context: this.options.context
      },
      // Note! This assumes that `extract-css-module-classnames-loader` is directly in front of
      // the `css-loader`
      loaderIndex: this.loaderIndex - 1,
      resource: this.resource,
      loaders: this.loaders,
      request: this.request
    },
    query: query
  }, function(err, result) {
    if (err) throw err;

    files[relativePath(currentFilePath)] = {};
    Object.keys(result.exports).forEach(function(key) {
      var classes = result.exports[key].split(/\s+/);
      classes = classes.map(function (className) {
        result.importItemRegExpG.lastIndex = 0;

        if (result.importItemRegExpG.test(className)) {
          var match = result.importItemRegExp.exec(className);
          var idx = +match[1];
          var importItem = result.importItems[idx];
          var fullUrl = path.resolve(path.dirname(currentFilePath), importItem.url);
          return [relativePath(fullUrl), importItem.export];
        } else {
          return className;
        }
      });
      files[relativePath(currentFilePath)][key] = classes;
    });

    if (options.onOutput && typeof options.onOutput === 'function') {
      options.onOutput(currentFilePath, files[relativePath(currentFilePath)], files);
    } else {
      if (!outputFile) {
        throw new Error('Missing outputFile parameter in extract-css-module-classnames-loader');
      }
      clearTimeout(timer);
      timer = setTimeout(function () {
        mkpath(path.dirname(outputFile), function (err) {
          if (err && err.code !== 'EEXIST') throw err;
          var json;
          if (minimalJson) {
            json = JSON.stringify(files);
          } else {
            json = JSON.stringify(files, null, 2);
          }
          fs.writeFile(outputFile, json);
        });
      }, 100);
    }
  });

  function relativePath(fullPath) {
    return path.relative(rootPath, fullPath);
  }

  return source;
};
