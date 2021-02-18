import { ConstructorFunction } from '../container/di-container';
import { Provider } from '../provider/provider';

export interface ProxyFactory {
  createProxy<T>(constructor: ConstructorFunction<T>, provider: Provider<T>): T;
}

export function createProxy<T>(constructor: ConstructorFunction<T>, provider: Provider<T>): T {

  let target: T;
  const proxy = Object.create(constructor.prototype);
  // console.log(`Created proxy of ${constructor.name}`);

  Object.getOwnPropertyNames(constructor.prototype).forEach((propertyName) => {
    if (propertyName === 'constructor') {
      return;
    }
    Object.defineProperty(proxy, propertyName, {
      get: () => {
        // console.log(`get: ${constructor.name}.${propertyName}`);
        const _this: any = target || (target = provider());
        return _this[propertyName].bind(_this);
      },
      set: (value) => {
        // console.log(`set: ${constructor.name}.${propertyName}`);
        const _this: any = target || (target = provider());
        _this[propertyName] = value;
      },
    });
  });
  return proxy;
}
