export type Provider<E> = E extends Promise<any> ? never : () => E;

export type ProviderFactory<T> = {
  provide: any;
  with?: Provider<T>;
  proxy?: boolean;
};

export type ScopedProvider<S, E> = E extends Promise<any> ? never : (scope: S) => E;

export type ScopedProviderFactory<S, E> = {
  provide: any;
  with?: ScopedProvider<S, E>;
  proxy?: boolean;
};
