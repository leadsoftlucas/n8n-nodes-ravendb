<div align="center">

# RavenDB — n8n Community Node

**🇺🇸 English** · [🇧🇷 Português (Brasil)](README.pt-BR.md)

An **n8n community node for RavenDB** that lets your workflows read, write, and
query documents in a RavenDB database — including a **RavenDB cluster secured
with mTLS (client certificate) authentication**.

[![CI](https://img.shields.io/github/actions/workflow/status/leadsoftlucas/n8n-nodes-ravendb/ci.yml?branch=main&label=CI)](.github/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![npm version](https://img.shields.io/npm/v/n8n-nodes-ravendb)](https://www.npmjs.com/package/n8n-nodes-ravendb)
[![RavenDB](https://img.shields.io/badge/RavenDB-REST%20API-b3131e)](https://ravendb.net)

</div>

It exists so an [n8n](https://n8n.io) workflow can talk to a real
[RavenDB](https://ravendb.net) database — get, create/update, and delete
documents by ID, and run [RQL](https://docs.ravendb.net/client-api/session/querying/what-is-rql)
queries — using RavenDB's own documented REST API, with no dependency on the
official `ravendb` SDK and, when the target instance requires it, full support
for **client-certificate (mTLS) authentication**.

> **Independent project, not an official RavenDB release.** This node is built
> and maintained by [Lucas R. Tavares](https://github.com/leadsoftlucas), a RavenDB
> employee, on his own initiative and in his own personal GitHub account. It is
> **not published by RavenDB the company and not covered by RavenDB's official
> support.** Use it, fork it, or copy from it — just don't assume it carries
> RavenDB's institutional backing.

## What it does

The **RavenDB** node exposes two resources:

| Resource   | Operation        | REST call                                       |
| ---------- | ---------------- | ------------------------------------------------ |
| Document   | Get              | `GET /databases/{db}/docs?id={id}`               |
| Document   | Create or Update | `PUT /databases/{db}/docs?id={id}`               |
| Document   | Delete           | `DELETE /databases/{db}/docs?id={id}`            |
| Query      | Run Query        | `POST /databases/{db}/queries` with an RQL body |

Every operation targets a **Database Name** field on the node, so a single
credential (one RavenDB server or cluster) can drive operations against any
number of databases in the same workflow.

## Why no `ravendb` SDK

n8n's community node verification rules require **zero runtime dependencies**
beyond `devDependencies`. The official [`ravendb`](https://www.npmjs.com/package/ravendb)
npm package is a full client with its own dependency tree, so this node instead
calls RavenDB's plain [REST API](https://docs.ravendb.net) directly, through n8n's
own built-in HTTP client (`this.helpers.httpRequestWithAuthentication`).

## Credentials

Create a **RavenDB API** credential with:

| Field                          | Required               | Description                                                     |
| ------------------------------- | ------------------------ | ------------------------------------------------------------------ |
| Server URL                     | Yes                     | Base URL of the RavenDB server or cluster node, e.g. `https://a.ravendb.cluster:8080` |
| Authenticate With Mutual TLS   | No (default off)        | Turn on for a RavenDB instance secured with client-certificate (mTLS) authentication |
| CA Certificate                 | Only if the above is on | PEM-encoded CA certificate, if the server isn't signed by a public CA |
| Client Certificate             | Only if the above is on | PEM-encoded X.509 client certificate issued by the RavenDB cluster |
| Client Private Key             | Only if the above is on | PEM-encoded private key matching the client certificate         |
| Private Key Passphrase         | No                      | Passphrase for the private key, if it is encrypted              |

All four certificate/key fields are pasted as **PEM text directly into the
credential** — never as a file path or an environment variable reference. See
[Advanced: mTLS setup](#-advanced-mtls-setup) below for why, and for how to get
these values out of a RavenDB cluster.

## Quick start

1. Add a **RavenDB API** credential with your server's URL.
2. Add a **RavenDB** node, pick **Document → Get**, set **Database Name** and
   **Document ID**.
3. Run the node — the document's JSON comes back as the item's output.

<details>
<summary>Example: querying with RQL</summary>

- Resource: `Query`
- Operation: `Run Query`
- Database Name: `Northwind`
- RQL Query:
  ```
  from "Orders" where Company = $company
  ```
- Query Parameters:
  ```json
  { "company": "companies/1-A" }
  ```

This mirrors RavenDB's own documented query endpoint:
`POST /databases/Northwind/queries` with body `{"Query": "...", "QueryParameters": {...}}`.
See [RavenDB's RQL documentation](https://docs.ravendb.net/client-api/session/querying/what-is-rql)
for query syntax.

</details>

<details>
<summary>Advanced: mTLS setup</summary>

### Why there's no way to reuse n8n's built-in "SSL Certificate" credential

This was confirmed by n8n itself in a
[community forum thread](https://community.n8n.io/t/custom-node-with-client-certificate-mtls-authentication/313155):
there is no supported way for a community node to reuse n8n's native SSL
Certificate credential type. This node instead ships its own **RavenDB API**
credential type with dedicated CA/client-certificate/private-key/passphrase
fields (see [Credentials](#credentials) above), and builds a Node.js
`https.Agent`-equivalent (via n8n's `agentOptions` request option) from those
values at request time — no external library, no file-system access.

### Why PEM text, never a file path

Community node verification explicitly disallows reading credentials from the
file system or environment variables at runtime — a credential must be
self-contained in what the user pastes into n8n's UI. That's why every
certificate/key field above is plain PEM text (`-----BEGIN CERTIFICATE-----…`),
never a path like `/etc/ravendb/certs/client.pem`.

### Getting your RavenDB client certificate as PEM text

If your RavenDB cluster issued you a `.pfx`/`.p12` client certificate bundle
(the default RavenDB Setup Wizard output), extract the PEM pieces with OpenSSL:

```bash
# Client certificate
openssl pkcs12 -in client.pfx -clcerts -nokeys -out client-cert.pem

# Private key (add -nodes to skip passphrase-protecting the extracted key,
# or omit it and use the passphrase you set in the "Private Key Passphrase" field)
openssl pkcs12 -in client.pfx -nocerts -out client-key.pem

# CA certificate, if your cluster uses a private CA
openssl pkcs12 -in client.pfx -cacerts -nokeys -chain -out ca-cert.pem
```

Paste the contents of each resulting `.pem` file into the matching credential
field.

</details>

<details>
<summary>Troubleshooting</summary>

- **"Authenticate With Mutual TLS" test button doesn't validate my certificate.**
  n8n's built-in credential tester issues a plain, generic HTTP request and does
  not attach this node's custom `agentOptions` — so the test can only confirm
  the **Server URL** is reachable, not that your certificate is valid. Run an
  actual node operation to validate the full mTLS handshake.
- **`RavenDB request ... failed with status 404`.** The document ID doesn't
  exist in the target database - double check **Database Name** and **Document ID**.
- **`RavenDB request ... failed with status 403` on an mTLS-secured cluster.**
  The client certificate you provided isn't authorized for that database or
  operation in RavenDB's own security configuration - check the certificate's
  permissions in the RavenDB Studio (`Manage Server → Certificates`).
- **Connection errors against an unsecured (`http://`) server.** "Authenticate
  With Mutual TLS" only applies to `https://` server URLs - leave it off for a
  plain HTTP development instance.

</details>

## Requirements

- n8n `1.x` (community nodes API version 1)
- A reachable RavenDB server or cluster - see
  [RavenDB's Docker/container guide](https://docs.ravendb.net/start/containers/general-guide)
  or [docs.ravendb.net](https://docs.ravendb.net) for local setup

## Contributing

Issues and pull requests are welcome. This node was built by
[Lucas R. Tavares](https://github.com/leadsoftlucas) with [Claude Code](https://claude.com/claude-code)
as a pair-programming collaborator. Please keep changes aligned with the two
resources described above (Document, Query) rather than expanding scope without
discussion first.

## License

[MIT](LICENSE) © 2026 Lucas R. Tavares

## Related links

- [RavenDB documentation](https://docs.ravendb.net)
- [RavenDB REST API reference](https://docs.ravendb.net/client-api/rest-api/documents/get)
- [RavenDB Query Language (RQL)](https://docs.ravendb.net/client-api/session/querying/what-is-rql)
- [n8n community node documentation](https://docs.n8n.io/integrations/creating-nodes/)
- [n8n community node verification guidelines](https://docs.n8n.io/integrations/creating-nodes/build/reference/verification-guidelines/)
