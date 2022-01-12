import { ConstructorFunction, DIContainer } from "../container/di-container";

export type Provider<E> = E extends Promise<any> ? never : (container: DIContainer) => E;

export type ProviderFactory<T> = {
  provide: any;
  with?: Provider<T> | ConstructorFunction<any>;
  proxy?: boolean;
  singleton?: boolean
};

export type InstanceFactory = ProviderFactory<any> | ConstructorFunction<any>;