Adding functions: the `o_spreadsheet` object exports an `addFunction` method:

```javascript
o_spreadsheet.addFunction("myfunc", {
  description: "My custom Function",
  compute: function (a, b) {
    return 2 * (a + b);
  },
});
```

The `addFunction` method takes a name, and a function descriptor (it should
implement the `FunctionDescription` interface from the code `/functions/index.ts`).

The properties of a function are:

- `description` (string) : the description of the function that will be shown as help for the user when he types the formula (don't forget the translations)
- `compute` (function) : the function that will be called to evaluate the formula.
- `async` (boolean, default=false): if the function is doing asynchronous work that must be waited before showing the result. Useful for formulas that needs to call an external API
- `category` (string) : Not used
- `args` (object): the arguments the user has to provide, in order, with the following properties
  - `name`\* (string) used in the help of the user (should NOT be translated)
  - `description`\* (string) used in the help for the user (don't forget translation)
  - `type`\* (string[]) with the following accepted values:
    - `"ANY"` --> don't care about the type
    - `"BOOLEAN"` --> expects a boolean value
    - `"NUMBER"` --> expects a number value
    - `"STRING"` --> expects a string value
    - `"DATE"` --> expects a date value
    - `"RANGE"` --> receive a 2 dimensional array of values [[]]
    - `"RANGE"<BOOLEAN>` --> same as `"RANGE"` but will exclude all values that are not boolean
    - `"RANGE"<NUMBER>` --> same as `"RANGE"` but will exclude all values that are not number
    - `"RANGE"<STRING>` --> same as `"RANGE"` but will exclude all values that are not string
    - `"META"` --> a meta parameter is a reference that is not processed by o-spreadsheet. Ex: in `=row(A1)` where the parameter of `row` is defined as meta, the compute function will receive the string `"A1"` in its first parameter, and not the value of the cell A1.
  - `repeating` (boolean, default=false): when you want your formula to accept multiple parameters of the same type
  - `optional` (boolean, default=false): defines that a parameters is optional
  - `lazy` (boolean, default=false): this parameter will not be evaluated until it is accessed
  - `default` (boolean): defines that a parameter has a default value, specified in `defaultValue`
  - `defaultValue` (any): the default value of a parameter if it is not defined
    Note that you can use a short version of these parameters by using the function `args` that takes a string as parameter:
  ```javascript
  {
      ...,
      args: args(`
        first_param (type, otherAttributes) description
        second_param (type, otherAttributes) description
        ...
      `)
  }
  ```
  is the same as
  ```javascript
  {
    ...,
    args: [{
      name : "first_param",
      type : "ANY",
      description: "description of first parameter"
    },{
      name : "second_param",
      type : "NUMBER",
      description: "description of second parameter"
    }]
  }
  ```
- `returns` (string[]): with possible values as
  - `"ANY"` for any value
  - `"BOOLEAN"`
  - `"NUMBER"`
  - `"STRING"`
  - `"DATE"`
- `returnFormat`(string | object): when you want your formula return a result with a format. This is especially useful when the formula returns a number.
  - `"FormatFromArgument"` --> if the first argument of the formula is a reference to a cell or range, the format of the reference will be returned. Ex: in `=SUM(A2, A3, A4)` where the parameter `returnFormat` is defined as `"FormatFromArgument"`, the final formula format will be the format of the `A2` reference.
  - `specificFormat` (string): a string that can be interpreted by spreadsheet. Ex: in `=TIME(A2, A3, A4)`
    where the parameter `returnFormat` is defined as `{specificFormat: "hh:mm:ss"}`, the final formula format will be `"hh:mm:ss"`.
- `isExported` (boolean, default=false): This will mark the function as exportable in Microsoft Excel. If set to _false_, cells with formula containing the function will be exported with its result as a static value.

  > ⚠ warning: If you are using `isExported`: _true_, make sure that both the function name and behaviour you defined match those in Microsoft Excel.

## Example

```javascript
const args = spreadsheet.helpers.args; // obtain the helper
const spreadsheet = o_spreadsheet; // obtain the reference to the global o_spreadsheet object

    let NEW_FORMULA : {
      description: "does something", // this will be shown in the formula assistant

      // creates the first parameter, it needs to be a number and has a default value of 3
      // create the second parameter, that is a number, and can accept as many values as the user specifies
      args: args(`
        first (number, default=3) that number that this formula need
        variance (number, repeating) that other parameter // create the second parameter, that is a number, and can accept as many values as the user specifies
      `),

      compute: function(first, ...variance) { // this function will be called when a cell has the formula =NEW.FORMULA(...) and will receive the parameters in the order specified by the user
        // do something with the parameters
        return first * variance[0];
      }
      returns: ["NUMBER"] // this function returns a number
    }

    // the formula will be =NEW.FORMULA(5,6,5,2,1,4) for the user
    spreadsheet.addFunction("NEW.FORMULA", NEW_FORMULA);
```

## More about the `compute` function

> The function `compute` will be **_called after any change on a sheet_** during the evaluation of a worksheet. The execution of compute is synchronous, so the user will be stuck until all the compute functions execute completely.
> That means that **_it should be fast_**, that any error in it will put the cell to `#ERROR`.

```javascript
const NEW_FORMULA : {
  ...,
  compute : function (parameters)  {
    if (parameters === 0) {
      // throwing errors allows you to put the cell in `#ERROR` with  you specified error message
      // the special string [[FUNCTION_NAME]] will be replaced by the actual function name before showing
      // it to the user, so you can define utility functions and reuse them to validate arguments.
      throw new Error ("function [[FUNCTION_NAME]] doesn't want the parameters to be 0")
    }

    // this.env contains the (OWL) environment of the spreadsheet,
    // that means it contains `this.env.services.rpc` to make calls to the server.
    // don't forget to mark the formula as async if you need to wait for a rpc
    const env = this.env;

    // this.getters contains all the getters defined in all the plugins of o_spreadsheet,
    // and those you added yourself
    const spreadSheetInformation = this.getters;


    // ...

    return something;
  }
}
```

Depending on type, the parameters received by the compute function are like this:

- `"ANY"` --> don't care about the type
- `"BOOLEAN"` --> boolean
- `"NUMBER"` --> number if a cast is possible
- `"STRING"` --> string
- `"DATE"` --> an o-spreadsheet date object
- `"RANGE"` and all its variants --> receive a 2 dimensional array of values columns[rows[]]
- `"META"` --> string

If a parameter is defined as `lazy`, you must call it as a function to obtain its value.

## Helpers to facilitate casting and dealing with the parameters of the `compute` function

See [src/functions/helpers.ts](../src/functions/helpers.ts)

### Conversion

Takes a value and converts it to the specific type, taking o-spreadsheet specific considerations into account

- `toNumber`(value: any): number
- `toString`(value: any): string
- `toBoolean`(value: any): boolean
- `strictToBoolean`(value: any): boolean
- `strictToNumber`(value: any): number

### Looping over arguments

Most formula can take cell references as argument, ranges or list of ranges, like `=sum(A2)`, `=sum(a2,b5)` and `=sum(a2,a3, a5:b10)`.
Treating arguments of type Range is difficult because the `compute` function doesn't know in advance the kind of reference the user will use it their formula.
These helpers will treat all cases and call a sub-function on every value referenced in the formula.

#### Processing all values of a specific reference argument

- `visitAny`(arg: any, callback: (cellValue: any) => void): void

```javascript
export const WORKDAY_INTL = {
  description: _lt("Net working days between two dates (specifying weekends)."),
  args: args(`
      start_date (date) ${_lt("The date from which to begin counting.")}
      num_days (number) ${_lt("The number of working days to advance from start_date. If negative, counts backwards.")}
      weekend (any, default=1) ${_lt("A number or string representing which days of the week are considered weekends.")}
      holidays (date, range<date>, optional) ${_lt("A range or array constant containing the dates to consider holidays.")} // <--
    `),
  returns: ["DATE"],
  compute: function (startDate: any, numDays: any, weekend: any = 1, holidays: any = undefined): number {
    // [...]
    let timesHoliday = new Set();
    if (holidays !== undefined) { // <--
      // if the user provided any holidays, all of them will be added to timesHoliday set, no matter how the user entered them
      visitAny(holidays, (h) => {
        const holiday = toNativeDate(h);
        timesHoliday.add(holiday.getTime());
      });
    }
    // [...]
```

#### Processing all values of all arguments at once

Useful when all arguments must have the same processing, and ignore values that cannot be converted to a certain type.

- `visitNumbers`(args: IArguments | any[], callback: (arg: number) => void): void

```javascript
export const MEDIAN: AddFunctionDescription = {
  description: _lt("Median value in a numeric dataset."),
  args: args(`
      value1 (any, range) ${_lt(
        "The first value or range to consider when calculating the median value."
      )}
      value2 (any, range, repeating) ${_lt(
        "Additional values or ranges to consider when calculating the median value."
      )}
    `),
  returns: ["NUMBER"],
  compute: function (): number {
    // here we don't define the arguments on the function at all.
    // In javascript all arguments passed to a function are stored in the magic variable `arguments`
    let data: any[] = [];
    // we use here arguments : an array of all the arguments passed to the function
    visitNumbers(arguments, (arg) => {
      data.push(arg);
    });
    return centile([data], 0.5, true);
  },
};
```

- `visitNumbersTextAs0`(args: IArguments | any[], callback: (arg: number) => void): void
- `visitBooleans`(args: IArguments, callback: (a: boolean) => boolean): void

see [add plugin](add_plugin.md)
