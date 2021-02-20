import 'reflect-metadata';
import { Inject } from '../decorator/inject';
import { InstanceFactory, Provider } from '../provider/provider';
import { createProxy, ProxyFactory } from '../proxy/proxy-factory';
import { ConstructorFunction, DIContainer } from './di-container';

export class LazyDIContainer implements DIContainer {
  private instanceRegistry: Map<any, any> = new Map();
  private providerRegistry: Map<any, Provider<any>>;
  private proxyFactory?: ProxyFactory<any>;
  private providers: InstanceFactory[];

  constructor(
    conf: {
      providers: InstanceFactory[];
      proxyFactory?: ProxyFactory<any>;
    },
    private parent?: DIContainer,
  ) {
    this.providers = conf.providers;
    this.proxyFactory = conf.proxyFactory || createProxy;
    this.providerRegistry = this.toProviderMap(conf.providers);
  }

  private toProviderMap(providers: InstanceFactory[]) {
    const providersMap: Map<any, Provider<any>> = new Map();
    providers?.forEach((providerFactory) => {
      if (typeof providerFactory === 'function') {
        const provider = this.createConstructorFromConstructor(providerFactory);
        providersMap.set(providerFactory, () => this.proxyFactory(providerFactory, provider, this));
        return;
      }

      const key = providerFactory.provide;
      if (typeof key === 'function' && key.prototype) {
        const provider = providerFactory.with || this.createConstructorFromConstructor(key);
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

  private createConstructorFromConstructor(providerFactory: ConstructorFunction<any>) {
    if (!providerFactory.prototype) {
      throw new Error(`${providerFactory.name} is not a class`);
    }
    if (Reflect.getMetadata('design:paramtypes', providerFactory) === undefined) {
      throw new Error(`Decorate class ${providerFactory.name} with @Injectable()`);
    }
    return () => this.createInstance(providerFactory);
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
    const existingInstance = this.instanceRegistry.get(injectionToken);
    if (existingInstance) {
      return existingInstance;
    }

    if (injectionToken === Inject.container) {
      return this as any;
    }

    const provider = this.providerRegistry.get(injectionToken);
    const providerInstance = provider && provider(); // this.createInstance(constructorFunction)
    if (providerInstance) {
      this.instanceRegistry.set(injectionToken, providerInstance);
      return providerInstance;
    }

    if (this.parent) {
      return this.parent.getInstance(injectionToken);
    }
    if (typeof injectionToken === 'function') {
      if (injectionToken.prototype) {
        if (Reflect.getMetadata('design:paramtypes', injectionToken) === undefined) {
          throw new Error(`Decorate class ${injectionToken.name} with @Injectable()`);
        }
        const newInstance = this.proxyFactory(injectionToken, () => this.createInstance(injectionToken), this);
        this.instanceRegistry.set(injectionToken, newInstance);
        return newInstance;
      }
      throw new Error(`No provider for type ${injectionToken.name}`);
    }
    throw new Error(`No provider for type ${injectionToken}`);
  }

  clone(providers: InstanceFactory[]) {
    const container = new LazyDIContainer(
      {
        providers: this.providers.concat(providers),
        proxyFactory: this.proxyFactory,
      },
      this.parent,
    );

    return container;
  }
}
