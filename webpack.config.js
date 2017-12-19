const path = require('path');
//const ExtractTextPlugin = require("extract-text-webpack-plugin");
//const extractCSS = new ExtractTextPlugin({ filename: 'bundle.css', allChunks: true });
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const indexHtml = new HtmlWebpackPlugin({
    template: 'app/assets/index.html',
    filename: 'index.html'
})

module.exports = {
    entry: './app/initialize.js',
    devtool: 'inline-source-map',
    devServer: {
        contentBase: './public',
        historyApiFallback: true,
        port: 1997,
        hot: true
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
                test: /\.(png|jpg|gif|svg|eot|ttf|woff|woff2)$/,
                loader: 'url-loader',
                options: {
                  limit: 10000
                },
            },
            {
                test: /\.css$/,
                use: [ 
                    'style-loader',
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
                /*use: ['css-hot-loader'].concat(extractCSS.extract({
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
                }))*/
            }
        ]
    },
    plugins: [
        indexHtml,
        new webpack.NamedModulesPlugin(),
        new webpack.HotModuleReplacementPlugin()
	]
};