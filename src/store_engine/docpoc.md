# Managing application state with stores

- [Managing application state with stores](#managing-application-state-with-stores)
  - [Defining a store](#defining-a-store)
  - [Using a store in a component](#using-a-store-in-a-component)
  - [Store dependencies](#store-dependencies)
  - [Best practices](#best-practices)
  - [Spreadsheet store for reacting to commands](#spreadsheet-store-for-reacting-to-commands)
  - [Local store](#local-store)
  - [Injecting external resources as a store](#injecting-external-resources-as-a-store)

In a typical OWL application, data is passed top-down (from parent to child) via props. However, this approach can become cumbersome for certain types of props that are required by many components within the application.

Stores provide a way to share values like these between components without the need to pass props explicitly through every level of the component tree.

Using stores also decouples the state and how it changes from individual components, making it easier to manage and update application-wide data.

They can also be used for individual components to decouple their UI and their business logic, allowing to test the business logic separatly.

Read also the ["why"](./why.md).

## Defining a store

To illustrate how stores work, let's consider a scenario where you want to display notifications from multiple components in the application. To achieve this, you can define a simple store called `NotificationStore`, which holds the notification state and provides methods to show and hide notifications.

```ts
class NotificationStore extends ReactiveStore {
  notificationMessage: string = "";
  type: "info" | "warning" | "error" = "info";

  show(type: "info" | "warning" | "error", message: string) {
    this.notificationMessage = message;
    this.type = type;
  }

  hide() {
    this.notificationMessage = "";
  }
}
```

That's it ! You don't need to do anything else.

> Note: `ReactiveStore` is required for OWL to react to state changes in the store. In the o-spreadsheet application, you probably want to use `SpreadsheetStore` instead of `ReactiveStore`. `SpreadsheetStore` is described [below](#spreadsheet-store-for-reacting-to-commands).

## Using a store in a component

First you need to use the `useStoreProvider()` hook on your application root component.

```ts
class RootComponent extends Component {
  setup() {
    useStoreProvider();
  }
}
```

Then, to use a store in any component, you just need to use the `useStore` hook and provide it with the store class, like `useStore(NotificationStore)`. You can access the same instance of the store each time the hook is called with the same store class.

```ts
import { Component, xml } from "@odoo/owl";
import { NotificationStore } from "./notification_store";

class MyComponent extends Component {
  static template = xml`
    <button t-on-click="onButtonClicked">Show notification</button>
  `;
  private notification: Store<NotificationStore>;

  setup() {
    this.notification = useStore(NotificationStore);
  }

  onButtonClicked() {
    this.notification.show("info", "the button was clicked!");
  }
}
```

## Store dependencies

You may have multiple stores that need to interact with each other. Stores allow you to create and manage these store dependencies effectively. Each store can access other stores by using the `get` method, which provides an instance of the required store.

For example, let's consider two stores: `MyStoreA` and `MyStoreB`. If `MyStoreB` needs to interact with `MyStoreA`, it can do so by accessing the instance of `MyStoreA` using the `get` method.

```ts
class MyStoreA extends ReactiveStore {
  // ...
}

class MyStoreB extends ReactiveStore {
  private storeA = this.get(MyStoreA);

  doSomething() {
    // can interact with `this.storeA`
  }
}
```

## Best practices

Stores should follow the **[Command-query separation (CQS)](https://en.wikipedia.org/wiki/Command%E2%80%93query_separation)** principle.

CQS principle helps in designing more maintainable and predictable code. By following this separation, you can reason more easily about how state changes and how rendering is based on the current state. It is also the architecture for o-spreadsheet plugins.

To apply the CQS principle to stores, they should have the following characteristics:

- **write-only methods** (commands): methods should never return anything, they can only update internal state.
- **readonly properties** (queries): properties can never be changed by components or other stores directly

> Notes:
>
> - you can have computed properties by using javascript getters.
>
> - if you are using TypeScript, `useStore` and `get` enforce these principles with the generic `Store` type.

## Spreadsheet store for reacting to commands

In some cases, you may need to react to specific commands and update the store's internal state accordingly. To achieve this, a store can inherit from `SpreadsheetStore`, which provides the necessary functionality for reacting to commands.

```ts
class MyStore extends SpreadsheetStore {
  handle(cmd: Command) {
    // You can update the store's internal state here based on the command received.
  }
}
```

The `handle` method allows you to handle various commands and manage the store's state accordingly.

## Local store

In addition to application-wide stores, stores also provides a convenient way to manage state that is specific to individual components. These local stores bring the advantages of decoupling the component from its business logic and how it changes, making it easier to reason about, maintain and test.

To create a local store, you can use the `useLocalStore` hook. It creates a new store instance bound to the component and automatically disposes of the store when the component unmounts.

To implement a local store, your store class must implement the `Disposable` interface, which requires the implementation of a `dispose` method. The `dispose` method is called when the component unmounts and is used to perform any necessary cleanup, such as unsubscribing from event handlers or releasing external resources, avoiding memory leaks.

> Note: `SpreadsheetStore` is already a `Disposable` and automatically unsubscribes from model commands when it's disposed.

## Injecting external resources as a store

Sometimes, a store may depend on an external resource that is not a store itself. To inject such an external resource into a store, you can use a trick. First, create a "fake" store using `createValueStore`, which acts as a placeholder for the injected resource. Then, in the (root) component where the real external resource is available, inject it to replace the "fake" store.

Let's take an example where we want to inject a spreadsheet Model instance into a store called ModelStore.

```ts
// Create a "fake"/"empty" store to act as a placeholder
export const ModelStore = createValueStore(() => {
  return new Model(); // Will be replaced with the injected Model later
});

// In the root component where the Model is available, inject it into the ModelStore
class RootComponent extends Component {
  setup() {
    const stores = useStoreProvider();
    stores.inject(ModelStore, this.props.model); // Inject the real Model instance
  }
}
```

Now, when you request the `ModelStore` in another store or component (using `this.get(ModelStore)` or `useStore(ModelStore)`), you will get the injected `Model` instance. This allows you to use external resources seamlessly within your stores.
It can also allow to mock a store in unit tests.
