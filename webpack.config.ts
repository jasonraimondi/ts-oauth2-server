import * as path from "path";

const pkg = require("./package.json");

const projectRoot = path.join(__dirname, "./");

module.exports = {
  entry: projectRoot + "src/index.ts",
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
            colors: true,
            configFile: "tsconfig.build.json",
          },
        }],
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    alias: {
      "~": projectRoot + "/src",
    },
    extensions: [".ts", ".js"],
  },
  output: {
    filename: pkg.main.replace("dist/", ""),
    library: pkg.name,
    libraryTarget: "umd",
  },
  optimization: {
    minimize: false,
  },
};