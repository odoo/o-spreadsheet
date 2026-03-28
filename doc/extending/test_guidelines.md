# Writing tests

When implementing a new feature in o-spreadsheet, you should test it. We use the [Jest](https://jestjs.io/) framework to write unit tests. The test are in the `tests` folder, and you can run them by using `npm run test`.

## Guidelines

These are some loose guidelines that you should try to follow when writing tests in o-spreadsheet:

### Avoid beforeEach

In Jest we can have `beforeEach` statements that are run before every test. They should be avoided, as they make the code hard to read (the `beforeEach` is often at the top of the file, far from the test) and tend to add parasitic data that are useful in some tests, but not others. Use a helper function to setup the test instead.

```js
test("test1", () => {
  // Setup the model inline rather than in a `beforeEach`
  // If the setup is long and repeated, create a helper that is explicitly called in each test !
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

Rather than calling `model.dispatch("UPDATE_CELL", {...})` use the helpers functions inside `commands_helpers.ts`. And if there are no helper for the command you need to dispatch, create one ! It's easier to read in the test, and in the future if (when) the command is changed, only this helper will need to be modified.

### Use helpers rather than creating a model with raw JSON data

Directly creating a model with JSON data should be avoided. It's harder to read, it's usually longer, and will need to be updated every time we upgrade the spreadsheet JSON data.

```js
// Avoid this !
const model = new Model({
  sheets: [
    {
      id: "Sheet1",
      cells: {
        // Before 18.1, the cell content has the format { content: "1" }
        // The test would have had to be changed at the same time has the JSON data was migrated
        A1: "1",
        A2: "2",
      },
    },
  ],
});

// Use this instead:
const model = createModelFromGrid({ A1: "1", A2: "2" });
```

### Use custom Jest matchers

We define custom jest matchers in `jest_extend.ts`, use them !
Some examples:

```js
test("test1", () => {
  // Instead of: expect(fixture.querySelector(".o-spreadsheet")).not.toBeNull();
  expect(".o-spreadsheet").toHaveCount(1);

  // Instead of: expect(fixture.querySelector(".o-spreadsheet input")?.value).toBe("val");
  expect(".o-spreadsheet input").toHaveValue("val");
});
```
