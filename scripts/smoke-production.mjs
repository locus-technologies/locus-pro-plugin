const MCP_URL = "https://api.paywithlocus.com/api/credits/mcp";
const RESOURCE_METADATA_URL =
  "https://api.paywithlocus.com/.well-known/oauth-protected-resource/api/credits/mcp";
const AUTH_ISSUER = "https://api.paywithlocus.com/api/credits/mcp/oauth";
const AUTH_METADATA_URL =
  "https://api.paywithlocus.com/.well-known/oauth-authorization-server/api/credits/mcp/oauth";

function check(condition, message) {
  if (!condition) throw new Error(message);
}

async function get(url) {
  return fetch(url, {
    headers: { "X-Source-Name": "plugin-ci-smoke" },
    signal: AbortSignal.timeout(15_000),
  });
}

const browserOrigin = "https://example.com";
const preflight = await fetch(MCP_URL, {
  method: "OPTIONS",
  headers: {
    Origin: browserOrigin,
    "Access-Control-Request-Method": "POST",
    "Access-Control-Request-Headers": "authorization,content-type,x-source-name",
  },
  signal: AbortSignal.timeout(15_000),
});
check(preflight.status === 204, `MCP browser preflight returned ${preflight.status}, expected 204`);
check(
  preflight.headers.get("access-control-allow-origin") === browserOrigin,
  "MCP browser preflight did not allow the requesting origin",
);
const allowedHeaders = (preflight.headers.get("access-control-allow-headers") ?? "").toLowerCase();
check(allowedHeaders.includes("x-source-name"), "MCP browser preflight rejected X-Source-Name");

const challenge = await get(MCP_URL);
check(challenge.status === 401, `MCP challenge returned ${challenge.status}, expected 401`);
const authenticate = challenge.headers.get("www-authenticate") ?? "";
check(
  authenticate.includes(`resource_metadata="${RESOURCE_METADATA_URL}"`),
  "MCP challenge omitted the expected protected-resource metadata URL",
);
for (const scope of ["mcp:read", "mcp:execute", "offline_access"]) {
  check(authenticate.includes(scope), `MCP challenge omitted ${scope}`);
}

const resourceResponse = await get(RESOURCE_METADATA_URL);
check(resourceResponse.ok, `Protected-resource metadata returned ${resourceResponse.status}`);
const resource = await resourceResponse.json();
check(resource.resource === MCP_URL, "Protected-resource metadata identifies the wrong MCP URL");
check(
  Array.isArray(resource.authorization_servers) &&
    resource.authorization_servers.includes(AUTH_ISSUER),
  "Protected-resource metadata omitted the production authorization issuer",
);

const authResponse = await get(AUTH_METADATA_URL);
check(authResponse.ok, `Authorization metadata returned ${authResponse.status}`);
const auth = await authResponse.json();
check(auth.issuer === AUTH_ISSUER, "Authorization metadata identifies the wrong issuer");
check(typeof auth.registration_endpoint === "string", "Dynamic registration is not advertised");
check(
  typeof auth.device_authorization_endpoint === "string",
  "Device authorization is not advertised",
);
check(
  auth.code_challenge_methods_supported?.includes("S256"),
  "PKCE S256 is not advertised",
);
for (const grant of [
  "authorization_code",
  "refresh_token",
  "urn:ietf:params:oauth:grant-type:device_code",
]) {
  check(auth.grant_types_supported?.includes(grant), `Authorization metadata omitted ${grant}`);
}

console.log("production MCP CORS and OAuth discovery: OK");
