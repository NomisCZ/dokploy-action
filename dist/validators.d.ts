/**
 * Input Validation Module for Dokploy Deployments
 *
 * Validates all inputs before deployment to catch errors early
 * and provide helpful error messages to users.
 *
 * Based on Dokploy API constraints:
 * - Names: Must be valid DNS names
 */
/**
 * Validation error with detailed context
 */
export declare class ValidationError extends Error {
    field: string;
    value: unknown;
    suggestion?: string | undefined;
    constructor(message: string, field: string, value: unknown, suggestion?: string | undefined);
}
/**
 * Validate DNS name component
 * Must follow RFC 1123: lowercase alphanumeric and hyphens, cannot start/end with hyphen
 */
export declare function validateDnsName(value: string | undefined, fieldName: string): void;
/**
 * Validate port number
 */
export declare function validatePort(value: number | undefined, fieldName: string): void;
/**
 * Validate Docker image format
 */
export declare function validateDockerImage(value: string | undefined, fieldName: string): void;
/**
 * Validate all inputs before deployment
 * Throws ValidationError if any validation fails
 */
export declare function validateAllInputs(inputs: {
    dockerImage: string;
    deploymentType?: string;
    applicationName?: string;
    projectName?: string;
    environmentName?: string;
}): void;
/**
 * Format validation errors for user-friendly display
 */
export declare function formatValidationError(error: ValidationError): string;
