import { merge } from 'webpack-merge';
import baseConfig from './webpack.config.js';
import TerserPlugin from 'terser-webpack-plugin';
import CssMinimizerPlugin from 'css-minimizer-webpack-plugin';

export default merge(baseConfig, {
  mode: 'production',
  devtool: false,
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          format: {
            comments: false,
          },
          compress: {
            drop_console: false, // Keep console logs for error tracking
            drop_debugger: true,
            pure_funcs: ['console.debug'],
          },
        },
        extractComments: false,
      }),
      new CssMinimizerPlugin(), // In case we add CSS in the future
    ],
    moduleIds: 'deterministic',
    chunkIds: 'deterministic',
    splitChunks: {
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
      },
    },
  },
  performance: {
    hints: 'warning',
    maxEntrypointSize: 512000,
    maxAssetSize: 512000,
  },
});