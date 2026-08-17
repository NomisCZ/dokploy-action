/**
 * Dokploy API Client
 * Comprehensive wrapper for all Dokploy API endpoints
 */
import type { DokployConfig, Project, Environment, Application, Container, Deployment, Compose } from '../types/dokploy';
export declare class DokployClient {
    private baseUrl;
    private apiKey;
    private client;
    private config;
    constructor(config: DokployConfig);
    /**
     * Make a GET request to Dokploy API
     */
    get<T>(endpoint: string): Promise<T>;
    /**
     * Make a POST request to Dokploy API
     */
    post<T, B = unknown>(endpoint: string, body?: B): Promise<T>;
    getAllProjects(): Promise<Project[]>;
    getProject(projectId: string): Promise<Project>;
    findProjectByName(projectName: string): Promise<Project | undefined>;
    findEnvironmentInProject(projectId: string, environmentName: string): Promise<Environment | undefined>;
    getApplication(applicationId: string): Promise<Application>;
    saveDockerProvider(applicationId: string, dockerImage: string, registryUrl?: string, username?: string, password?: string): Promise<void>;
    stopApplication(applicationId: string): Promise<void>;
    deployApplication(applicationId: string, title?: string, description?: string): Promise<void>;
    listApplicationDeployments(applicationId: string): Promise<Deployment[]>;
    listComposeDeployments(composeId: string): Promise<Deployment[]>;
    waitForServiceDeployment(options: {
        kind: 'application' | 'compose';
        serviceId: string;
        previousDeploymentIds?: string[];
        startedAfterMs?: number;
        timeoutSeconds?: number;
        pollIntervalSeconds?: number;
    }): Promise<Deployment>;
    getContainers(applicationId: string): Promise<Container[]>;
    removeContainer(containerName: string): Promise<void>;
    /**
     * Get environments for a project
     */
    getEnvironmentsByProjectId(projectId: string): Promise<Environment[]>;
    /**
     * Get a specific compose service
     */
    getCompose(composeId: string): Promise<Compose>;
    /**
     * Find compose service by name in an environment
     */
    findComposeByName(environmentId: string, composeName: string): Promise<Compose | undefined>;
    /**
     * Update compose service configuration
     */
    updateCompose(composeId: string, config: Record<string, unknown>): Promise<void>;
    /**
     * Deploy a compose service
     */
    deployCompose(composeId: string, title?: string, description?: string): Promise<void>;
    /**
     * Save compose file content.
     * Uses compose.update to set composeFile.
     */
    saveComposeFile(composeId: string, composeFile: string): Promise<void>;
}
//# sourceMappingURL=dokploy-client.d.ts.map