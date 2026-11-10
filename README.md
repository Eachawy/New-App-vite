# Common Portal

React 19 + Vite frontend for the RTA Common Portal. It replaces the legacy `common-portal-frontend`;
see [docs/legacy-migration-plan.md](docs/legacy-migration-plan.md) for the migration plan.

## Requirements

- Node.js 24.21 or newer
- npm

## Getting started

```bash
npm install
```

```bash
npm start
```

The dev server runs on http://localhost:9000 and proxies `/api` and `/services` to `http://localhost:8080`.

## Scripts

| Command                   | What it does                                                          |
| ------------------------- | --------------------------------------------------------------------- |
| `npm start`               | Start the Vite dev server                                             |
| `npm run build`           | Production build into `target/classes/static/`                        |
| `npm test`                | Lint, type check, then unit tests with coverage (thresholds 85/75/85) |
| `npm run test:watch`      | Unit tests in watch mode                                              |
| `npm run lint`            | ESLint (includes Prettier formatting rules)                           |
| `npm run typecheck`       | TypeScript type check for app and test code                           |
| `npm run prettier:format` | Format all files with Prettier                                        |

A pre-commit hook (husky + lint-staged) formats and lints staged files. CI runs lint, type check, tests and build on
every push to `main` and every pull request (`.github/workflows/ci.yml`).

## Project structure

```
src/
  app/
    config/      store, middleware, translation setup
    modules/     pages
    shared/      layout, error handling, reducers, utilities
  i18n/          translations (en, ar)
  content/       global CSS
```

The `app/*` import alias points to `src/app/*`.

## Translations

Translations live in `src/i18n/<lang>/*.json` and are merged per language at build time. English and Arabic are
supported; Arabic switches the page to right-to-left.
