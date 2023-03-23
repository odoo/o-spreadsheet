import {
  createProviderService,
  DependencyContainer,
  Get,
} from "../src/service_provider/service_provider";

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

class Test {
  constructor(readonly n: number) {
    console.log("Test");
  }
}

const TestProvider = createProviderService(new Test(4));

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
    constructor(get: Get, a: A = get(A)) {
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
  const services = new DependencyContainer();
  expect(() => services.get(A)).toThrowError(
    new Error("Circular dependency detected: A -> B -> A")
  );
  expect(C).toBeCalledTimes(1);
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
