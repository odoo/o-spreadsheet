type SprintfValues = (string | String | number)[] | [{ [key: string]: string | number }];

export type TranslationFunction = (string: string, ...values: SprintfValues) => string;

const defaultTranslate: TranslationFunction = (s: string) => s;
const defaultLoaded: () => boolean = () => false;

let _translate = defaultTranslate;
let _loaded = defaultLoaded;

function sprintf(s: string, ...values: SprintfValues): string {
  if (values.length === 1 && typeof values[0] === "object" && !(values[0] instanceof String)) {
    const valuesDict = values[0] as { [key: string]: string };
    s = s.replace(/\%\(([^\)]+)\)s/g, (match, value) => valuesDict[value]);
  } else if (values.length > 0) {
    s = s.replace(/\%s/g, () => values.shift() as string);
  }
  return s;
}

/***
 * Allow to inject a translation function from outside o-spreadsheet. This should be called before instantiating
 * a model.
 * @param tfn the function that will do the translation
 * @param loaded a function that returns true when the translation is loaded
 */
export function setTranslationMethod(tfn: TranslationFunction, loaded: () => boolean = () => true) {
  _translate = tfn;
  _loaded = loaded;
}

/**
 * If no translation function has been set, this will mark the translation are loaded.
 *
 * By default, the translations should not be set as loaded, otherwise top-level translated constants will never be
 * translated. But if by the time the model is instantiated no custom translation function has been set, we can set
 * the default translation function as loaded so o-spreadsheet can be run in standalone with no translations.
 */
export function setDefaultTranslationMethod() {
  if (_translate === defaultTranslate && _loaded === defaultLoaded) {
    _loaded = () => true;
  }
}

export const _t: TranslationFunction = function (s: string, ...values: SprintfValues) {
  if (!_loaded()) {
    return new LazyTranslatedString(s, values) as unknown as string;
  }
  return sprintf(_translate(s), ...values);
};

class LazyTranslatedString extends String {
  constructor(str: string, private values: SprintfValues) {
    super(str);
  }

  valueOf() {
    const str = super.valueOf();
    return _loaded() ? sprintf(_translate(str), ...this.values) : sprintf(str, ...this.values);
  }
  toString() {
    return this.valueOf();
  }
}
