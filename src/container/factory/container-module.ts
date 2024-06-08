import { InstanceFactory } from "../../provider/provider";

export type DIContainerModule = {
    providers: InstanceFactory[],
    cleanUp?: () => Promise<void>,
    isHealthy?: () => Promise<boolean>;
};
