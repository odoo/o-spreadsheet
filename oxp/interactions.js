export function askConfirmation(content, confirm, cancel) {
  if (window.confirm(content)) {
    confirm();
  } else {
    cancel();
  }
}

export function notifyUser(content) {
  window.alert(content);
}

export function editText(title, callback, options = {}) {
  let text;
  if (!options.error) {
    text = window.prompt(title, options.placeholder);
  } else {
    text = window.prompt(options.error, options.placeholder);
  }
  callback(text);
}

export function raiseError(content) {
  window.alert(content);
}
