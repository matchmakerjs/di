import { InstanceFactory } from "../../provider/provider";
import { HealthChecker } from "./health-checker";

export type DIContainerModule = {
    providers: InstanceFactory[],
    dispose?: () => Promise<void>
} & HealthChecker;