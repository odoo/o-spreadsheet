## Translations

All the terms used in o-spreadsheet interface and in messages displayed to the user are translatable.
The translation is done by calling the `_t` function that take as argument a string, and returns its translation.

The default `_t` function is a simple identity function that returns the input string.
But it's possible to override it and to provide a custom translation function using `setTranslationMethod`.

```typescript
const { setTranslationMethod } = o_spreadsheet;

function myTranslationMethod(term: string, ...values: SprintfValues[]) {
  // Your custom translation logic
  return term;
}

function areTranslationsLoaded() {
  // Your custom logic to check if translations are loaded
  return true;
}

setTranslationMethod(myTranslationMethod, areTranslationsLoaded);
```

This translation function will be called on:

- All the explicitly translated terms in the code (`_t`)
- All the implicitly translated terms in [owl templates](https://github.com/odoo/owl/blob/master/doc/reference/translations.md)

### Extracting strings to translate

A separate script should be run on the codebase to extract all the strings that need to be translated, so the translators can work on them. An example of such a script can be found in the
[odoo](https://github.com/odoo/odoo/blob/master/odoo/tools/translate.py) repository.
