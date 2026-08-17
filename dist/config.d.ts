/**
 * Configuration builders for applications
 */
import type { ActionInputs, Application } from './types/dokploy';
export declare function buildApplicationConfig(name: string, projectId: string, environmentId: string, serverId: string, inputs: ActionInputs): Partial<Application>;
