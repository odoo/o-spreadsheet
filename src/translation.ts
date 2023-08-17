export type TranslationFunction = (
  string: string,
  ...values: string[] | [{ [key: string]: string }]
) => string;

// define a mock translation function, when o-spreadsheet runs in standalone it doesn't translate any string
let _translate: TranslationFunction = (s) => s;
let _loaded: () => boolean = () => false;

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
 * @param loaded a function that returns true when the translation is loaded
 */
export function setTranslationMethod(tfn: TranslationFunction, loaded: () => boolean = () => true) {
  _translate = tfn;
  _loaded = loaded;
}

export const _t: TranslationFunction = function (
  s: string,
  ...values: string[] | [{ [key: string]: string }]
) {
  if (!_loaded()) {
    return new LazyTranslatedString(s, values) as unknown as string;
  }
  return sprintf(_translate(s), ...values);
};

class LazyTranslatedString extends String {
  constructor(str: string, private values: string[] | [{ [key: string]: string }]) {
    super(str);
  }

  valueOf() {
    const str = super.valueOf();
    return _loaded() ? sprintf(_translate(str), ...this.values) : str;
  }
  toString() {
    return this.valueOf();
  }
}
