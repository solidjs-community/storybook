# Storybook for SolidJS

[![Storybook](https://img.shields.io/badge/Storybook-FF4785?style=flat-square&logo=storybook&logoColor=white)](https://storybook.js.org)
[![SolidJS](https://img.shields.io/badge/SolidJS-2C4F7C?style=flat-square&logo=solid&logoColor=white)](https://solidjs.com)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev)

[![npm version](https://img.shields.io/npm/v/@kachurun/storybook-solid-vite?style=flat-square)](https://www.npmjs.com/package/@kachurun/storybook-solid-vite)
[![npm downloads](https://img.shields.io/npm/dw/@kachurun/storybook-solid-vite?style=flat-square)](https://www.npmjs.com/package/@kachurun/storybook-solid-vite)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](./LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](https://github.com/solidjs-community/storybook/pulls)


Community supported [Storybook](https://storybook.js.org/) **framework adapter** for [SolidJS](https://solidjs.com/), using Vite as the bundler.

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

- **Fast Vite-powered** — Lightning-fast Storybook experience using Vite.
- **SolidJS Native** — Out-of-the-box support for Solid components and JSX.
- **Latest Storybook Support** — Built for and tested with the newest Storybook version.
- **TypeScript-First** — Full TypeScript support for your components and stories.
- **Addon Ecosystem** — Works with popular Storybook addons (Docs, Controls, Actions, Links, etc.).
- **ArgTypes from TypeScript** — Prop tables and controls generated directly from your TypeScript types.
- **Integrated Testing** — Built-in support for component and story testing with Vitest and Playwright.
- **Hot Reload** — Instant updates as you edit components, powered by Vite.
- **MDX & Docs** — Write rich documentation alongside your stories using MDX.
- **Accessibility (a11y)** — Built-in accessibility checks for your components.

---


## 🚀 Getting Started

The fastest way to start using Storybook with SolidJS:

```bash
npx create-solid-storybook <folder-name>
```

Replace `<folder-name>` with your desired project directory name. This will generate a SolidJS project pre-configured with Storybook 9 and all essential addons.

Then run:

```bash
cd <folder-name>
npm run storybook
```

Open the provided URL in your browser to view your Storybook instance.

---

## 📦 Manual Installation
You can set everything up manually.
To do this:
1. Copy the following files from [storybook-solid-template](https://github.com/solidjs-community/storybook/tree/main/packages/storybook-solid-template) to your project:

- `.storybook/**`
- `vitest.config.ts`

2. Install the required dependencies:

```bash
npm install storybook @kachurun/storybook-solid-vite @chromatic-com/storybook @storybook/addon-onboarding @storybook/addon-docs @storybook/addon-a11y @storybook/addon-links @storybook/addon-vitest @vitest/coverage-v8 playwright vitest @vitest/browser
```

3. Add the necessary scripts to your `package.json`:

```json
"scripts": {
  "build": "storybook build",
  "storybook": "storybook dev -p 6006"
}
```

4. Create your stories in `stories/` (or use examples from the template's `stories` folder)

5. Start Storybook:

```bash
npm run storybook
```

---

## ⚙️ Configuration

- You can customize Vite and Storybook as usual. For advanced configuration, see the [Storybook Vite docs](https://storybook.js.org/docs/builders/vite).
- Add your stories in `src/**/*.stories.tsx` or `src/**/*.stories.js`.
- Use [Storybook Addons](https://storybook.js.org/addons) for extra features.

---

## 🤝 Contributing

Contributions, issues and feature requests are welcome! Feel free to [open an issue](https://github.com/solidjs-community/storybook/issues) or submit a PR.

---

## 👤 Maintainer

<img src="https://github.com/kachurun.png" width="100" height="100" alt="@kachurun's avatar" style="border-radius: 50%;">

Maintained with ❤️ by [@kachurun](https://github.com/kachurun)

---

## 📖 License

MIT
