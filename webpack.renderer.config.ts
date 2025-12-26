import type { Configuration } from "webpack";
import type { RuleSetRule } from "webpack";

import { rules as baseRules } from "./webpack.rules";
import { plugins } from "./webpack.plugins";

const rendererRules: RuleSetRule[] = baseRules
  .map((r) => ({ ...(r as any) }))
  .filter((r: any) => {
    if (r.use === "node-loader") return false;

    if (
      r.use &&
      typeof r.use === "object" &&
      r.use.loader === "@vercel/webpack-asset-relocator-loader"
    ) {
      return false;
    }

    return true;
  });

rendererRules.push({
  test: /\.css$/,
  use: [{ loader: "style-loader" }, { loader: "css-loader" }],
});

rendererRules.push({
  test: /\.scss$/,
  use: [
    "style-loader",
    {
      loader: "css-loader",
      options: {
        modules: {
          localIdentName: "[name]__[local]___[hash:base64:5]",
        },
      },
    },
    "sass-loader",
  ],
});

rendererRules.push({
  test: /\.svg$/,
  use: ["@svgr/webpack"],
});

rendererRules.push({
  test: /\.(png|jpe?g|gif)$/i,
  type: "asset/resource",
  generator: {
    filename: "static/assets/[name][ext]",
  },
});

rendererRules.push({
  test: /\.md$/,
  use: [
    { loader: "html-loader" },
    {
      loader: "markdown-loader",
      options: {},
    },
  ],
});

export const rendererConfig: Configuration = {
  module: {
    rules: rendererRules,
  },
  plugins,
  resolve: {
    alias: {
      "process/browser": require.resolve("process/browser.js"),
    },
    fallback: {
      process: require.resolve("process/browser.js"),
      crypto: require.resolve("crypto-browserify"),
      stream: require.resolve("stream-browserify"),
      buffer: require.resolve("buffer"),
      assert: require.resolve("assert"),
      util: require.resolve("util"),
      http: require.resolve("stream-http"),
      https: require.resolve("https-browserify"),
      os: require.resolve("os-browserify/browser"),
      url: require.resolve("url"),
    },
    extensions: [".js", ".ts", ".jsx", ".tsx", ".css"],
  },
};
