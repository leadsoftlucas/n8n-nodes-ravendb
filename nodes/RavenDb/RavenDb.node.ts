import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { ravenDbApiRequest } from './GenericFunctions';

export class RavenDb implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'RavenDB',
		name: 'ravenDb',
		icon: { light: 'file:ravendb.svg', dark: 'file:ravendb.dark.svg' },
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Read, write, and query documents in a RavenDB database',
		defaults: {
			name: 'RavenDB',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'ravenDbApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Document', value: 'document' },
					{ name: 'Query', value: 'query' },
				],
				default: 'document',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['document'],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Retrieve a document by ID',
						action: 'Get a document',
					},
					{
						name: 'Create or Update',
						value: 'put',
						description: 'Create a new document, or overwrite an existing one, by ID',
						action: 'Create or update a document',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a document by ID',
						action: 'Delete a document',
					},
				],
				default: 'get',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['query'],
					},
				},
				options: [
					{
						name: 'Run Query',
						value: 'run',
						description: 'Run an RQL query',
						action: 'Run an RQL query',
					},
				],
				default: 'run',
			},
			{
				displayName: 'Database Name',
				name: 'database',
				type: 'string',
				default: '',
				placeholder: 'Northwind',
				description: 'Name of the RavenDB database to operate on',
				required: true,
			},
			{
				displayName: 'Document ID',
				name: 'documentId',
				type: 'string',
				default: '',
				placeholder: 'orders/1-A',
				description: 'ID of the document',
				required: true,
				displayOptions: {
					show: {
						resource: ['document'],
						operation: ['get', 'put', 'delete'],
					},
				},
			},
			{
				displayName: 'Document Data',
				name: 'documentData',
				type: 'json',
				default: '{}',
				description: 'JSON body to store for this document. RavenDB metadata (e.g. @collection) can be set under an "@metadata" key.',
				required: true,
				displayOptions: {
					show: {
						resource: ['document'],
						operation: ['put'],
					},
				},
			},
			{
				displayName: 'RQL Query',
				name: 'query',
				type: 'string',
				typeOptions: { rows: 4 },
				default: 'from "Orders"',
				placeholder: 'from "Orders" where Company = $company',
				description: 'RavenDB Query Language (RQL) statement to run. See docs.ravendb.net for RQL syntax.',
				required: true,
				displayOptions: {
					show: {
						resource: ['query'],
						operation: ['run'],
					},
				},
			},
			{
				displayName: 'Query Parameters',
				name: 'queryParameters',
				type: 'json',
				default: '{}',
				description: 'JSON object of parameters referenced in the RQL query as $paramName',
				displayOptions: {
					show: {
						resource: ['query'],
						operation: ['run'],
					},
				},
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				const database = this.getNodeParameter('database', i) as string;
				let responseData: IDataObject | IDataObject[] | undefined;

				if (resource === 'document') {
					const documentId = this.getNodeParameter('documentId', i) as string;

					if (operation === 'get') {
						responseData = await ravenDbApiRequest.call(this, 'GET', database, '/docs', undefined, {
							id: documentId,
						});
					} else if (operation === 'put') {
						const documentData = this.getNodeParameter('documentData', i) as IDataObject;
						responseData = await ravenDbApiRequest.call(
							this,
							'PUT',
							database,
							'/docs',
							documentData,
							{ id: documentId },
						);
					} else if (operation === 'delete') {
						responseData = await ravenDbApiRequest.call(this, 'DELETE', database, '/docs', undefined, {
							id: documentId,
						});
						responseData = responseData ?? { success: true, id: documentId };
					} else {
						throw new NodeOperationError(this.getNode(), `Unknown operation "${operation}" for resource "document"`, {
							itemIndex: i,
						});
					}
				} else if (resource === 'query') {
					const query = this.getNodeParameter('query', i) as string;
					const queryParameters = this.getNodeParameter('queryParameters', i, {}) as IDataObject;

					responseData = await ravenDbApiRequest.call(this, 'POST', database, '/queries', {
						Query: query,
						QueryParameters: queryParameters,
					});
				} else {
					throw new NodeOperationError(this.getNode(), `Unknown resource "${resource}"`, { itemIndex: i });
				}

				if (Array.isArray(responseData)) {
					for (const entry of responseData) {
						returnData.push({ json: entry, pairedItem: { item: i } });
					}
				} else {
					returnData.push({ json: responseData ?? {}, pairedItem: { item: i } });
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}

				if (error instanceof NodeOperationError) {
					throw new NodeOperationError(this.getNode(), error, { itemIndex: i });
				}

				throw new NodeApiError(this.getNode(), { message: (error as Error).message }, { itemIndex: i });
			}
		}

		return [returnData];
	}
}
