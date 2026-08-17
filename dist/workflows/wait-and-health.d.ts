/**
 * Shared wait-for-deployment step.
 */
import type { DokployClient } from '../client/dokploy-client';
import type { ActionInputs } from '../types/dokploy';
export declare function waitForQueuedDeployment(options: {
    client: DokployClient;
    inputs: ActionInputs;
    kind: 'application' | 'compose';
    serviceId: string;
    previousDeploymentIds: string[];
    startedAfterMs: number;
    logDuration?: boolean;
}): Promise<boolean>;
//# sourceMappingURL=wait-and-health.d.ts.map