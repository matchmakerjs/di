export type ScopedProvider<S, E> = E extends Promise<any> ? never : (scope: S) => E;

export type ScopedProviderFactory<S, E> = {
  provide: any;
  with?: ScopedProvider<S, E>;
  proxy?: boolean;
};
