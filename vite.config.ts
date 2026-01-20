import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

const config = defineConfig({
  plugins: [
    ...(process.env.VITEST ? [] : [reactRouter()]),
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
    allowedHosts: ["nbudin.opossum-bass.ts.net"],
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
});

export default config;
