export type ConstructorFunction<T> = new (...args: any[]) => T;

export interface DIContainer {
  get<T>(key: any): T;

  getInstance<T>(constructorFunction: ConstructorFunction<T>): T;

  createInstance<T>(constructorFunction: ConstructorFunction<T>): T;
}
