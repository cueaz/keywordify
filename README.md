# Keywordify

> [!WARNING]
> **Disclaimer**: This repository contains highly opinionated, personal modifications of the original libraries created for demonstration and research purposes. It is **not intended nor suitable for general public use**.

Keywordify is a collection of libraries designed with the Zero String Leakage (ZSL) principle. It utilizes [`unplugin-keywords`](https://github.com/cueaz/unplugin-keywords) to explicitly extract and obfuscate structural string literals, property names, and symbols, ensuring they are eliminated from the production bundle.

This monorepo contains ZSL-compliant ports of standard ecosystem libraries:

- [`@keywordify/html`](./keywordify/html): A ZSL-compliant port of `lit-html`
- [`@keywordify/signals`](./keywordify/signals): A ZSL-compliant port of `@preact/signals-core`
