export function Injectable(): ClassDecorator {
    return function Router(constructor: Function) {
        Object.freeze(constructor);
        Object.freeze(constructor.prototype);
    }
}