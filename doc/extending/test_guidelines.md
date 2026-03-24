# Writing tests

When implementing a new feature in o-spreadsheet, you should test it. We use the [Jest](https://jestjs.io/) framework to write unit tests. The tests are located in the [`tests`](/tests/) folder, and you can run them by using `npm run test`.

## Guidelines

These are some loose guidelines that you should try to follow when writing tests in o-spreadsheet:

### Avoid beforeEach

In Jest we can have `beforeEach` statements that are run before every test. They should be avoided, as they make the code hard to read (the `beforeEach` is often at the top of the file, far from the test) and tend to add parasitic data that are useful in some tests, but not others. Use a helper function to set up the test instead.

```js
test("test1", () => {
  // Setup the model inline rather than in a `beforeEach`
  // If the setup is long and repeated, create a helper that is explicitly called in each test!
  const model = new Model();
  setCellContent(model, "B2", "content");
  selectCell(model, "B2");

  // Test logic
});

test("test2", () => {
  const model = new Model();
  setCellContent(model, "B2", "content");
  selectCell(model, "B2");
  // Test logic
});
```

### Use helpers rather than manual command dispatch

Rather than calling `model.dispatch("UPDATE_CELL", {...})` use the helper functions inside [`commands_helpers.ts`](/tests/test_helpers/commands_helpers.ts). And if there is no helper for the command you need to dispatch, create one! It's easier to read in the test. It also decouples the test from the implementation: in the future if (when) the command changes, only this helper needs to be modified.

### Use helpers rather than creating a model with raw JSON data

Directly creating a model with JSON data should be avoided. It's harder to read, usually longer, and will need to be updated every time we alter the spreadsheet JSON data.

```js
// Avoid this!
const model = new Model({
  sheets: [
    {
      id: "Sheet1",
      cells: {
        // Before 18.1, the cell content has the format { content: "1" }
        // The test would have had to be changed at the same time as the JSON data was migrated
        A1: "1",
        A2: "2",
      },
    },
  ],
});

// Use this instead:
const model = createModelFromGrid({ A1: "1", A2: "2" });
```

### Keep tests minimal

Each test should contain only the setup and assertions strictly necessary to verify the behavior being tested. Avoid adding extra setup that is irrelevant to the actual feature being tested. A minimal test is easier to read, and when it fails, the cause is immediately obvious.

For component tests, mount as few components as possible for your testing you are testing rather than the entire `Spreadsheet`. Use `mountComponent` or `mountComponentWithPortalTarget` to mount an isolated component with a `Model`.

```js
// Avoid this: mounting the full Spreadsheet just to test some menu present in the spreadsheet
test("Test specific menu item action", async () => {
  const { fixture, model } = await mountSpreadsheet();
  // ... interact with a menu to test its own behavior/aspect
});

// Better: mount only the Menu component
test("Test specific menu item action", async () => {
  const model = new Model();
  const menuItems = []; // populate from a specific registry
  const { fixture } = await mountComponent(Menu, {
    props: { menuItems, onClose: () => {}, onClickMenu: () => callback() },
    env: { model },
  });
  // ... interact with a menu to test its own behavior/aspect
});
```

### Test behavior, not implementation details

Tests should verify _what_ the code does, not _how_ it does it internally. Avoid asserting on internal state, private methods, or the specific structure of intermediate data. Instead, test through the public API and assert on observable outcomes: cell values, UI elements, dispatched command results, etc.

A test coupled to implementation details can break every time the code is refactored, even if the functional result is unaltered.

```js
// Avoid this: relies on internal plugin state
test("adding a row updates the internal row map", () => {
  const model = new Model();
  const sheetId = model.getters.getActiveSheetId();
  addRows(model, "after", 0, 1);
  const plugin = getPlugin(model, SheetPlugin);
  expect(plugin[sheetId].rows).toHaveLength(101);
});

// Better: test through the getter
test("adding a row increases the row count", () => {
  const model = new Model();
  const sheetId = model.getters.getActiveSheetId();
  expect(model.getters.getNumberRows(sheetId)).toBe(100);
  addRows(model, "after", 0, 1);
  expect(model.getters.getNumberRows(sheetId)).toBe(101);
});
```

### Use custom Jest matchers

We define custom jest matchers in [`jest_extend.ts`](/tests/setup/jest_extend.ts), use them!
Some examples:

```js
test("test1", () => {
  // Instead of: expect(fixture.querySelector(".o-spreadsheet")).not.toBeNull();
  expect(".o-spreadsheet").toHaveCount(1);

  // Instead of: expect(fixture.querySelector(".o-spreadsheet input")?.value).toBe("val");
  expect(".o-spreadsheet input").toHaveValue("val");
});
```
