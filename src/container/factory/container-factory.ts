import { LazyDIContainer } from "../lazy-di-container";
import { ProxyFactory } from "../../proxy/proxy-factory";
import { DIContainerModule } from "./container-module";
import { HealthChecker } from "./health-checker";

export function createContainer(conf: {
    modules: DIContainerModule[],
    proxyFactory?: ProxyFactory<any>
}): [LazyDIContainer, () => Promise<void>] {
    const modules = conf?.modules || [];
    const container = new LazyDIContainer({
        proxyFactory: conf?.proxyFactory,
        providers: [
            {
                provide: HealthChecker,
                with: () => ({
                    isHealthy: () => Promise.all(modules
                        .filter(module => module.isHealthy)
                        .map(module => module.isHealthy().catch(e => {
                            console.error(e);
                            return false;
                        })))
                        .then(results => results.findIndex((entry) => !entry) < 0)
                } as HealthChecker)
            },
            ...modules.flatMap(module => module.providers),
        ]
    });
    return [container, async () => {
        await Promise.allSettled(modules
            .filter(module => module.cleanUp)
            .map(module => module.cleanUp()));
    }];
}
