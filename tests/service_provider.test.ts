import { DependencyContainer, Get } from "../src/store_engine/dependency_container";
import { createValueStore } from "../src/store_engine/store";

class MyOtherService {
  constructor(get: Get) {
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
    const test = get(TestProvider);
  }
}

// class MyDerivedService {
//   constructor(get: Get) {
//     const myOtherService = get(MyService);
//     return computed(myOtherService, {
//       aComputedProperty: (myOtherService) => {
//         return 4;
//       },
//     });
//   }
// }

class TestComputed {
  constructor(public n = 4) {
    // return {
    //   n: this.n,
    //   comp: this.n * 2,
    // }
    // return withComputedProperties(this, [this], {
    //   comp() {
    //     return this.n * 2;
    //   },
    // });
  }

  get comp() {
    return 5;
  }
  coucou() {}
}

const p = Object.getOwnPropertyDescriptors(TestComputed.prototype);

test("properties", () => {
  console.log(p);
  console.log(Object.getPrototypeOf(TestComputed.constructor));
});

class Test {
  constructor(readonly n: number) {
    console.log("Test");
  }
}

const TestProvider = createValueStore(() => new Test(4));

// const services = new DependencyContainer();
// const s = services.get(MyService);
// services.inject(TestProvider, new Test(4));
// services.inject(MyService, new MyService());
// services.inject(MyOtherService, new MyOtherService());
// services.inject(MyOtherService, new MyMockOtherService());

test("cccoucouc", () => {
  const services = new DependencyContainer();
  const s = services.get(MyService);
  services.get(MyService);
  console.log(s);
});

test("direct cycle", () => {
  class A {
    constructor(get: Get) {
      get(B);
    }
  }
  class B {
    constructor(get: Get) {
      get(A);
    }
  }
  const services = new DependencyContainer();
  expect(() => services.get(A)).toThrowError(
    new Error("Circular dependency detected: A -> B -> A")
  );
});
test("cycle with third created in the middle", () => {
  class A {
    constructor(get: Get) {
      get(B);
    }
  }
  class B {
    constructor(get: Get) {
      get(C);
      get(A);
    }
  }
  class C {
    constructor(get: Get) {}
  }
  const stores = new DependencyContainer();
  expect(() => stores.get(A)).toThrowError(new Error("Circular dependency detected: A -> B -> A"));
});
test("self cycle", () => {
  class A {
    constructor(get: Get) {
      get(A);
    }
  }
  const services = new DependencyContainer();
  expect(() => services.get(A)).toThrowError(new Error("Circular dependency detected: A -> A"));
});

test("inject", () => {
  class A {
    constructor(readonly n: number) {}
  }
  const stores = new DependencyContainer();
  const a = new A(4);
  const AStore = createValueStore(() => a);
  stores.inject(AStore, a);
  expect(stores.get(AStore)).toBe(a);
});
