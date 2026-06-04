import nextConfigCoreWebVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  ...nextConfigCoreWebVitals,
  {
    ignores: ["storage/**"],
  },
  {
    languageOptions: {
      parserOptions: {
        warnOnUnsupportedTypeScriptVersion: false,
      },
    },
  },
];

export default eslintConfig;
