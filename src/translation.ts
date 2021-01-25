/*
 * usage: every string should be translated either with _lt if they are registered with a registry at
 *  the load of the app or with Spreadsheet._t in the templates. Spreadsheet._t is exposed in the
 *  sub-env of Spreadsheet components as _t
 * */

export type TranslationFunction = (
  string: string,
  ...values: string[] | [{ [key: string]: string }]
) => string;

// define a mock translation function, when o-spreadsheet runs in standalone it doesn't translate any string
let _t: TranslationFunction = (s) => s;

function sprintf(s: string, ...values: string[] | [{ [key: string]: string }]): string {
  if (values.length === 1 && typeof values[0] === "object") {
    const valuesDict = values[0] as { [key: string]: string };
    s = s.replace(/\%\(?([^\)]+)\)s/g, (match, value) => valuesDict[value]);
  } else if (values.length > 0) {
    s = s.replace(/\%s/g, () => values.shift() as string);
  }
  return s;
}

/***
 * Allow to inject a translation function from outside o-spreadsheet.
 * @param tfn the function that will do the translation
 */
export function setTranslationMethod(tfn: TranslationFunction) {
  _t = tfn;
}

export const _lt: TranslationFunction = function (
  s,
  ...values: string[] | [{ [key: string]: string }]
) {
  return ({
    toString: function () {
      return sprintf(_t(s), ...values);
    },
    // casts the object to unknown then to string to trick typescript into thinking that the object it receives is actually a string
    // this way it will be typed correctly (behaves like a string) but tests like typeof _lt("whatever") will be object and not string !
  } as unknown) as string;
};
