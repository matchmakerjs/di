import 'reflect-metadata';
import { ConstructorFunction } from '../container/di-container';

const metadataKey = Symbol('inject');
const containerKey = Symbol('container');

export const InjectionToken = {
  container: containerKey,
}

export function Inject(key: any) {
  return (target: object, propertyKey: string | symbol, parameterIndex: number) => {
    if (!propertyKey) {
      const methodParameters: { [key: number]: any } = Reflect.getMetadata(metadataKey, target) || [];
      methodParameters[parameterIndex] = key;
      Reflect.defineMetadata(metadataKey, methodParameters, target);
      return;
    }

    const constructorParameters: { [key: number]: any } =
      Reflect.getMetadata(metadataKey, target.constructor, propertyKey) || [];
    constructorParameters[parameterIndex] = key;

    Reflect.defineMetadata(metadataKey, constructorParameters, target.constructor, propertyKey);
  };
}

export function getInjectables(constructorFunction: ConstructorFunction<any>): { [key: number]: any } {
  return Reflect.getMetadata(metadataKey, constructorFunction);
}
