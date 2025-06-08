# Storybook for SolidJS & Vite

[![npm version](https://img.shields.io/npm/v/@kachurun/storybook-solid-vite?style=flat-square)](https://www.npmjs.com/package/@kachurun/storybook-solid-vite)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](./LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](https://github.com/kachurun/create-solid-storybook/pulls)

Community supported [Storybook](https://storybook.js.org/) **framework adapter** for [SolidJS](https://solidjs.com/), using Vite as the bundler.

> This package is part of the [`create-solid-storybook`](https://github.com/kachurun/create-solid-storybook) project.

---

## 📋 Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Contributing](#contributing)
- [License](#license)
- [Maintainer](#maintainer)

---

## ✨ Features

- Fast Vite-powered Storybook for SolidJS
- Out-of-the-box support for Solid components and JSX
- Works with Storybook Addons (Docs, Controls, Actions, etc.)
- TypeScript support
- Community maintained

---

## 📦 Installation

```bash
npm install --save-dev @kachurun/storybook-solid-vite
# or
yarn add -D @kachurun/storybook-solid-vite
# or
bun add -d @kachurun/storybook-solid-vite
```

You also need to have `solid-js`, `vite`, and `vite-plugin-solid` in your project:

```bash
npm install solid-js vite vite-plugin-solid --save-dev
```

---

## 🚀 Quick Start

1. **Add Storybook to your SolidJS project:**

   ```bash
   npx storybook@latest init
   ```

2. **Update your `.storybook/main.js` or `.storybook/main.ts`:**

   ```js
   // .storybook/main.js
   module.exports = {
     framework: "@kachurun/storybook-solid-vite", // 👈 Add this
     stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|ts|tsx)"],
     addons: [
       "@storybook/addon-links",
       "@storybook/addon-essentials",
       "@storybook/addon-interactions",
     ],
   };
   ```

3. **Run Storybook:**

   ```bash
   npm run storybook
   # or
   yarn storybook
   # or
   bun run storybook
   ```

---

## ⚙️ Configuration

- You can customize Vite and Storybook as usual. For advanced configuration, see the [Storybook Vite docs](https://storybook.js.org/docs/builders/vite).
- Add your stories in `src/**/*.stories.tsx` or `src/**/*.stories.js`.
- Use [Storybook Addons](https://storybook.js.org/addons) for extra features.

---

## 🤝 Contributing

Contributions, issues and feature requests are welcome! Feel free to [open an issue](https://github.com/kachurun/create-solid-storybook/issues) or submit a PR.

---

## 👤 Maintainer

Maintained with ❤️ by [@kachurun](https://github.com/kachurun)

---

## 📖 License

MIT
