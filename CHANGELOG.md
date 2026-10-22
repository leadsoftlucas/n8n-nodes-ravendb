# Changelog

## Unreleased

- Document/Query responses are unwrapped (one item per RavenDB result).
- JSON-string parameters are parsed; Database Name and Document ID are validated.
- CI/publish workflows: restored stripped GitHub expressions.
- Verified live against RavenDB 7.2.2 (Docker): Get/Put/Delete/Query unsecured and over mTLS (with and without key passphrase), using n8n's HTTP client from `@n8n/backend-network`; not run in a full n8n instance.
- Documented that mTLS needs n8n-core >= 2.19.0 (older versions drop `agentOptions`).
- README: removed npm badge; documented that the package is not yet on npm.

## 0.1.0 (not yet published to npm)

- Initial version: `RavenDB` node with `Document` (Get, Create or Update,
  Delete) and `Query` (Run Query / RQL) resources.
- `RavenDB API` credential, with optional client-certificate (mTLS)
  authentication.
