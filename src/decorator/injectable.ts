export function Injectable(): ClassDecorator {
  return (constructor: any) => {
    if (!isInjectable(constructor)) {
      Reflect.defineMetadata(
        'design:paramtypes',
        [],
        constructor
      );
    }
  };
}

function isInjectable(type: any) {
  return Reflect.getMetadata('design:paramtypes', type) === undefined;
}