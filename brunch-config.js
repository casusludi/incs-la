// See http://brunch.io for documentation.

exports.files = {
  javascripts: {
    joinTo: {
      'vendor.js': /^(?!app)/, // Files that are not in `app` dir.
      'app.js': /^app/
    }
  },
  stylesheets: {
    joinTo: {
      'app.css': /^app/
    },
    order:{
      before:["app/styles/init.css"]
    }
  }
};

exports.paths = {

}

exports.plugins = {
   autoReload: {
     /* enabled: {
        css: on,
        js: on,
        assets: off
      },
      port: [1234, 2345, 3456],*/
  },
  babel: {
    presets: ["env"], 
    plugins: [ 
      "syntax-jsx", 
      "transform-object-rest-spread",
      ["transform-react-jsx", {"pragma": "html"}]
    ]
  },
  postcss: {
    processors: [
      require("postcss-import")({
        path : [__dirname]
      }),
      // require("postcss-url")(),
      require("postcss-cssnext")(),
      require("postcss-browser-reporter")(),
      require("postcss-reporter")()
    ],
    options: {
      use: [
        require('postcss-nesting')({ /* options */ })
      ]
    }
  }
};
