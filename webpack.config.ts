import TsconfigPathsPlugin from "tsconfig-paths-webpack-plugin";

const pkg = require("./package.json");

module.exports = {
  entry: "./src/index.ts",
  target: "node",
  mode: "production",
  devtool: "source-map",
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: [{
          loader: "ts-loader",
          options: {
            configFile: "tsconfig.build.json",
          },
        }],
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".js"],
    plugins: [new TsconfigPathsPlugin()],
  },
  output: {
    filename: pkg.main.replace("dist/", ""),
    library: pkg.name,
    libraryTarget: "umd",
  },
  optimization: {
    minimize: false,
    // runtimeChunk: true,
  },
};