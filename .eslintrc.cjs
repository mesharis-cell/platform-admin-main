/** @type {import("eslint").Linter.Config} */
const config = {
    parser: "@typescript-eslint/parser",
    parserOptions: {
        // "project": true,
        project: "./tsconfig.json",
    },
    ignorePatterns: ["scripts/**", ".next/**", "src/lib/db/seed.ts", "src/lib/db/seed-demo.ts"],
    plugins: ["@typescript-eslint", "react", "react-hooks", "creatr"],
    globals: {
        React: "readonly",
    },
    settings: {
        react: {
            version: "detect",
        },
        "import/resolver": {
            typescript: {
                alwaysTryTypes: true,
                project: "./tsconfig.json",
                moduleDirectory: ["node_modules", "src"],
            },
            node: {
                extensions: [".js", ".jsx", ".ts", ".tsx"],
            },
        },
    },
    extends: [
        "eslint:recommended",
        "plugin:react/recommended",
        "plugin:@typescript-eslint/eslint-recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:import/errors",
        "plugin:import/warnings",
        "plugin:import/typescript",
        "plugin:creatr/recommended",
        "prettier",
    ],
    rules: {
        "react/react-in-jsx-scope": "off",
        "no-duplicate-imports": "off",
        "no-undef": "error",
        "no-unused-vars": "off",
        "react/prop-types": "off",
        "@next/next/no-img-element": "off",
        "react/no-unescaped-entities": "off",
        "@typescript-eslint/no-unused-vars": "off",
        "prefer-const": "off",
        "@typescript-eslint/no-explicit-any": "off",
        "react/no-unknown-property": "off",
        "@typescript-eslint/ban-ts-comment": "off",
        "@typescript-eslint/no-empty-object-type": "off",
        // Let TypeScript handle import validation instead
        "import/no-duplicates": "off",
        "import/no-named-as-default": "off",
        "import/named": "off",
        "import/no-named-as-default-member": "off",
        "import/namespace": "off",
        "import/default": "off",
        "import/no-unresolved": "off", // TypeScript handles this
        "@next/next/no-document-import-in-page": "off",
    },
    env: {
        browser: true,
        node: true,
    },
};
module.exports = config;
