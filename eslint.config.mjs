// @ts-check

import { FlatCompat } from "@eslint/eslintrc";
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import i18next from "eslint-plugin-i18next";
import { fileURLToPath } from "url";
import path from "path";

// mimic CommonJS variables -- not needed if using CommonJS
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

export default tseslint.config(
  { ignores: [".yarn", ".react-router", ".pnp.cjs"] },
  eslint.configs.recommended,
  ...compat.extends("plugin:drizzle/recommended"),
  // @ts-expect-error Mommy and Daddy are fighting
  i18next.configs["flat/recommended"],
  tseslint.configs.recommended
);
