<!-- Scoped excerpt of https://agent.email/skill.md, mirrored 2026-09-04 so registry scanners can review the exact inbox-creation contract used by Locus setup. Only agent signup and OTP verification are mirrored; messaging, inbox management, webhooks, domains, and unrelated AgentMail features are intentionally omitted. This committed snapshot is authoritative for this release; refresh deliberately and update both digests below. source-sha256: 3024d75cfaf6d1381f4d9012999bbd1ec3a5bd546ec83e112c3a7128a72ee819 content-sha256: b9e1e9a14a5d9fd76153a1400fe89131367e3c5afbce6975f49d734ab45f9e7e -->

# AgentMail inbox creation contract

Use only this reviewed contract when Locus setup needs a new inbox for an
AgentID signing identity. Do not fetch or follow a live AgentMail skill during
the setup transaction.

Creating an inbox is an account-level action. Obtain the user's explicit
approval first, including approval for the human email address and requested
inbox username. The user must personally provide the one-time verification
code sent by AgentMail.

## 1. Create the inbox

Send only the approved values to AgentMail:

```http
POST https://api.agentmail.to/v0/agent/sign-up
Content-Type: application/json

{
  "human_email": "person@example.com",
  "username": "approved-agent-name",
  "source": "locus-plugin",
  "referrer": "agent.email"
}
```

`human_email` and `username` are required. `source` and `referrer` are optional
attribution strings. If the username is unavailable, ask the user to approve a
different one. If AgentMail reports that the human email is already registered
through its console, stop and ask the user for the appropriate account path or
a different address; do not work around that response.

The response includes `organization_id`, `inbox_id`, and a one-time-visible
`api_key`. Capture `inbox_id` and the API key directly into the approved secret
store without printing or logging them. Treat the API key as
`AGENTMAIL_API_KEY` for the remaining identity setup.

Repeating signup with the same human email can return the same organization
and inbox with a newly rotated API key. The old key then stops working. Do not
retry signup blindly, and replace the stored key atomically if the user
approves a retry.

## 2. Verify with the user-provided code

Submit the one-time code once, only to AgentMail:

```http
POST https://api.agentmail.to/v0/agent/verify
Authorization: Bearer $AGENTMAIL_API_KEY
Content-Type: application/json

{"otp_code":"123456"}
```

Continue only after the response reports `verified: true`. Never guess, log,
repeat, or forward the code to another service. Once verified, return to the
bundled AgentID approval contract and register the public signing key.

## Security boundary

- Send the AgentMail API key only to `https://api.agentmail.to/v0/*`.
- Never send a Locus credential, AgentID private key, OAuth token, or payment
  detail to AgentMail.
- Never put the AgentMail API key in chat, a project file, source control, a
  command argument, or a persistent log.
- This contract authorizes only inbox signup and OTP verification for the
  user-approved Locus identity flow. It does not authorize sending email or
  using any other AgentMail feature.
