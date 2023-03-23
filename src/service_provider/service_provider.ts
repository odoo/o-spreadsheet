import { reactive } from "@odoo/owl";

interface ServiceFactory<T> {
  new (get: Get): T;
}

// interface Type<T> {
//   new (...args: any[]): T;
// }

export type Get = <T extends ServiceFactory<any>>(
  constru: T
) => T extends ServiceFactory<infer I> ? I : never;

const get: Get = (constru) => new constru(get);

export class DependencyContainer {
  private dependencies: Map<ServiceFactory<any>, any> = new Map();
  private building: Set<ServiceFactory<any>> = new Set();

  inject<T extends ServiceFactory<any>>(service: T, instance: InstanceType<T>): void {
    this.dependencies.set(service, instance);
  }

  get<T>(service: ServiceFactory<T>): T {
    if (!this.dependencies.has(service)) {
      this.dependencies.set(service, this.create(service));
    }
    return this.dependencies.get(service);
  }

  private create<T>(service: ServiceFactory<T>): T {
    if (this.building.has(service)) {
      throw new Error(
        `Circular dependency detected: ${[...this.building, service]
          .map((s) => s.name)
          .join(" -> ")}`
      );
    }
    this.building.add(service);
    const instance = new service(this.get.bind(this));
    this.building.delete(service);
    return instance;
  }
}

export function createProviderService<T extends object>(value: T): ServiceFactory<T> {
  class MetaService {
    constructor(get: Get) {
      return value;
    }
  }
  return MetaService as ServiceFactory<T>;
}

/**
 * Creates a side-effect that runs based on the content of reactive objects.
 *
 * @template {object[]} T
 * @param {(...args: [...T]) => void} cb callback for the effect
 * @param {[...T]} deps the reactive objects that the effect depends on
 */
export function effect(cb, deps) {
  const reactiveDeps = reactive(deps, () => {
    cb(...reactiveDeps);
  });
  cb(...reactiveDeps);
}

/**
 * Adds computed properties to a reactive object derived from multiples sources.
 *
 * @param obj the reactive object on which to add the computed properties
 * @param  sources the reactive objects which are needed to compute the properties
 * @param descriptor the object containing methods to compute the properties
 * @returns {T & {[key in keyof V]: ReturnType<V[key]>}}
 */
export function withComputedProperties<
  T extends object,
  U extends object[],
  V extends { [key: string]: (this: T, ...rest: [...U]) => unknown }
>(obj: T, sources: U, descriptor: V): T & { readonly [key in keyof V]: ReturnType<V[key]> } {
  for (const [key, compute] of Object.entries(descriptor)) {
    effect(
      (obj, sources) => {
        obj[key] = compute.call(obj, ...sources);
      },
      [obj, sources]
    );
  }
  return obj as T & { [key in keyof V]: ReturnType<V[key]> };
}

const s = withComputedProperties(reactive({ a: 4 }), [{ coucou: 2 }], {
  comp(dep) {
    return dep.coucou + this.a;
  },
});

interface TestComputed {
  comp: number;
  n: number;
}

class TestComputed {
  constructor(public n = 4) {
    return withComputedProperties(this, [this], {
      comp(dep) {
        return this.n * 2;
      },
    });
  }
}

const t = new TestComputed();
t.comp;
