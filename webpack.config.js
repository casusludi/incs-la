const path = require('path');
const ExtractTextPlugin = require("extract-text-webpack-plugin");
const extractCSS = new ExtractTextPlugin({ filename: 'bundle.css', allChunks: true })

module.exports = {
    entry: './app/initialize.js',
    devtool: 'inline-source-map',
    devServer: {
        contentBase: './public',
        historyApiFallback: true,
        port: 1997
    },
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'public')
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /(node_modules|bower_components)/,
                use: {
                    loader: 'babel-loader'
                }
            },
            {
                test: /\.css$/,
                use: ['css-hot-loader'].concat(extractCSS.extract({
                    fallback: 'style-loader',
                    use: [ 
                        { loader: 'css-loader', options: { importLoaders: 1 } },
                        {
                            loader: 'postcss-loader',
                            options: {
                                ident: 'postcss',
                                plugins: (loader) => {
                                    console.log("path",__dirname);
                                    return [
                                    require('postcss-import')({ path: [__dirname] }),
                                    require('postcss-cssnext')(),
                                    require('postcss-browser-reporter')(),
                                    require('postcss-reporter')(),
                                    require('postcss-nesting')()
                                ]}
                            }
                        }
                    ]
                }))
            }
        ]
    },
    plugins: [
        extractCSS
	]
};