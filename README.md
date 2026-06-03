# Keywordify

[![Github CI][ci-badge]][ci-url]

[ci-badge]: https://github.com/cueaz/keywordify/actions/workflows/check.yaml/badge.svg
[ci-url]: https://github.com/cueaz/keywordify/actions/workflows/check.yaml

> [!WARNING]
> **Disclaimer**: This repository contains highly opinionated, personal modifications of the original libraries created for demonstration and research purposes. It is **not intended nor suitable for general public use**.

Keywordify is a collection of libraries designed with the Zero String Leakage (ZSL) principle. It utilizes [`unplugin-keywords`](https://github.com/cueaz/unplugin-keywords) to extract and obfuscate structural string literals and property names, preventing the exposure of application internals.

This monorepo contains ZSL-compliant ports of standard ecosystem libraries:

- [`@keywordify/html`](./keywordify/html): A port of `lit-html` and `@lit-labs/preact-signals` with custom modifications
- [`@keywordify/signals`](./keywordify/signals): A port of `@preact/signals-core` with custom modifications

## Example

Example of using `@keywordify/signals` and `@keywordify/html` with `reaction`:

```typescript
import * as K from '~keywords';
import { reaction, signal } from '@keywordify/signals';
import { html, render } from '@keywordify/html';

const Clock = () => {
  const time = signal(new Date().toLocaleTimeString());

  // reaction: starts the timer when connected to the DOM,
  // and cleans it up when disconnected
  const ticker = reaction(() => {
    const id = setInterval(() => {
      time[K.value] = new Date().toLocaleTimeString();
    }, 1000);
    return () => clearInterval(id);
  });

  return html`<div ${ticker}>Current Time: ${time}</div>`;
};

render(html`<main>${Clock()}</main>`, document.body);
```
