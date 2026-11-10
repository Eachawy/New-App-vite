# Legacy common-portal-frontend → New-App-vite: analysis & migration plan

## Context

`/Volumes/Data/DevOps/UAA/common-portal-frontend` is a legacy RTA "common portal" React app. It needs to move into the new
Vite project (`/Volumes/Data/server/New-App-vite`, Phase 1 is on branch `phase-1-quality-gates`). The goal is to understand the legacy
app and then move its pages over in phases.

Decisions already taken:

- **Scope:** migrate all pages, one area at a time.
- **UI library:** reuse `frontend-common-library` behind a thin wrapper.
- **Backend contract:** keep the current contract (AES request bodies, token arriving in the URL), but isolate it in one typed API layer.
- **Rollout:** keep the same URLs and move traffic over area by area, with nginx routing.

---

## Part A — What the legacy project is

### Stack

- JHipster 6/7 scaffold, webpack 5.28, TypeScript 4.2, React 18.
- Routing and state: react-router-dom **v5**, redux 4 with redux-promise-middleware and redux-thunk.
- UI: reactstrap 8, Bootstrap 4.6, PrimeReact (used directly but never declared in `package.json`).
- Other libraries: jQuery, moment, lodash, crypto-js, jwt-decode, rxjs 6, react-slick, react-google-autocomplete.
- Size: about 13k lines of TSX/TS, plus about 5k lines of global SCSS (`common.scss` 3.2k, `aramex.scss` 1.4k, separate `*_ar.scss` RTL overrides).
- i18n: en/ar, 9 namespaces (aramex, callCenterBanner, common, dashboard, eWallet, error, layout, refund, transation-history).
- Builds: 6 webpack env configs (dev/qa/tst/stg/er/prod). The base path is `/common/`. Docker uses Node 16 and nginx with a CSP.

### How it runs (the important mental model)

1. **Entry point.** The portal is not a standalone app. Other RTA apps (UMS dashboard, VLS, DLS, CLS, CVS) link into it with
   `?token=<JWT>&lang=…&systemCode=…&callbackUrl=…`. SSO also enters this way (`/sso-redirect`).
2. **Storing the query parameters.** `shared/queryRoute/parameterized-route.tsx` runs first. It copies every query param into the
   `parameters` reducer, which is a mutable `Map` saved to sessionStorage with AES encryption. It then strips them from the URL. Routes can
   declare `requiredParams` (usually `token`), and the error page shows if one is missing.
3. **Identity.** Pages decode the JWT on the client (`jwt-decode`) to get `rtaUnifiedNo`, `authorities` and `userType`
   (individual or corporate).
4. **API layer.** `common/config/network-service-reducer.ts` handles every call:
   - It sets the token on the **global** `axios.defaults` header.
   - When `IS_REQUEST_ENCRYPTION_ENABLED` is on (qa and prod), it AES-CBC encrypts request bodies as `{_data}` and decrypts responses.
   - Calls go to 3 gateways: `GATEWAY_SERVER_API_URL` (`comgw/...`), VLS and DLS.
5. **Sessions and errors.** `config/notification-middleware.ts` handles them:
   - 401: refresh through `auth/refresh` if the user was idle less than N minutes, otherwise go to `/session-expired`.
   - 503/504: go to the error page.
   - Some error categories show a toast.
6. **Leaving the portal.** `navigateToDX(url, params)` sends the user back to the calling system, with the token in the URL.
7. **App shell.** `NewRTAHeaderComponent` and `NewRTAFooterComponent` come from `frontend-common-library`. The footer also hosts
   the happiness meter and the Mahboub chatbot URL, both delivered through rxjs Subjects. A call-center agent banner shows when the
   token belongs to an agent.

### Page inventory (15 routed pages + embedded wizard)

| Area               | Route                                                                      | Legacy file                                                                                               | Lines | Complexity |
| ------------------ | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ----- | ---------- |
| Entry              | `/sso-redirect`                                                            | shared/redirect.Component/sso-redirect.tsx                                                                | 119   | M          |
| Entry              | `/go`                                                                      | shared/redirect.Component/redirect.tsx                                                                    | 82    | S          |
| eWallet            | `/eWallet/link-ewallet`                                                    | common/module/eWallet/link-eWallet.tsx                                                                    | 226   | M          |
| eWallet            | `/eWallet/ewallet-details`                                                 | eWallet-details.tsx (+ manage-associated-file)                                                            | 447   | L          |
| eWallet            | `/eWallet/no-ewallet-linked`                                               | noWallet-linked.tsx                                                                                       | 116   | S          |
| eWallet            | `/eWallet/unlink-profile`                                                  | unlink-eWallet.tsx                                                                                        | 195   | M          |
| Refund             | `/add-refund-iban`, `/upload-iban-certificate`, `/iban-successfully-added` | payment-refund/refund/*                                                                                   | 752   | M          |
| Refund             | `/dashboard/add-refund-iban` … `/dashboard/iban-successfully-added`        | payment-refund/refund-without-tracker/* (about 90% duplicate)                                             | 547   | S          |
| Dashboard          | `/dashboard/addresses`                                                     | dashboard/dashboard-addresses                                                                             | 355   | M          |
| Dashboard          | `/dashboard/transaction-history`                                           | transactions-history/transaction-history.tsx                                                              | 662   | L          |
| Dashboard          | `/dashboard/transaction-details`                                           | transaction-history-details.tsx                                                                           | 310   | M          |
| Courier            | `/courier-service`                                                         | courier-service/delivery-method/deliveryMethod.page.tsx                                                   | 374   | M          |
| Courier            | `/shipping-address`                                                        | courier-service/shipping-address/*                                                                        | 245   | S          |
| Courier (embedded) | the wizard Form → OTP → Review                                             | aramex/{aramex-component, delivery-form 694, aramex-form **1603**, delivery-otp 243, delivery-review 370} | ~3000 | **L**      |
| Dead code          | —                                                                          | aramex/delivery-options, delivery-box, `setDeliveryAvailableDelivery` in delivery-method                  | 280   | —          |

Shared components to port: TrackersGenerator (journey stepper), BreadCrumb, AttachViewerPopup (PDF), DashboardContainerRibbon (react-slick),
ManageAssociatedFile and FavouriteCell (PrimeReact table), SddiRedirect, CallCenterBanner, ErrorPage.

Endpoint families:

- `comgw/invoice/api/*` (eWallet, IBAN)
- `comgw/pds/api/service-delivery/*` (courier, addresses)
- `comgw/dis/api/*` (transactions)
- `comgw/ums/api/*` (profile, OTP, notifications, SSO)
- `auth/*` (anonymous, sso, refresh)
- VLS and DLS tracker-info

### Problems found (fix them during migration, don't copy them)

- **Security (raise with the team now, independent of the migration):**
  - `DECRYPTION_PRIVATE_KEY`, `UMS_SECRET`, `API_KEY`, the AES key (`REST_CALL_FILTER`) and the Google Maps keys are hard-coded in the git-tracked `webpack/*.js`.
  - dev, tst, stg and er replace the whole `process.env`, so those values can end up in the bundle.
  - The AES setup uses key = IV.
  - The JWT travels in URLs.
  - There are open redirects (`journeyUrl`, `externalRedirect`), and `window.open` is used without `noopener`.
  - The CSP allows `unsafe-eval`.
  - **Recommend rotating these secrets.**
- **Bugs:**
  - `navigateToDX` builds `?token= ${token}` (stray space).
  - `REFRESH_TOKEN_ENABLED` is a raw `false` in qa and prod, so it never equals the string `'false'`.
  - `aramex-form.tsx:236` uses `=` where it means `===`, and line 978 has an operator-precedence bug.
  - The iBAN certificate download is broken on iOS (the result of `.replace()` is discarded).
  - The upload page navigates even when the update fails.
  - `transaction-details` breaks on refresh because its id comes only from `location.state`.
  - `NEW_OTP_ENABLED` is compared as a truthy string.
  - The er and tst webpack envs are missing variables.
- **Structure:**
  - About 12 of 15 screens are class components using `connect` and the pattern `await action(); read this.props`.
  - Redux state is mutated directly, and FAILURE resets whole slices.
  - eWallet action types are named `paymentRefund/*`.
  - Duplication:
    - The tracker builder appears 4 times.
    - The address-VM builder appears 3 times.
    - The back-to-dashboard URL builder appears about 10 times.
    - The two refund sets are near-copies of each other.
  - Fee amounts (20 and 50 AED) and remarks are hard-coded in two components.
  - Address-review labels are hard-coded in English.

---

## Part B — Migration plan

### Target structure in New-App-vite

```
src/app/
  core/            config (runtime), http (axios instance + crypto + auth), session (params store), i18n, store
  shared/ui/       thin wrappers over frontend-common-library + ported shared components
  shared/lib/      navigation (navigateToDX/back-to-dashboard), jwt (claims), formatting
  features/
    ewallet/ refund/ dashboard/ courier/ entry/   each: api.ts (RTK Query), pages/, components/, model.ts, *.spec.tsx
src/i18n/{en,ar}/  copy the legacy namespaces as-is (same keys → zero re-translation)
```

Mapping from legacy to new:

- Class component + `connect` → function component + hooks.
- redux-promise reducers → RTK Query endpoints.
- The `parameters` Map → a typed `session` slice.
- `ParameterizedRoute` → a router v8 layout route.
- moment → dayjs.
- Remove jQuery entirely.
- Forms → react-hook-form, which is already a dependency.

### Phase M0 — Prerequisites (½–1 day)

- Get registry access for `frontend-common-library`: copy the private-registry `.npmrc` (no tokens committed) and **pin the version** (`3.0.1`).
- Add `primereact`, `jwt-decode` and `react-google-autocomplete` as explicit dependencies.
- Set the Vite `base: '/common/'`. Set `<base href>` per environment through the runtime config.
- Confirm with the backend team: does the AES contract stay for qa and prod, and which env values are public and which are secret.

### Phase M1 — Platform (2–4 days); no pages ship without it

1. **`core/config`.** Load `/common/config.json` at startup. It holds the gateway, VLS, DLS and UMS URLs, the frontend URL per `systemCode`,
   feature flags as **real booleans** (`requestEncryption`, `refreshToken`, `newOtp`), the session idle minutes, and the Google Maps key.
   This replaces the 6 webpack env files, so one artifact serves every env. Secrets are not included; the AES key is the only "secret" the contract needs,
   flagged as a backend follow-up.
2. **`core/http`.**
   - One `axios.create()` per gateway.
   - A request interceptor adds `Authorization` from the session store. This is never a global default.
   - A crypto interceptor pair (AES-CBC encrypt to `{_data}`, decrypt responses) is ported from `network-service-reducer.ts`.
     It is **covered by tests with captured legacy request/response vectors**, so it is byte-compatible.
   - The 401 refresh and retry plus the idle check are ported from `notification-middleware.ts` (single flight, no loops).
   - An RTK Query `baseQuery` on top of these.
3. **`core/session`.**
   - A typed slice for `token, lang, systemCode, journeyCode, callbackUrl, applicationRefNo, basketReferenceNo, fromDashboard…`, persisted to sessionStorage (encrypted, keeping legacy parity).
   - A `<ParamsGate requiredParams>` layout route that captures query params, strips them with `replace`, and renders `ErrorPage` when one is missing.
   - A `useClaims()` hook (rtaUnifiedNo, authorities, userType) from `jwt-decode`.
   - This replaces `ParameterizedRoute` and `parameters.ts`.
4. **`shared/lib/navigation`.**
   - `navigateToSystem(systemCode, path, params)` and `backToDashboard()`: one implementation replacing about 10 copies, with the token-space bug fixed.
   - An allow-list check before any `window.location` redirect.
5. **Layout.**
   - `NewRTAHeaderComponent` and `NewRTAFooterComponent` go into the existing `app.tsx`.
   - Happiness meter and Mahboub URL: the rxjs Subjects become small hooks.
   - CallCenterBanner.
   - Toast service: port `notificationService.pushNotification` onto the existing react-toastify setup.
6. **`shared/ui`.**
   - Re-export the library components used: Loading, Button, Input, InputMask, Dropdown, Uploader, RadioButton, CheckBox, Message, NotificationMessage, LoadMore, Plate.
   - Port TrackersGenerator, BreadCrumb, AttachViewerPopup and ErrorPage.
   - Copy the global SCSS (`common.scss`, `*_ar.scss`, variables) as a **legacy theme layer** so pages look the same. Clean it up later.
7. **i18n.** Copy the 9 en/ar namespace JSON files into `src/i18n/{en,ar}/`. The existing `import.meta.glob` + deepmerge loader picks them up.
   Remove `jhipsterTestApp.` assumptions.

### Phases M2–M6 — Feature areas (smallest first, each ships independently)

| Phase | Area                  | Pages                                                                   | Notes                                                                                                                                                                                                                                                                                                               | Est.   |
| ----- | --------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| M2    | **eWallet**           | 4                                                                       | Fix the action-type names. `ManageAssociatedFile` becomes a PrimeReact DataTable wrapper.                                                                                                                                                                                                                           | 3–4 d  |
| M3    | **Refund**            | 6 routes → **one** flow component with `mode: 'journey' \| 'dashboard'` | Merge the duplicates. Check the update result before navigating. Fix the iOS download. Keep all 6 URLs.                                                                                                                                                                                                             | 3–4 d  |
| M4    | **Dashboard**         | addresses, transaction-history, transaction-details                     | Put the details id in the URL (`/dashboard/transaction-details?id=` or a path param). Make the 4 cancel actions distinct. Use RTK Query infinite paging for "load more".                                                                                                                                            | 5–7 d  |
| M5    | **Courier/Aramex**    | `/courier-service`, `/shipping-address` + wizard                        | Split `aramex-form` (1603 lines) into address, contact and delivery-date sections with react-hook-form + schema validation. One `buildAddressRequest()`. Fees come from the API, not hard-coded. Translate the review labels. Drop the delivery-options and delivery-box dead code. Fix the lines 236 and 978 bugs. | 8–12 d |
| M6    | **Entry & redirects** | `/sso-redirect`, `/go`, SddiRedirect                                    | Last, because every other app links here. Validate `journeyUrl` and the redirect targets against the allow-list. Use `noopener`.                                                                                                                                                                                    | 2–3 d  |
| M7    | **Retire legacy**     | —                                                                       | Remove nginx legacy routing, archive the repo, rotate the old secrets.                                                                                                                                                                                                                                              | 1 d    |

### Per-page recipe (repeat for every page)

1. Add the RTK Query endpoints in `features/<area>/api.ts`, with request/response types taken from the legacy reducer and real responses.
2. Rebuild the page as a function component using `useClaims`, `useSession` and the `shared/ui` components, with the **same translation keys**.
3. Navigation state goes into URL params or the session slice, never `location.state` alone.
4. Write unit tests (render, happy path, API error path) with MSW or mocked baseQuery. Keep the existing coverage gate (85/75/85).
5. Register the route at the **same legacy path** under the `ParamsGate` layout with the same `requiredParams`, and lazy-load it.
6. Before release, compare side by side against legacy in qa (en and ar/RTL).

### Rollout (same URLs, area by area)

- Both apps are served under `/common/`. nginx sends the migrated route prefixes to the new build (for example `location ~ ^/common/eWallet/`) and everything else to the legacy build.
- Session continuity: both apps read the same sessionStorage `param` key with the same encryption, **or** each area is entered fresh from the calling system with `?token=`. The second is simpler, and it is how users already arrive.
- New Dockerfile: Node 24, a non-root user, `npm ci`, and the nginx config with per-env CSP generated from the runtime config, without `unsafe-eval`.

### Files to create or modify in New-App-vite (representative)

- `vite.config.ts` (base `/common/`, gateway proxies for dev), `package.json` (deps), `.npmrc` (registry, no token)
- `src/app/core/{config,http,session}/*`, `src/app/shared/lib/navigation.ts`, `src/app/shared/ui/index.ts`
- `src/app/app.tsx` (library header and footer), `src/app/routes.tsx` (`ParamsGate` + lazy feature routes)
- `src/app/features/<area>/{api.ts,pages/*,components/*}`, `src/i18n/{en,ar}/*.json`, `src/content/css/legacy/*`

### Verification

- **Automated:** `npm test` (lint, typecheck, unit tests including the crypto compatibility vectors) and `npm run build`, run in CI on every PR.
- **Contract:** in qa with encryption on, calls from the new app produce `{_data}` payloads that the gateway accepts, and decrypted responses match legacy for the same user.
- **Per area:** launch from the real calling system with `?token=` in en and ar. Walk every route in the area and compare against legacy (screens, toasts, the redirect back through `callbackUrl`). Check the 401 refresh and the idle expiry.
- **Rollout:** nginx routes only the migrated prefixes; legacy keeps serving the rest. Each area can be rolled back by removing one nginx location block.
