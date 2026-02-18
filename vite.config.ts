import { reactRouter } from "@react-router/dev/vite";
import { sentryReactRouter } from "@sentry/react-router";
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

const config = defineConfig((config) => ({
  plugins: [
    ...(process.env.VITEST ? [] : [reactRouter()]),
    sentryReactRouter(
      {
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
        authToken: process.env.SENTRY_AUTH_TOKEN,
      },
      config,
    ),
    tsconfigPaths({ ignoreConfigErrors: true }),
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
    allowedHosts: [
      "silkworm-calm-evenly.ngrok-free.app",
      "nbudin.opossum-bass.ts.net",
    ],
    host: "0.0.0.0",
  },
  test: {
    coverage: {
      enabled: process.env["COVERAGE"] ? true : false,
      include: ["app/**/*.{js,jsx,ts,tsx}"],
      reportsDirectory: "./coverage",
      reporter: ["text", "cobertura"],
      reportOnFailure: true,
    },
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setupTests.ts"],
    testTimeout: 10000,
    reporters: [
      "default",
      ["junit", { outputFile: "./test/reports/TEST-jest.xml" }],
      ["html", { outputFile: "./test/html_reports/jest-report.html" }],
    ],
    server: {
      deps: {
        inline: ["@neinteractiveliterature/litform"],
      },
    },
  },
}));

export default config;
