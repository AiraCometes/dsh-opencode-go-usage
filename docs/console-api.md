# Console usage protocol

The integration reads `GET https://opencode.ai/console/api/go/status` with:

- `Cookie: __Host-console_session=<value>`
- `x-org-id: org_example` (legacy `wrk_…` IDs are sent unchanged, but production acceptance is unverified)
- `Accept: application/json`

Redirects are rejected without forwarding credentials. The API is a Console endpoint, not a documented stable public usage contract. No request is sent to the retired workspace HTML page.

## Normalization

`access.meters.fiveHour`, `week`, and `month` map to rolling, weekly, monthly windows. Their `usedMicroCents` and `limitMicroCents` are nonnegative integer strings or safe integer numbers. The percentage is floored and capped at 100; used >= limit marks a window rate-limited. Invalid or zero denominators are rejected rather than reported as free capacity.

`resetsAt` is an ISO date. Missing/null timestamps remain unknown, so the UI omits the countdown. Subscription `access.endsAt` is not treated as a monthly reset. Any of fiveHour/week/month may be absent, provided at least one recognized meter is present; absent windows remain absent. `access: null` reports no subscription; a malformed payload, SPA HTML, or invalid JSON reports a parse error. HTTP failures retain their actual status. No response body or raw fetch error is exposed through the host API.

## Evidence checked on 2026-10-19

- [OpenCode Console API documentation](https://dev.opencode.ai/v2/docs/console/api) identifies `org_…` as the workspace header value and distinguishes Console authentication. It does not document the private Go status payload.
- [OpenCode official usage route](https://github.com/anomalyco/opencode/blob/9c2611b4009f6cf124ed0aa260a615ed266fb953/packages/console/app/src/routes/zen/go/v1/usage.ts) currently proxies inference requests; this does not establish a cookie-authenticated JSON schema.
- [CodexBar's Console migration implementation and published protocol tests](https://github.com/steipete/CodexBar/blob/main/Tests/CodexBarTests/OpenCodeGoConsoleMigrationTests.swift) provide evidence for the `access.meters` payload, session cookie, header, and monthly reset behavior (the reference client uses a billing-end fallback; this plugin intentionally does not assume the same deadline). This is evidence from an independent client, not an official server contract or a verification against the user's account.

Tests use synthetic Console-shaped JSON, including large amounts, missing deadlines, absent subscription, invalid fields, HTTP failures, redirection and timeout. A real loopback HTTP server verifies request headers and redirect rejection. Real OpenCode session credentials are not used by the automated tests. Authenticated production usage still needs to be checked by the user after installation.

A packaged-tarball integration check on DSH 0.2.1-rc.2 used a synthetic loopback Console and a fresh DSH_HOME: plugin installation succeeded, the client manifest included the plugin, the host usage API returned 25% / 40% / 70%, a missing rolling deadline remained absent, and an upstream 401 was preserved. Both temporary servers were stopped. No production account credentials or user profile changes were involved.

## Review refinements

Cookie parsing is shared by load, save and HTTP transport. Only Console session and locale cookies are sent; a pasted `auth` cookie is dropped, and `auth` alone is invalid. Locale-first bare values and case-insensitive pasted cookie names are canonicalized. Invalid nonempty writes throw before persisting anything, preserving the existing file.

Workspace IDs from config and environment are trimmed. A legacy `wrk_…` rejection with HTTP 400/401/403 produces a `workspace` diagnostic that includes the status and asks the user to verify the current Console ID as well as the session. This is guidance, not a claim that the remote server accepts every legacy ID.

Error and redirect response bodies are canceled before returning their HTTP error. Legacy SSR parsing exports are deprecated but retained to avoid breaking unknown external imports. They are not used by the active transport.

The review-update tarball was also installed into a fresh npm DSH rc.2 profile. A real POST to the plugin config API rejected a legacy `auth` cookie with HTTP 400 and preserved the saved file byte-for-byte, including when another field was included in the invalid write. A locale-first bare Console token was then accepted and saved in canonical form. Only synthetic credentials were used; the temporary server was stopped.
