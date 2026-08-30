import path from 'path';
import { fileURLToPath } from 'url';
import { merge } from 'webpack-merge';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const common = {
  mode: process.env.NODE_ENV || 'production',
  experiments: {
    outputModule: true,
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    library: {
      type: 'module',
    },
  },
  module: {
    rules: [
      {
        test: /\.ts?$/,
        use: {
          loader: 'ts-loader',
          options: {
            // Emit real ESM so webpack preserves named exports in the
            // outputModule bundle (the tsconfig's commonjs output gets
            // wrapped under a single `default` export otherwise).
            compilerOptions: {
              module: 'esnext',
            },
          },
        },
        exclude: /node_modules/,
      },
    ],
  },
  optimization: {
    minimize: false,
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  devtool: process.env.NODE_ENV === 'development' ? 'eval-source-map' : false,
};

const serverConfig = merge(common, {
  entry: {
    game: './src/node/commands/game.ts',
    simulate: './src/node/commands/simulate.ts',
  },
  target: 'node',
  output: {
    filename: '[name].js',
  },
});

const serverMinConfig = merge(serverConfig, {
  output: {
    filename: '[name].min.js',
  },
  optimization: {
    minimize: true,
  },
});

const clientConfig = merge(common, {
  entry: './src/index.ts',
  output: {
    filename: '[name].js',
  },
  devServer: {
    static: './dist',
  },
});

const clientMinConfig = merge(common, {
  output: {
    filename: '[name].min.js',
  },
  optimization: {
    minimize: true,
  },
});

export default [serverConfig, serverMinConfig, clientConfig, clientMinConfig];
