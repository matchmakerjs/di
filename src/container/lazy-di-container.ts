import "reflect-metadata";
import { ConstructorFunction, DIContainer } from './di-container';
import { Provider, ProviderFactory } from '../provider/provider';
import { createProxy, ProxyFactory } from '../proxy/proxy-factory';
import { CONTAINER, Inject } from '../decorator/inject';

type InstanceFactory = ProviderFactory<any> | ConstructorFunction<any>;

export class LazyDIContainer implements DIContainer {
  private registry: Map<any, any> = new Map();
  private providers: Map<any, Provider<any>>;
  private proxyFactory?: ProxyFactory<any>;

  constructor(conf: {
    providers: InstanceFactory[],
    proxyFactory?: ProxyFactory<any>
  }, private parent?: DIContainer) {
    this.proxyFactory = conf.proxyFactory || createProxy;
    this.providers = this.toProviderMap(conf.providers);
  }

  private toProviderMap(providers: InstanceFactory[]) {
    const providersMap: Map<any, Provider<any>> = new Map();
    providers?.forEach((providerFactory) => {
      if (typeof providerFactory === 'function') {
        if (!providerFactory.prototype) {
          throw new Error(`${providerFactory.name} is not a class`);
        }
        if (Reflect.getMetadata('design:paramtypes', providerFactory) === undefined) {
          throw new Error(`Decorate class ${providerFactory.name} with @Injectable()`);
        }
        providersMap.set(providerFactory, () =>
          this.proxyFactory(providerFactory, () => this.createInstance(providerFactory), this),
        );
        return;
      }
      const key = providerFactory.provide;
      if (typeof key === 'function' && key.prototype) {
        const provider = providerFactory.with || (() => this.createInstance(key));
        if (providerFactory.proxy === false) {
          providersMap.set(key, provider);
        } else {
          providersMap.set(key, () => this.proxyFactory(key, provider, this));
        }
        return;
      }
      if (!providerFactory.with) {
        throw new Error(`Provider function missing in factory of ${providerFactory.provide}`);
      }
      providersMap.set(key, providerFactory.with);
    });
    return providersMap;
  }

  createInstance<T>(constructorFunction: ConstructorFunction<T>) {
    const params: any[] = Reflect.getMetadata('design:paramtypes', constructorFunction);
    const args: any[] = [];

    const injectables: { [key: number]: any } = Reflect.getMetadata(Inject.metadataKey, constructorFunction);

    params?.forEach((paramType, index) => {
      if (injectables && index in injectables) {
        const injectionToken = injectables[index] || paramType;
        args.push(this.getInstance(injectionToken));
        return;
      }
      args.push(this.getInstance(paramType));
    });

    return new constructorFunction(...args);
  }

  getInstance<T>(constructorFunction: ConstructorFunction<T>): T {
    return this.get<T>(constructorFunction);
  }

  get<T>(injectionToken: any): T {
    const existingInstance = this.registry.get(injectionToken);
    if (existingInstance) {
      return existingInstance;
    }

    if (injectionToken == CONTAINER) {
      return this as any;
    }

    const provider = this.providers.get(injectionToken);

    const newInstance = provider && provider(); // this.createInstance(constructorFunction)

    if (!newInstance) {
      if (this.parent) {
        return this.parent.getInstance(injectionToken);
      }
      if (typeof injectionToken === 'function') {
        throw new Error(`No provider for type ${injectionToken.name}`);
      }
      throw new Error(`No provider for type ${injectionToken}`);
    }

    this.registry.set(injectionToken, newInstance);
    return newInstance;
  }

  clone() {
    const container = new LazyDIContainer({
      providers: [],
      proxyFactory: this.proxyFactory
    }, this.parent);
    container.providers = this.providers;
    return container;
  }
}
