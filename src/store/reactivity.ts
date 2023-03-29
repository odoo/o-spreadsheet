import { reactive } from "@odoo/owl";

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

class MetaComputed<T extends object, V extends { [key: string]: (this: T) => unknown }> {
  constructor(obj: T, descriptor: V) {
    return withComputedProperties(obj, [obj], descriptor);
  }
}

// function Computed<T, V extends { [key: string]: (this: T) => unknown }>(source: T, descriptor): T & { readonly [key in keyof V]: ReturnType<V[key]> } {
//   class Meta {

//   }
//   return source as T & { [key in keyof V]: ReturnType<V[key]> };
// };

// interface TestComputed {
//   comp: number;
//   comp2: number;
//   n: number;
// }
type Computed<T> = {
  [key in keyof T]: T[keyof T];
};

// Design
// make it easy to read (computed properties)

interface ComputedProperties {
  comp: number;
  comp2: number;
}

interface State {
  n: number;
}

const state = {
  n: 4,
};

withComputedProperties(state, [], {
  comp() {
    return this.n * 2;
  },
});

class TestComputed {
  constructor(public n = 4) {
    // return {
    //   n: this.n,
    //   comp: this.n * 2,
    // }
    return withComputedProperties(this, [this], {
      comp() {
        return this.n * 2;
      },
    });
  }
  coucou() {}
}

function computedMeta() {}

type A = InstanceType<typeof TestComputed>;

const t = new TestComputed();

const uu = withComputedProperties(t, [t], {
  comp(dep) {
    return dep.n * 2;
  },
});
uu.comp;
t.comp;
t.comp;
