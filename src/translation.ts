/*
 * usage: every string should be translated either with _lt if they are registered with a registry at
 *  the load of the app or with Spreadsheet._t in the templates. Spreadsheet._t is exposed in the
 *  sub-env of Spreadsheet components as _t
 * */

type TranslationFunction = (string) => string;

// define a mock translation function, when o-spreadsheet runs in standalone it doesn't translate any string
let _t: TranslationFunction = (s) => s;

/***
 * Allow to inject a translation function from outside o-spreadsheet.
 * @param tfn the function that will do the translation
 */
export function setTranslationMethod(tfn: TranslationFunction) {
  _t = tfn;
}

export const _lt: TranslationFunction = function (s) {
  return ({
    toString: function () {
      return _t(s);
    },
    // casts the object to unknown then to string to trick typescript into thinking that the object it receives is actually a string
    // this way it will be typed correctly (behaves like a string) but tests like typeof _lt("whatever") will be object and not string !
  } as unknown) as string;
};
