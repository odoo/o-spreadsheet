# o-spreadsheet

## Integrating o-spreadsheet

The `o-spreadsheet` library is designed to be standalone, but easy to integrate.
Here is a list of all official extension points:

1. Adding functions: the `o_spreadsheet` object exports an `addFunction` method:

```js
o_spreadsheet.addFunction("myfunc", {
  description: "My custom Function",
  compute: function (a, b) {
    return 2 * (a + b);
  },
});
```

The `addFunction` method takes a name and a function descriptor (it should
implement the `FunctionDescription` interface from the code `/functions/index.ts`).

2. Confirmation dialog: sometimes, `o-spreadsheet` needs to ask confirmation to
   the user. For example, merging cells which have some text content is considered
   a destructive operation. In that case, we want to display a nice modal dialog
   to ask the user if it is okay.

To do that, the `o-spreadsheet` library will trigger a `ask-confirmation` event.

```js
class App extends Component {
  static template = xml`<Spreadsheet data="data" t-on-ask-confirmation="askConfirmation"/>`;
  static components = { Spreadsheet };

  data = ...;

  askConfirmation(ev) {
    // open here a nice model dialog
    if (window.confirm(ev.detail.content)) {
      ev.detail.confirm();
    }
  }
```

3. Notification dialog: sometimes, `o-spreadsheet` needs to notify the user that
   some operation is not supported, or some other message. In that case, it will
   trigger a `notify-user` event, with a `content` key with a message.
