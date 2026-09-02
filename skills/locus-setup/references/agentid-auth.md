<!-- Mirrored from https://paywithlocus.com/agent/auth.md on 2026-09-02 so registry scanners can review the full contract in-repo. The canonical version at that URL prevails; refresh this mirror when it changes (release checklist). -->

# Locus agent authentication discovery

Canonical skill: `https://paywithlocus.com/skill.md`

## Okibi Identity (feature-gated)

The Okibi-generated Locus CLI can authenticate with Okibi Identity instead of
running the AgentMail and AgentID ceremony below. Before selecting that path,
request `https://api.paywithlocus.com/.well-known/okibi-identity` without
authentication. Continue only on a `200` Identity manifest. If the endpoint is
unavailable or returns `404`/`feature_disabled`, use AgentID or native Locus
OAuth and do not install or invoke the Okibi CLI. When enabled, install the
official signed release with `curl -fsSL https://okibi.ai/i/locus/locus | sh`,
then follow the CLI's bundled skill and command help. The repo-backed production
release targets `https://api.paywithlocus.com/api` by default;
`locus auth login` prefers Okibi Identity and `locus auth native` is the
explicit fallback. Okibi capabilities are
short-lived and scoped; leave them inside the CLI's identity runtime and never
copy them into a project file, environment file, chat, or static MCP header.

The manifest and an Okibi dashboard "signed" badge are necessary but not
sufficient release checks. Run a protected command through the installed CLI.
If it reports that the release is not Identity-eligible, that Identity access
is no longer active, or that the executable digest/signature does not match the
signed release, stop using that release and fall back to AgentID or native MCP
OAuth. Never retry a rejected Okibi capability as a native Locus bearer.

The real protected resource is `GET /api/credits/okibi/cli-credential`, which
requires `mcp:read` and `mcp:execute`. After it verifies the signed release and
account binding, `POST` to the same path exchanges the active Okibi identity
for a 24-hour native `lcac_` credential restricted to an explicit
provider/endpoint allowlist. Supply a caller-generated 24-byte base64url
registration token over stdin when driving the operation directly. The normal
`locus auth login` workflow generates that token, applies its least-privilege
default tool allowlist (or the repeated `--tool` values supplied by the caller),
performs the exchange, and stores the credential without printing it. Replay the
same token to recover or renew the credential and to replace its allowlist after
fresh Okibi verification.

When driving the operation directly, store the result in an approved secret
manager and inject it into the generated API CLI as `LOCUS_SECRET_KEY`; never
put the credential in a positional argument. Paid API commands use the native
Locus credential; the short-lived Okibi capability remains inside the identity
runtime and is never reused as an Apollo or generic REST bearer.

Locus dispatches Okibi JWTs only to the configured Okibi issuer and verifies
them with `@okibi/partner-kit`. A failed Okibi capability is never retried as a
Cognito, end-user, or native MCP bearer. On first approval, a verified Okibi
identity directly provisions a zero-credit personal Locus Pro workspace keyed
to the issuer and pairwise subject when the verified email has no eligible
native Locus workspace. The new account is registered to that normalized email
and does not require Locus sign-in, a Locus password, or AgentID signup. Current
account status, immutable identity binding, tenant, and requested scopes are
rechecked for every protected request.

When the verified email matches an active Cognito account with an eligible
workspace, Locus asks whether to link it or create a separate Okibi-owned
account. The lookup is only a discovery hint and never ownership proof. Linking
requires the matching Locus sign-in; declining provisions the separate account
headlessly to the Okibi email. The short-lived confirmation token stays in the
URL fragment; a signed-in dashboard user confirms it in the browser, or an
AgentID-owned headless account submits it to
`POST /api/credits/okibi/link/confirm` with its existing
`LOCUS_AGENT_CREDENTIAL`.

## Agent-owned signup

- Registration contract: `GET https://api.paywithlocus.com/api/credits/agent/onboarding`
- Registration: `POST https://api.paywithlocus.com/api/credits/agent/register`
- Identity provider: AgentID OpenID Connect
- Issuer: `https://auth.agentid.com`
- Client descriptor: `GET https://api.paywithlocus.com/api/credits/agent/identity/agentid`
- Callback: `GET https://api.paywithlocus.com/api/credits/agent/identity/agentid/callback`
- Required OIDC controls: Authorization Code, PKCE S256, nonce, issuer and
  audience verification, stable `sub`, `email_verified: true`
- Signup result: scoped `lcac_` compatibility credential for the setup and
  funding REST calls in the canonical skill
- MCP authentication: standard Locus MCP OAuth, with AgentID as the
  resource-owner login; 15-minute access tokens and rotating refresh tokens
  stay in the MCP client's native token store

Random registration entropy creates only a 15-minute pending row. Locus does
not create a tenant, provider, ledger account, or bearer credential until the
AgentID callback verifies.

The MCP OAuth authorization screen is public. An agent-owned account chooses
AgentID and proves the same provider/subject bound during signup. A human-owned
account signs into Locus instead. Both paths return the same resource-bound
OAuth token format and count against the same connection allowance.

Re-authorizing an agent-owned free account with the same AgentID revokes that
identity's previous OAuth token family before reserving its one permitted slot.
It cannot replace a connection owned by a different identity.

## Browserless AgentID approval

This is the complete approval contract for both Locus signup and MCP OAuth. It
is intentionally included here so an agent does not need to discover an
identity protocol from search results.

### 1. Create an inbox and signing identity once

If the agent does not control an inbox, follow `https://agent.email/skill.md`
first. Generate an extractable P-256 (`ES256`) key pair locally. Persist the
private JWK only in the runtime's approved secret store. Retain the public
JWK's `kty`, `crv`, `x`, and `y` fields.

Register the public key with AgentMail. Authenticate this request with the
AgentMail API key, never with the AgentID signing key:

```http
POST https://api.agentmail.to/v0/api-keys/public-keys
Authorization: Bearer $AGENTMAIL_API_KEY
Content-Type: application/json

{
  "name": "agentid-sign-in",
  "scope": {"type": "inbox", "id": "agent@example.agentmail.to"},
  "public_key": {"kty": "EC", "crv": "P-256", "x": "...", "y": "..."}
}
```

Store the returned `api_key_id` next to the private JWK. It is the `kid` used
below. One way to generate the key material with `jose` is:

```js
import { exportJWK, generateKeyPair } from 'jose';

const { privateKey, publicKey } = await generateKeyPair('ES256', { extractable: true });
const privateJwk = await exportJWK(privateKey); // move directly into the secret store
const { kty, crv, x, y } = await exportJWK(publicKey);
const publicJwk = { kty, crv, x, y };
```

Never send the AgentMail API key to AgentID. Never send the private JWK to
AgentMail, AgentID, or Locus.

### 2. Start and read the authorization transaction

Fetch the AgentID authorization URL returned by Locus. Enable an HTTP cookie
jar before the first request and keep it in memory or an owner-only temporary
file. Follow redirects only until the AgentID waiting page. Read the exact
22-character request ID displayed by that page.

The cookie and request ID belong to one transaction. Starting another GET may
create a new request ID. The continue request in step 4 must use the cookie from
the GET that produced the approved ID.

### 3. Sign and submit the exact approval

Create a compact ES256 JWS. Do not add issuer, audience, timestamps, or other
claims. The protected header and payload are exactly:

```json
{"alg":"ES256","typ":"agentid-approval+jwt","kid":"<api_key_id>"}
```

```json
{"jti":"<22-character-request-id>","inbox_id":"agent@example.agentmail.to"}
```

For example, after loading the private JWK and key ID from the secret store:

```js
import { CompactSign, importJWK } from 'jose';

const key = await importJWK(privateJwk, 'ES256');
const assertion = await new CompactSign(
  new TextEncoder().encode(JSON.stringify({ jti: requestId, inbox_id: inboxId })),
)
  .setProtectedHeader({ alg: 'ES256', typ: 'agentid-approval+jwt', kid: apiKeyId })
  .sign(key);
```

Submit it without an `Authorization` header:

```http
POST https://api.auth.agentid.com/v0/authorize/approve
Content-Type: application/json

{"assertion":"<compact JWS>","inbox_id":"agent@example.agentmail.to"}
```

Success is `204 No Content`. A non-204 response is not approval; stop and
inspect the response without logging secrets.

### 4. Continue with the same cookie

Using the same cookie jar from step 2, fetch and follow redirects from:

```text
https://auth.agentid.com/v0/authorize/continue?jti=<22-character-request-id>
```

Without that cookie AgentID returns `401`, even when the signature was valid.
Follow the redirect back to Locus exactly as returned. The standard OAuth
authorization response can include `code`, `state`, and
`iss=https://auth.agentid.com`; do not remove, rewrite, or reorder parameters.
Delete any temporary cookie jar after the callback completes.

For agent signup, replay the exact registration request after the Locus
callback succeeds. For MCP OAuth, keep the MCP client's login process running
so the final registered redirect URI can deliver its authorization code.

## Human-owned signup

- Signup: `https://platform.paywithlocus.com/signup`
- Authentication: verified email/password or the dashboard's supported social
  providers
- MCP: native OAuth through the metadata advertised by the Locus MCP resource

When MCP authorization starts first, use the sign-up link on the Locus login
page. The pending authorization survives email verification, MFA, and supported
social-provider redirects. On a remote host, copy the completed loopback
callback URL from the browser back into the waiting MCP client. Never ask the
human to reveal their password, email verification code, OAuth token, or Locus
API credential to the agent.

## Funding boundary

Neither signup path grants credits. An agent-owned account can create a
short-lived Stripe Checkout link after selecting capabilities. The human payer
funds prepaid usage but does not become the agent account's identity or receive
its credential.
