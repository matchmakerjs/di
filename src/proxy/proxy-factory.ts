import { ConstructorFunction, DIContainer } from '../container/di-container';
import { Provider } from '../provider/provider';

export type ProxyFactory<T> = (constructor: ConstructorFunction<T>, provider: Provider<T>, container: DIContainer) => T;

export function createProxy<T>(constructor: ConstructorFunction<T>, provider: Provider<T>): T {
  let target: T;
  const proxy = Object.create(constructor.prototype);

  Object.getOwnPropertyNames(constructor.prototype).forEach((propertyName) => {
    if (propertyName === 'constructor') {
      return;
    }
    Object.defineProperty(proxy, propertyName, {
      get: () => {
        const _this: any = target || (target = provider());
        return _this[propertyName].bind(_this);
      },
      set: (value) => {
        const _this: any = target || (target = provider());
        _this[propertyName] = value;
      },
    });
  });
  return proxy;
}
