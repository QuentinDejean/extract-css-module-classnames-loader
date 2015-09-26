# extract-css-module-classnames-loader

This is a webpack loader that complements the `css-loader`. `css-loader` can be used in module mode to export hashed class names. That works great if you only want to use CSS Modules from Javascript, but if you want to use it server side from another language than Javascript this module can help you.

It's a loader that doesn't transform anything, but just parses out the exported class names and writes them to a JSON file to consume on the server.

## Installation

```
npm install extract-css-module-classnames-loader --save
```

## Usage

This loader takes the same query parameters as the `css-loader` and three more:
* `rootPath` is the common root path for all your css files. It is used to strip the base path in the JSON output.
* `outputFile` is the (full) path and file name of the json file to write the class names to.
* `minimalJson` is if you want the outputted JSON to be indented or not.

## Example webpack config
```
var cssLoaderOptions = {
  modules: true,
  importLoaders: 2
};

var extractCssClassnamesOptions = {
  rootPath: path.join(__dirname, '../', 'src'),
  outputFile: path.join(__dirname, '../', 'build', 'assets', 'css-classes.json'),
  modules: true
};

cssLoaders.push({
  test: /\.css$/,
  loader: [
    'style',
    'css?' + JSON.stringify(cssLoaderOptions),
    'extract-css-module-classnames?' + JSON.stringify(extractCssClassnamesOptions)
  ].join('!')
});
```

## Example output
For these two files:
```
// styles/base.css
.red {
  background: red;
}

// styles/other.css
.alsoRed {
  composes: red from './base.css';
}
```

This will get generated:
```
{
  "styles/base.css": {
    "red": [
      "_5u8_Nx6zE6tDKOFwnKdFn"
    ]
  },
  "styles/other.css": {
    "alsoRed": [
      "O0wvfplwbP4cnCkmkMJqV",
      [
        "styles/base.css",
        "red"
      ]
    ]
  }
}
```

## License

MIT
