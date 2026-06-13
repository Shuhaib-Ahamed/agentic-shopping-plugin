// ESLint 9 flat config for the Kapruka monorepo.
// Aligns with Google TypeScript style guidance enforced via @typescript-eslint
// + react + react-hooks + import + jsdoc. Prettier is run last to format.
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import importPlugin from "eslint-plugin-import";
import jsdoc from "eslint-plugin-jsdoc";
import prettier from "eslint-plugin-prettier";
import prettierConfig from "eslint-config-prettier";
import globals from "globals";

export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.turbo/**",
      "**/.vercel/**",
      "**/.node_modules_old/**",
      "**/coverage/**",
      "apps/web/src/components/ui/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      react,
      "react-hooks": reactHooks,
      import: importPlugin,
      jsdoc,
      prettier,
    },
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      react: { version: "detect" },
      "import/resolver": {
        typescript: { project: ["./apps/web/tsconfig.json", "./packages/protocol/tsconfig.json"] },
        node: true,
      },
    },
    rules: {
      // React + hooks
      "react/jsx-uses-react": "off",
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // Imports
      "import/no-default-export": "error",
      "import/no-cycle": ["warn", { maxDepth: 4 }],
      "import/order": [
        "warn",
        {
          groups: ["builtin", "external", "internal", "parent", "sibling", "index"],
          "newlines-between": "never",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],
      "import/no-duplicates": "error",

      // TS hygiene
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { prefer: "type-imports", fixStyle: "separate-type-imports" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",

      // No stray logs in app code; the gateway logger is the one exception.
      "no-console": ["warn", { allow: ["warn", "error"] }],

      // Style polish via Prettier as a lint rule (warn only).
      "prettier/prettier": "warn",
    },
  },
  // Framework-required default exports.
  {
    files: ["apps/web/api/**/*.ts", "apps/web/api/**/*.tsx", "apps/web/vite.config.ts"],
    rules: { "import/no-default-export": "off" },
  },
  // The structured logger is the one place console.* is intentional.
  {
    files: ["apps/web/api/_lib/log.ts"],
    rules: { "no-console": "off" },
  },
  // Loosen rules for generated shadcn primitives.
  {
    files: ["apps/web/src/components/ui/**"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "import/no-default-export": "off",
    },
  },
  prettierConfig,
];
