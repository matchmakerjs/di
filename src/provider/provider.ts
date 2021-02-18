export type Provider<E> = E extends Promise<any> ? never : () => E;

export type ProviderFactory<T> = {
  provide: any;
  with?: Provider<T>;
  proxy?: boolean;
};
