## Confirmation dialog

Sometimes, `o-spreadsheet` needs to ask confirmation to the user. For example, merging cells which have some text content is considered a destructive operation. In that case, we want to display a nice modal dialog to ask the user if it is okay.
To do that, the `o-spreadsheet` library will trigger a `ask-confirmation` event.

```javascript
class App extends Component {
   static template = xml`<Spreadsheet data="data" t-on-ask-confirmation="askConfirmation"/>`;
   static components = { Spreadsheet };

   data = ...   ;

   askConfirmation(ev) {
      // open here a nice model dialog
      if (window.confirm(ev.detail.content)) {
         ev.detail.confirm();
      }
   }
}
```

## Notification dialog

Sometimes, `o-spreadsheet` needs to notify the user that some operation is not supported, or some other message. In that case, it will trigger a `notify-user` event, with a `content` key with a message.
