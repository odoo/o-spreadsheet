import { Model } from "../model";

// interface ServiceFactory<T> {
//   new (get: Get): T;
// }

type ServiceFactory<T> = new (get: Get) => T;

interface Type<T> {
  new (): T;
}

type GetDependency<T> = T extends ServiceFactory<infer R>
  ? (service: ServiceFactory<R>) => R
  : never;

type Get = <T extends ServiceFactory<any>>(
  constru: T
) => T extends ServiceFactory<infer I> ? I : never;

class DependencyContainer {
  private dependencies: Map<ServiceFactory<any>, any> = new Map();

  register<T extends Type<any>>(service: T, instance: InstanceType<T>): void {
    this.dependencies.set(service, instance);
  }

  get<T>(service: ServiceFactory<T>): T {
    if (!this.dependencies.has(service)) {
      this.dependencies.set(service, this.createInstance(service));
    }
    return this.dependencies.get(service);
  }

  private createInstance<T>(service: ServiceFactory<T>): T {
    try {
      return new service(this.get.bind(this));
    } catch (error) {
      throw new Error(`Error while creating service ${service.name}. Is it a service?`);
    }
  }
}

class MyOtherService {
  constructor() {
    console.log("MyOtherService created");
  }

  coucou() {
    return 3;
  }
}
class MyMockOtherService {
  constructor() {
    console.log("MyOtherService created");
  }

  coucou() {
    return 5;
  }
}

class MyService {
  constructor(get: Get) {
    const myOtherService = get(MyOtherService);
    const model = get(Model);
  }
}
class sqdf {
  constructor() {}
  // prout() {
  //   return 3
  // }
}

class ModelService {
  constructor() {
    return new Model();
  }
}

const services = new DependencyContainer();
const s = services.get(MyService);
services.register(MyOtherService, new MyOtherService());
services.register(MyOtherService, new MyMockOtherService());
services.register(MyOtherService, new sqdf());
services.register(MyOtherService, new sqdf());
