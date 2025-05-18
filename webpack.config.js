import path from 'path';
import { fileURLToPath } from 'url';
import webpack from 'webpack';
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const packageJson = require('./package.json');

// Get dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base configuration that will be extended by environment-specific configs
export default (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    mode: isProduction ? 'production' : 'development',
    entry: './src/index.ts',
    devtool: isProduction ? false : 'inline-source-map',
    output: {
      filename: isProduction ? 'markdown-ify.min.js' : 'markdown-ify.js',
      path: path.resolve(__dirname, 'dist'),
      library: 'MarkdownIfy',
      libraryTarget: 'umd',
      libraryExport: 'default',
      umdNamedDefine: true,
      globalObject: 'this',
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js'],
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
      ],
    },
    optimization: {
      minimize: isProduction,
    },
    plugins: [
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(isProduction ? 'production' : 'development'),
        'process.env.APP_VERSION': JSON.stringify(packageJson.version),
      }),
      // Only include bundle analyzer in production mode when specifically requested
      ...(isProduction && env.analyze ? [new BundleAnalyzerPlugin()] : []),
    ],
    // Generate a bookmarklet version in production mode
    ...(isProduction && {
      devtool: false,
      output: {
        filename: 'markdown-ify.min.js',
        path: path.resolve(__dirname, 'dist'),
      },
      plugins: [
        new webpack.DefinePlugin({
          'process.env.NODE_ENV': JSON.stringify('production'),
          'process.env.APP_VERSION': JSON.stringify(packageJson.version),
        }),
        // Custom plugin to wrap the output in a bookmarklet format
        {
          apply: (compiler) => {
            compiler.hooks.afterEmit.tap('BookmarkletPlugin', (_compilation) => {
              const fs = require('fs');
              const filePath = path.resolve(__dirname, 'dist', 'markdown-ify.min.js');
              const bookmarkletPath = path.resolve(__dirname, 'dist', 'markdown-ify.bookmarklet.js');

              let code = fs.readFileSync(filePath, 'utf8');

              // Wrap in immediately invoked function and bookmarklet javascript: protocol
              const bookmarklet = `javascript:(function(){${code}})();`;

              fs.writeFileSync(bookmarkletPath, bookmarklet);

              // Also generate a human-readable version with newlines for reference
              const readablePath = path.resolve(__dirname, 'dist', 'markdown-ify.readable.js');
              fs.writeFileSync(readablePath, code);

              // We're no longer generating the HTML here as build-bookmarklet.js handles that
              console.log('📦 Bookmarklet files generated in the dist directory');
            });
          },
        },
      ],
    }),
  };
};