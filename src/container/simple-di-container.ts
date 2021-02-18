import "reflect-metadata";
import { ConstructorFunction, DIContainer } from './di-container';
import { Provider, ProviderFactory } from '../provider/provider';
import { createProxy, ProxyFactory } from '../proxy/proxy-factory';
import { Inject } from '../decorator/inject';

type InstanceFactory = ProviderFactory<any> | ConstructorFunction<any>;

export class SimpleDIContainer implements DIContainer {
  private registry: Map<any, any> = new Map();
  private providers: Map<any, Provider<any>>;
  private proxyFactory: ProxyFactory = {
    createProxy
  };

  constructor(providers: InstanceFactory[], private parent?: DIContainer) {
    this.providers = this.toProviderMap(providers);
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
          this.proxyFactory.createProxy(providerFactory, () => this.createInstance(providerFactory)),
        );
        return;
      }
      const key = providerFactory.provide;
      if (typeof key === 'function' && key.prototype) {
        const provider = providerFactory.with || (() => this.createInstance(key));
        if (providerFactory.proxy === false) {
          providersMap.set(key, provider);
        } else {
          providersMap.set(key, () => this.proxyFactory.createProxy(key, provider));
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

  private createInstance<T>(constructorFunction: ConstructorFunction<T>) {
    const params: any[] = Reflect.getMetadata('design:paramtypes', constructorFunction);
    const args: any[] = [];

    const injectables: { [key: number]: any } = Reflect.getMetadata(Inject.metadataKey, constructorFunction);

    params?.forEach((paramType, index) => {
      if (injectables && index in injectables) {
        args.push(this.getInstance(injectables[index] || paramType));
        return;
      }
      args.push(this.getInstance(paramType));
    });

    return new constructorFunction(...args);
  }

  getInstance<T>(constructorFunction: ConstructorFunction<T>): T {
    return this.get<T>(constructorFunction);
  }

  get<T>(key: any): T {
    const existingInstance = this.registry.get(key);
    if (existingInstance) {
      return existingInstance;
    }

    const provider = this.providers.get(key);

    const newInstance = provider && provider(); // this.createInstance(constructorFunction)

    if (!newInstance) {
      if (this.parent) {
        return this.parent.getInstance(key);
      }
      if (typeof key === 'function') {
        throw new Error(`No provider for type ${key.name}`);
      }
      throw new Error(`No provider for type ${key}`);
    }

    this.registry.set(key, newInstance);
    return newInstance;
  }

  setProxyFactory(proxyFactory: ProxyFactory & NonNullable<ProxyFactory>) {
    if (!proxyFactory) {
      throw new Error('Proxy factory cannot be set to null');
    }
    this.proxyFactory = proxyFactory;
  }
}
