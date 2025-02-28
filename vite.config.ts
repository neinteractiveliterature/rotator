import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { reactRouterHonoServer } from "react-router-hono-server/dev";
import { defaultOptions } from "@hono/vite-dev-server";

export default defineConfig({
  plugins: [
    reactRouterHonoServer({
      dev: {
        exclude: [/^\/.yarn/, ...defaultOptions.exclude],
      },
    }),
    reactRouter(),
    tsconfigPaths(),
  ],
  css: {
    modules: {
      localsConvention: "camelCaseOnly",
    },
    preprocessorOptions: {
      scss: {
        // can't get import to work until Bootstrap supports it
        silenceDeprecations: ["import", "legacy-js-api"],
        quietDeps: true,
      },
    },
  },
  server: {
    allowedHosts: ["2e9a-98-175-201-111.ngrok-free.app"],
  },
});
