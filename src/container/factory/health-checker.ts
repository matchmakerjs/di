export abstract class HealthChecker {
    abstract isHealthy(): Promise<boolean>;
}