import {
  DatabaseEndpoint,
  DatabaseEndpointWithNamespace,
  Endpoint,
  EndpointWithNamespace,
} from "@repo/zod-types";

export class EndpointsSerializer {
  static serializeEndpoint(dbEndpoint: DatabaseEndpoint): Endpoint {
    return {
      uuid: dbEndpoint.uuid,
      name: dbEndpoint.name,
      description: dbEndpoint.description,
      namespace_uuid: dbEndpoint.namespace_uuid,
      enable_api_key_auth: dbEndpoint.enable_api_key_auth,
      use_query_param_auth: dbEndpoint.use_query_param_auth,
      created_at: dbEndpoint.created_at.toISOString(),
      updated_at: dbEndpoint.updated_at.toISOString(),
    };
  }

  static serializeEndpointList(dbEndpoints: DatabaseEndpoint[]): Endpoint[] {
    return dbEndpoints.map(this.serializeEndpoint);
  }

  static serializeEndpointWithNamespace(
    dbEndpoint: DatabaseEndpointWithNamespace,
  ): EndpointWithNamespace {
    return {
      uuid: dbEndpoint.uuid,
      name: dbEndpoint.name,
      description: dbEndpoint.description,
      namespace_uuid: dbEndpoint.namespace_uuid,
      enable_api_key_auth: dbEndpoint.enable_api_key_auth,
      use_query_param_auth: dbEndpoint.use_query_param_auth,
      created_at: dbEndpoint.created_at.toISOString(),
      updated_at: dbEndpoint.updated_at.toISOString(),
      namespace: {
        uuid: dbEndpoint.namespace.uuid,
        name: dbEndpoint.namespace.name,
        description: dbEndpoint.namespace.description,
        created_at: dbEndpoint.namespace.created_at.toISOString(),
        updated_at: dbEndpoint.namespace.updated_at.toISOString(),
      },
    };
  }

  static serializeEndpointWithNamespaceList(
    dbEndpoints: DatabaseEndpointWithNamespace[],
  ): EndpointWithNamespace[] {
    return dbEndpoints.map(this.serializeEndpointWithNamespace);
  }
}
