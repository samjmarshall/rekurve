import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import tseslint from 'typescript-eslint';

// Filter out base configs to avoid re-registering @typescript-eslint plugin
// (eslint-config-next already registers it in next/typescript)
/** @param {import('typescript-eslint').ConfigArray} configs */
const filterBaseConfigs = (configs) =>
  configs.filter((/** @type {{ name?: string }} */ c) =>
    !c.name?.includes('/base') && !c.name?.includes('/eslint-recommended')
  );

export default tseslint.config(
  {
    ignores: ['.next', '.yarn', 'next-env.d.ts', 'playwright-report'],
  },
  ...nextCoreWebVitals,
  {
    // Disable React 19 compiler lint rules that weren't enforced before
    // These are new strict rules in eslint-config-next 16.x that would
    // require significant refactoring to satisfy
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
      "react-hooks/static-components": "off",
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    extends: [
      ...filterBaseConfigs(tseslint.configs.recommended),
      ...filterBaseConfigs(tseslint.configs.recommendedTypeChecked),
      ...filterBaseConfigs(tseslint.configs.stylisticTypeChecked)
    ],
    rules: {
      "@typescript-eslint/array-type": "off",
      "@typescript-eslint/consistent-type-definitions": "off",
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/no-misused-promises": [
        "error",
        { checksVoidReturn: { attributes: false } },
      ],
      // Allow cn() utility for className composition (common UI library pattern)
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
    },
  },
  {
    linterOptions: {
      reportUnusedDisableDirectives: true
    },
    languageOptions: {
      parserOptions: {
        projectService: true
      }
    }
  }
)
