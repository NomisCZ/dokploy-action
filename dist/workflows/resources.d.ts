/**
 * Resolve existing project and environment. Resources are never created.
 */
import type { DokployClient } from '../client/dokploy-client';
import type { ActionInputs } from '../types/dokploy';
export declare function resolveProject(client: DokployClient, inputs: ActionInputs): Promise<string>;
export declare function resolveEnvironment(client: DokployClient, inputs: ActionInputs, projectId: string): Promise<string>;
//# sourceMappingURL=resources.d.ts.map