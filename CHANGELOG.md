# Changelog

## Unreleased

- Document/Query responses are unwrapped (one item per RavenDB result).
- JSON-string parameters are parsed; Database Name and Document ID are validated.
- CI/publish workflows: restored stripped GitHub expressions.
- README: removed npm badge; documented that the package is not yet on npm.

## 0.1.0 (not yet published to npm)

- Initial version: `RavenDB` node with `Document` (Get, Create or Update,
  Delete) and `Query` (Run Query / RQL) resources.
- `RavenDB API` credential, with optional client-certificate (mTLS)
  authentication.
