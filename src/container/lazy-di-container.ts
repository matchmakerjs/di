import 'reflect-metadata';
import { getInjectables, InjectionToken } from '../decorator/inject';
import { isInjectable } from '../decorator/injectable';
import { InstanceFactory, Provider } from '../provider/provider';
import { createProxy, ProxyFactory } from '../proxy/proxy-factory';
import { ConstructorFunction, DIContainer } from './di-container';

export class LazyDIContainer implements DIContainer {

  private instanceRegistry: Map<any, any> = new Map();
  private providerRegistry: Map<any, Provider<any>>;
  private proxyFactory?: ProxyFactory<any>;
  private providers: InstanceFactory[];
  private doNotCache = new Set<any>();

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
        const providerFromConstructor = this.createProviderFromConstructor(providerFactory);
        providersMap.set(providerFactory, () => this.proxyFactory(providerFactory, providerFromConstructor, this));
        return;
      }

      const key = providerFactory.provide;
      let provider: Provider<any>;

      if (!providerFactory.with) {
        if (typeof key === 'function' && isInjectable(key)) {
          const constructorProvider = this.createProviderFromConstructor(key);
          provider = constructorProvider;
          if (providerFactory.proxy !== false) {
            provider = () => this.proxyFactory(key, constructorProvider, this);
          }
        } else {
          throw new Error(`Provider function missing in factory of ${providerFactory.provide}`);
        }
      } else if (isInjectable(providerFactory.with as any)) {
        const constructorProvider = this.createProviderFromConstructor(providerFactory.with as any);
        provider = constructorProvider;
        if (providerFactory.proxy !== false) {
          provider = () => this.proxyFactory(providerFactory.with as any, constructorProvider, this);
        }
      } else {
        provider = providerFactory.with as Provider<any>;
      }

      if (typeof provider !== 'function') {
        throw new Error(`Provider of ${key.toString()} is not a function: ${providerFactory}`);
      }
      providersMap.set(key, provider);

      if (typeof providerFactory.singleton === 'boolean' ? !providerFactory.singleton : false) {
        this.doNotCache.add(key);
      }
    });
    return providersMap;
  }

  private createProviderFromConstructor(providerFactory: ConstructorFunction<any>) {
    if (typeof providerFactory !== 'function' || !isInjectable(providerFactory)) {
      throw new Error(`Decorate class ${providerFactory.name} with @Injectable()`);
    }
    return () => this.createInstance(providerFactory);
  }

  createInstance<T>(constructorFunction: ConstructorFunction<T>) {

    const params: any[] = Reflect.getMetadata('design:paramtypes', constructorFunction);
    const args: any[] = [];

    const injectables: { [key: number]: any } = getInjectables(constructorFunction);

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

    if (injectionToken === InjectionToken.container) {
      return this as any;
    }

    const provider = this.providerRegistry.get(injectionToken);
    if (provider) {
      const instance = provider(this); // this.createInstance(constructorFunction)
      if (instance === null || instance === undefined) {
        throw new Error('Provider of ' + injectionToken.toString() + ' returned ' + instance);
      }
      if (!this.doNotCache.has(injectionToken)) {
        this.instanceRegistry.set(injectionToken, instance);
      }
      return instance;
    }

    if (this.parent) {
      return this.parent.getInstance(injectionToken);
    }

    if (typeof injectionToken === 'function') {
      if (!isInjectable(injectionToken)) {
        throw new Error(`Decorate class ${injectionToken.name} with @Injectable()`);
      }
      const newInstance = this.proxyFactory(injectionToken, () => this.createInstance(injectionToken), this);
      if (!this.doNotCache.has(injectionToken)) {
        this.instanceRegistry.set(injectionToken, newInstance);
      }
      return newInstance;
    }
    throw new Error(`No provider for type ${injectionToken.toString()}`);
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
