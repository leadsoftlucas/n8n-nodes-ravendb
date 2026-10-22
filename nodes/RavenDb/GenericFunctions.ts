import type { IDataObject, IExecuteFunctions, IHttpRequestMethods } from 'n8n-workflow';

interface RavenDbApiCredentials {
	serverUrl: string;
	useMtls: boolean;
	caCertificate?: string;
	clientCertificate?: string;
	clientPrivateKey?: string;
	privateKeyPassphrase?: string;
}

// RavenDB's official `ravendb` SDK is intentionally not used here: n8n's community
// node verification rules require zero runtime dependencies, and also disallow
// importing Node's built-in http/https/url modules directly (they fail n8n Cloud's
// dependency check). Instead this talks to RavenDB's plain REST API
// (docs.ravendb.net) through n8n's own `this.helpers.httpRequestWithAuthentication`,
// using its `agentOptions` passthrough to attach the client certificate for mTLS.
// NOTE: n8n-core only honours `agentOptions` here from 2.19.0 on; older versions
// silently drop it, so the client certificate is not sent (see README, mTLS section).
export async function ravenDbApiRequest(
	this: IExecuteFunctions,
	method: IHttpRequestMethods,
	database: string,
	path: string,
	body?: IDataObject,
	qs?: IDataObject,
): Promise<IDataObject | IDataObject[] | undefined> {
	const credentials = (await this.getCredentials('ravenDbApi')) as unknown as RavenDbApiCredentials;

	const response = await this.helpers.httpRequestWithAuthentication.call(this, 'ravenDbApi', {
		method,
		baseURL: credentials.serverUrl.replace(/\/+$/, ''),
		url: `/databases/${encodeURIComponent(database)}${path}`,
		qs,
		headers: {
			'Content-Type': 'application/json',
			Accept: 'application/json',
		},
		body: body !== undefined ? JSON.stringify(body) : undefined,
		...(credentials.useMtls
			? {
					agentOptions: {
						ca: credentials.caCertificate || undefined,
						cert: credentials.clientCertificate || undefined,
						key: credentials.clientPrivateKey || undefined,
						passphrase: credentials.privateKeyPassphrase || undefined,
					},
				}
			: {}),
	});

	if (response === undefined || response === null || response === '') {
		return undefined;
	}

	if (typeof response === 'string') {
		try {
			return JSON.parse(response) as IDataObject | IDataObject[];
		} catch {
			return response as unknown as IDataObject;
		}
	}

	return response as IDataObject | IDataObject[];
}
