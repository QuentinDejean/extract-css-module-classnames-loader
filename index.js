const assign = require('lodash.assign');
const processCss = requireFromLocalOrParent('css-loader/lib/processCss');
const getLocalIdent = requireFromLocalOrParent('css-loader/lib/getLocalIdent');
const loaderUtils = require('loader-utils');
const mkpath = require('mkpath');
const path = require('path');
const fs = require('fs');

const files = {};
let timer;

module.exports = (source, map) => {
  if (this.cacheable) this.cacheable();
  const resourcePath = this.resourcePath;
  const query = loaderUtils.parseQuery(this.query);
  const outputFile = query.outputFile;
  const rootPath = query.rootPath || '/';
  const minimalJson = !!query.minimalJson;
  const writeDebounceMs = query.writeDebounceMs || 100;
  const options = this.options.extractCssModuleClassnames || {};
  const processOpts = {
    mode: 'local',
    loaderContext: {
      options: {
        context: this.options.context
      },
      // Note! This assumes that `extract-css-module-classnames-loader` is directly in front of
      // the `css-loader`
      loaderIndex: this.loaderIndex - 1,
      resource: this.resource,
      loaders: this.loaders,
      request: this.request,
      resourcePath: resourcePath
    },
    query: query
  }
  const aliases = getAliases(this.options);
  const importPath = path.relative(rootPath, resourcePath);
  const resourceName = loaderUtils.interpolateName(processOpts.loaderContext, '[name]', {})
  files[resourceName] = files[resourceName] || {};


  processCss(source, null, processOpts, function(err, result) {
    if (err) throw err;

    const extractClass = extractClassName(result)
    Object.keys(result.exports).forEach(function(key) {

      const classes = result.exports[key].split(/\s+/);
      
      if (classes.length === 0) {
        files[resourceName][key] = {}
      } else if (classes.length === 1) {
        files[resourceName][key] = extractClass(classes[0])
      } else {
        files[resourceName][key] = classes.map(extractClass)
      }

    });

    if (!outputFile) {
      throw new Error('Missing outputFile parameter in extract-css-module-classnames-loader');
    }
    clearTimeout(timer);
    timer = setTimeout(function () {
      mkpath(path.dirname(outputFile), function (err) {
        if (err && err.code !== 'EEXIST') throw err;
        let json;
        if (minimalJson) {
          json = JSON.stringify(files);
        } else {
          json = JSON.stringify(files, null, 2);
        }
        fs.writeFile(outputFile, json, function (err) {
          if (err) throw err;
          options.onAfterOutput && options.onAfterOutput(resourcePath, files[resourceName], files);
        });
      });
    }, writeDebounceMs);
  });

  function getAliases (options) {
    // TODO: Investigate if there is a way to leverage
    // the Webpack API to get all the aliases
    const resolveAliases = options.resolve && options.resolve.alias;
    const resolveLoaderAliases = options.resolveLoader && options.resolveLoader.alias;
    return assign({}, resolveAliases || {}, resolveLoaderAliases || {});
  }

  function extractClassName(result) {
    return (className) => {
      if (isClassName(result, className)) {
        return className;
      }

      const importItem = getImportItem(result, className);
      const resolvedPath = resolvePath(importItem.url);
      const composesPath = resolvedPath || path.resolve(path.dirname(resourcePath), importItem.url);

      return [path.relative(rootPath, composesPath), importItem.export];
    }
  }

  function isClassName (result, className) {
    result.importItemRegExpG.lastIndex = 0;
    return !result.importItemRegExpG.test(className);
  }

  /**
   * Return the unaliased path of an aliased import (if any)
   *
   * @param  {String} importPath Import path (e.g. import 'path/to/foo.css')
   * @return {String}            The relative path of an aliased import (if any),
   *                             otherwise empty string
   */
  function resolvePath (importPath) {
    // TODO: Investigate if there is a way to leverage
    // the Webpack API to handle the alias resolution instead
    return Object.keys(aliases).reduce(function (prev, alias) {
      const regex = new RegExp('^' + alias, 'i');
      if (!regex.test(importPath)) { return prev }
      const unaliasedPath = importPath.replace(regex, aliases[alias]);
      return path.resolve(rootPath, unaliasedPath);
    }, '');
  }

  function getImportItem (result, className) {
    const match = result.importItemRegExp.exec(className);
    const idx = +match[1];
    return result.importItems[idx];
  }

  return source;
};

// Needed to make require work with `npm link` since `css-loader`
// is a peerDependency
function requireFromLocalOrParent(id) {
  let parent = module;
  for (; parent; parent = parent.parent) {
    try {
      return parent.require(id);
    } catch(ex) {}
  }
  throw new Error("Cannot find module '" + id + "'");
};