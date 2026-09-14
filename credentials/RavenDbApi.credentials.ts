import type { ICredentialTestRequest, ICredentialType, INodeProperties } from 'n8n-workflow';

export class RavenDbApi implements ICredentialType {
	name = 'ravenDbApi';

	displayName = 'RavenDB API';

	icon = { light: 'file:ravendb.svg', dark: 'file:ravendb.dark.svg' } satisfies ICredentialType['icon'];

	documentationUrl = 'https://docs.ravendb.net/start/introduction';

	properties: INodeProperties[] = [
		{
			displayName: 'Server URL',
			name: 'serverUrl',
			type: 'string',
			default: 'http://localhost:8080',
			placeholder: 'https://a.ravendb.cluster:8080',
			description: 'Base URL of the RavenDB server or cluster node, without a database path',
			required: true,
		},
		{
			displayName: 'Authenticate With Mutual TLS',
			name: 'useMtls',
			type: 'boolean',
			default: false,
			description:
				'Whether to authenticate with an X.509 client certificate, as required by a RavenDB instance secured with mTLS',
		},
		{
			displayName: 'CA Certificate',
			name: 'caCertificate',
			type: 'string',
			typeOptions: { password: true, rows: 6 },
			default: '',
			description:
				'PEM-encoded CA certificate to trust, if the RavenDB server uses a certificate not signed by a public CA. Paste the certificate contents directly - do not provide a file path.',
			displayOptions: { show: { useMtls: [true] } },
		},
		{
			displayName: 'Client Certificate',
			name: 'clientCertificate',
			type: 'string',
			typeOptions: { password: true, rows: 6 },
			default: '',
			description:
				'PEM-encoded client certificate issued by the RavenDB cluster. Paste the certificate contents directly - do not provide a file path.',
			displayOptions: { show: { useMtls: [true] } },
			required: true,
		},
		{
			displayName: 'Client Private Key',
			name: 'clientPrivateKey',
			type: 'string',
			typeOptions: { password: true, rows: 6 },
			default: '',
			description: 'PEM-encoded private key matching the client certificate. Paste the key contents directly - do not provide a file path.',
			displayOptions: { show: { useMtls: [true] } },
			required: true,
		},
		{
			displayName: 'Private Key Passphrase',
			name: 'privateKeyPassphrase',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description: 'Passphrase protecting the private key above. Leave empty if the key is not encrypted.',
			displayOptions: { show: { useMtls: [true] } },
		},
	];

	// Only exercises plain connectivity to the server's unauthenticated build-info
	// endpoint. It cannot validate the client certificate fields above, because n8n's
	// credential tester issues a generic request and does not attach the custom
	// agentOptions this node builds in GenericFunctions.ts - see the README's mTLS section.
	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.serverUrl}}',
			url: '/build/version',
			method: 'GET',
		},
	};
}
