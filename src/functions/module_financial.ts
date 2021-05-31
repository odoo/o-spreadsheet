import { _lt } from "../translation";
import { AddFunctionDescription, ArgRange, Argument, ArgValue } from "../types";
import { args } from "./arguments";
import { assert, reduceNumbers, toBoolean, toNumber, visitNumbers } from "./helpers";
import { YEARFRAC } from "./module_date";

const DEFAULT_DAY_COUNT_CONVENTION = 0;
const DEFAULT_END_OR_BEGINNING = 0;

function newtonMethod(
  func: (x: number) => number,
  derivFunc: (x: number) => number,
  startValue: number,
  interMax: number,
  epsMax: number = 1e-10
) {
  let x = startValue;
  let newX: number;
  let xDelta: number;
  let y: number;
  let yEqual0 = false;
  let count = 0;
  do {
    y = func(x);
    newX = x - y / derivFunc(x);
    xDelta = Math.abs(newX - x);
    x = newX;
    yEqual0 = xDelta < epsMax || Math.abs(y) < epsMax;
    assert(() => count < interMax, _lt(`Function [[FUNCTION_NAME]] didn't find any result`));
    count++;
  } while (!yEqual0);
  return x;
}

// -----------------------------------------------------------------------------
// DB
// -----------------------------------------------------------------------------
export const DB: AddFunctionDescription = {
  description: _lt("Depreciation via declining balance method."),
  args: args(`
        cost (number) ${_lt("The initial cost of the asset.")}
        salvage (number) ${_lt("The value of the asset at the end of depreciation.")}
        life (number) ${_lt("The number of periods over which the asset is depreciated.")}
        period (number) ${_lt("The single period within life for which to calculate depreciation.")}
        month (number, optional) ${_lt("The number of months in the first year of depreciation.")}
    `),
  returns: ["NUMBER"],
  // to do: replace by dollar format
  returnFormat: { specificFormat: "#,##0.00" },
  compute: function (
    cost: ArgValue,
    salvage: ArgValue,
    life: ArgValue,
    period: ArgValue,
    ...args: ArgValue[]
  ): number {
    const _cost = toNumber(cost);
    const _salvage = toNumber(salvage);
    const _life = toNumber(life);
    const _period = Math.trunc(toNumber(period));
    const _month = args.length ? Math.trunc(toNumber(args[0])) : 12;
    const lifeLimit = _life + (_month === 12 ? 0 : 1);

    assert(() => _cost > 0, _lt("The cost (%s) must be strictly positive.", _cost.toString()));
    assert(
      () => _salvage >= 0,
      _lt("The salvage (%s) must be positive or null.", _salvage.toString())
    );
    assert(() => _life > 0, _lt("The life (%s) must be strictly positive.", _life.toString()));
    assert(
      () => _period > 0,
      _lt("The period (%s) must be strictly positive.", _period.toString())
    );
    assert(
      () => 1 <= _month && _month <= 12,
      _lt("The month (%s) must be between 1 and 12 inclusive.", _month.toString())
    );
    assert(
      () => _period <= lifeLimit,
      _lt(
        "The period (%s) must be less than or equal to %s.",
        _period.toString(),
        lifeLimit.toString()
      )
    );

    const monthPart = _month / 12;

    let rate = 1 - Math.pow(_salvage / _cost, 1 / _life);
    // round to 3 decimal places
    rate = Math.round(rate * 1000) / 1000;

    let before = _cost;
    let after = _cost * (1 - rate * monthPart);

    for (let i = 1; i < _period; i++) {
      before = after;
      after = before * (1 - rate);
      if (i === _life) {
        after = before * (1 - rate * (1 - monthPart));
      }
    }

    return before - after;
  },
};

// -----------------------------------------------------------------------------
// DURATION
// -----------------------------------------------------------------------------
export const DURATION: AddFunctionDescription = {
  description: _lt("Number of periods for an investment to reach a value."),
  args: args(`
        settlement (date) ${_lt(
          "The settlement date of the security, the date after issuance when the security is delivered to the buyer."
        )}
        maturity (date) ${_lt(
          "The maturity or end date of the security, when it can be redeemed at face, or par value."
        )}
        rate (number) ${_lt("The annualized rate of interest.")}
        yield (number) ${_lt("The expected annual yield of the security.")}
        frequency (number) ${_lt(
          "The number of interest or coupon payments per year (1, 2, or 4)."
        )}
        day_count_convention (number, default=${DEFAULT_DAY_COUNT_CONVENTION} ) ${_lt(
    "An indicator of what day count method to use."
  )}
    `),
  returns: ["NUMBER"],
  compute: function (
    settlement: ArgValue,
    maturity: ArgValue,
    rate: ArgValue,
    securityYield: ArgValue,
    frequency: ArgValue,
    dayCountConvention: ArgValue = DEFAULT_DAY_COUNT_CONVENTION
  ): number {
    dayCountConvention = dayCountConvention || 0;
    const start = Math.trunc(toNumber(settlement));
    const end = Math.trunc(toNumber(maturity));
    const _rate = toNumber(rate);
    const _yield = toNumber(securityYield);
    const _frequency = Math.trunc(toNumber(frequency));
    const _dayCountConvention = Math.trunc(toNumber(dayCountConvention));

    assert(
      () => start < end,
      _lt(
        "The maturity (%s) must be strictly greater than the settlement (%s).",
        end.toString(),
        start.toString()
      )
    );
    assert(() => _rate >= 0, _lt("The rate (%s) must be positive or null.", _rate.toString()));
    assert(() => _yield >= 0, _lt("The yield (%s) must be positive or null.", _yield.toString()));
    assert(
      () => [1, 2, 4].includes(_frequency),
      _lt("The frequency (%s) must be one of %s", _frequency.toString(), [1, 2, 4].toString())
    );
    assert(
      () => 0 <= _dayCountConvention && _dayCountConvention <= 4,
      _lt(
        "The day_count_convention (%s) must be between 0 and 4 inclusive.",
        _dayCountConvention.toString()
      )
    );

    const years = YEARFRAC.compute(start, end, _dayCountConvention);
    const timeFirstYear = years - Math.trunc(years) || 1 / _frequency;
    const nbrCoupons = Math.ceil(years * _frequency);

    // The DURATION function return the Macaulay duration
    // See example: https://en.wikipedia.org/wiki/Bond_duration#Formulas

    const cashFlowFromCoupon = _rate / _frequency;
    const yieldPerPeriod = _yield / _frequency;

    let count = 0;
    let sum = 0;

    for (let i = 1; i <= nbrCoupons; i++) {
      const cashFlowPerPeriod = cashFlowFromCoupon + (i === nbrCoupons ? 1 : 0);
      const presentValuePerPeriod = cashFlowPerPeriod / (1 + yieldPerPeriod) ** i;
      sum += (timeFirstYear + (i - 1) / _frequency) * presentValuePerPeriod;
      count += presentValuePerPeriod;
    }

    return count === 0 ? 0 : sum / count;
  },
};

// -----------------------------------------------------------------------------
// FV
// -----------------------------------------------------------------------------
const DEFAULT_PRESENT_VALUE = 0;
export const FV: AddFunctionDescription = {
  description: _lt("Future value of an annuity investment."),
  args: args(`
  rate (number) ${_lt("The interest rate.")}
  number_of_periods (number) ${_lt("The number of payments to be made.")}
  payment_amount (number) ${_lt("The amount per period to be paid.")}
  present_value (number, default=${DEFAULT_PRESENT_VALUE}) ${_lt(
    "The current value of the annuity."
  )}
  end_or_beginning (number, default=${DEFAULT_END_OR_BEGINNING}) ${_lt(
    "Whether payments are due at the end (0) or beginning (1) of each period."
  )}
  `),
  returns: ["NUMBER"],
  // to do: replace by dollar format
  returnFormat: { specificFormat: "#,##0.00" },
  compute: function (
    rate: ArgValue,
    numberOfPeriods: ArgValue,
    paymentAmount: ArgValue,
    presentValue: ArgValue = DEFAULT_PRESENT_VALUE,
    endOrBeginning: ArgValue = DEFAULT_END_OR_BEGINNING
  ): number {
    presentValue = presentValue || 0;
    endOrBeginning = endOrBeginning || 0;
    const r = toNumber(rate);
    const n = toNumber(numberOfPeriods);
    const p = toNumber(paymentAmount);
    const pv = toNumber(presentValue);
    const type = toBoolean(endOrBeginning) ? 1 : 0;
    return r ? -pv * (1 + r) ** n - (p * (1 + r * type) * ((1 + r) ** n - 1)) / r : -(pv + p * n);
  },
};

// -----------------------------------------------------------------------------
// IRR
// -----------------------------------------------------------------------------
const DEFAULT_RATE_GUESS = 0.1;
export const IRR: AddFunctionDescription = {
  description: _lt("Internal rate of return given periodic cashflows."),
  args: args(`
  cashflow_amounts (number, range<number>) ${_lt(
    "An array or range containing the income or payments associated with the investment."
  )}
  rate_guess (number, default=${DEFAULT_RATE_GUESS}) ${_lt(
    "An estimate for what the internal rate of return will be."
  )}
  `),
  returns: ["NUMBER"],
  returnFormat: { specificFormat: "0%" },
  compute: function (cashFlowAmounts: ArgRange, rateGuess: ArgValue = DEFAULT_RATE_GUESS): number {
    const _rateGuess = toNumber(rateGuess);

    assert(
      () => _rateGuess > -1,
      _lt("The rate_guess (%s) must be strictly greater than -1.", _rateGuess.toString())
    );

    // check that values contains at least one positive value and one negative value
    // and extract number present in the cashFlowAmount argument

    let positive = false;
    let negative = false;
    let amounts: number[] = [];

    visitNumbers([cashFlowAmounts], (amount) => {
      if (amount > 0) positive = true;
      if (amount < 0) negative = true;
      amounts.push(amount);
    });

    assert(
      () => positive && negative,
      _lt("The cashflow_amounts must include negative and positive values.")
    );

    const firstAmount = amounts.shift();

    // The result of IRR is the rate at which the NPV() function will return zero with the given values.
    // This algorithm uses the Newton's method on the NPV function to determine the result
    // Newton's method: https://en.wikipedia.org/wiki/Newton%27s_method

    // As the NPV function isn't continuous, we apply the Newton's method on the numerator of the NPV formula.

    function npvNumerator(rate: number, startValue: number, values: number[]): number {
      const nbrValue = values.length;
      let i = 0;
      return values.reduce((acc, v) => {
        i++;
        return acc + v * rate ** (nbrValue - i);
      }, startValue * rate ** nbrValue);
    }

    function npvNumeratorDeriv(rate: number, startValue: number, values: number[]): number {
      const nbrValue = values.length;
      let i = 0;
      return values.reduce((acc, v) => {
        i++;
        return acc + v * (nbrValue - i) * rate ** (nbrValue - i - 1);
      }, startValue * nbrValue * rate ** (nbrValue - 1));
    }

    function func(x: number) {
      return npvNumerator(x, firstAmount!, amounts);
    }
    function derivFunc(x: number) {
      return npvNumeratorDeriv(x, firstAmount!, amounts);
    }

    return newtonMethod(func, derivFunc, _rateGuess + 1, 20, 1e-5) - 1;
  },
};

// -----------------------------------------------------------------------------
// MDURATION
// -----------------------------------------------------------------------------
export const MDURATION: AddFunctionDescription = {
  description: _lt("Modified Macaulay duration."),
  args: args(`
        settlement (date) ${_lt(
          "The settlement date of the security, the date after issuance when the security is delivered to the buyer."
        )}
        maturity (date) ${_lt(
          "The maturity or end date of the security, when it can be redeemed at face, or par value."
        )}
        rate (number) ${_lt("The annualized rate of interest.")}
        yield (number) ${_lt("The expected annual yield of the security.")}
        frequency (number) ${_lt(
          "The number of interest or coupon payments per year (1, 2, or 4)."
        )}
        day_count_convention (number, default=${DEFAULT_DAY_COUNT_CONVENTION} ) ${_lt(
    "An indicator of what day count method to use."
  )}
    `),
  returns: ["NUMBER"],
  compute: function (
    settlement: ArgValue,
    maturity: ArgValue,
    rate: ArgValue,
    securityYield: ArgValue,
    frequency: ArgValue,
    dayCountConvention: ArgValue = DEFAULT_DAY_COUNT_CONVENTION
  ): number {
    const duration = DURATION.compute(
      settlement,
      maturity,
      rate,
      securityYield,
      frequency,
      dayCountConvention
    );
    const y = toNumber(securityYield);
    const k = Math.trunc(toNumber(frequency));
    return duration / (1 + y / k);
  },
};

// -----------------------------------------------------------------------------
// NPV
// -----------------------------------------------------------------------------

function npvResult(r: number, startValue: number, values: Argument[]): number {
  let i = 0;
  return reduceNumbers(
    values,
    (acc, v) => {
      i++;
      return acc + v / (1 + r) ** i;
    },
    startValue
  );
}

export const NPV: AddFunctionDescription = {
  description: _lt(
    "The net present value of an investment based on a series of periodic cash flows and a discount rate."
  ),
  args: args(`
  discount (number) ${_lt("The discount rate of the investment over one period.")}
  cashflow1 (number, range<number>) ${_lt("The first future cash flow.")}
  cashflow2 (number, range<number>, repeating) ${_lt("Additional future cash flows.")}
  `),
  returns: ["NUMBER"],
  // to do: replace by dollar format
  returnFormat: { specificFormat: "#,##0.00" },
  compute: function (discount: ArgValue, ...values: Argument[]): number {
    const _discount = toNumber(discount);

    assert(
      () => _discount !== -1,
      _lt("The discount (%s) must be different from -1.", _discount.toString())
    );

    return npvResult(_discount, 0, values);
  },
};

// -----------------------------------------------------------------------------
// PDURATION
// -----------------------------------------------------------------------------
export const PDURATION: AddFunctionDescription = {
  description: _lt("Computes the number of periods needed for an investment to reach a value."),
  args: args(`
  rate (number) ${_lt("The rate at which the investment grows each period.")}
  present_value (number) ${_lt("The investment's current value.")}
  future_value (number) ${_lt("The investment's desired future value.")}
  `),
  returns: ["NUMBER"],
  compute: function (rate: ArgValue, presentValue: ArgValue, futureValue: ArgValue): number {
    const _rate = toNumber(rate);
    const _presentValue = toNumber(presentValue);
    const _futureValue = toNumber(futureValue);

    assert(() => _rate > 0, _lt("The rate (%s) must be strictly positive.", _rate.toString()));
    assert(
      () => _presentValue > 0,
      _lt("The present_value (%s) must be strictly positive.", _presentValue.toString())
    );
    assert(
      () => _futureValue > 0,
      _lt("The future_value (%s) must be strictly positive.", _futureValue.toString())
    );

    return (Math.log(_futureValue) - Math.log(_presentValue)) / Math.log(1 + _rate);
  },
};

// -----------------------------------------------------------------------------
// PV
// -----------------------------------------------------------------------------
const DEFAULT_FUTURE_VALUE = 0;
export const PV: AddFunctionDescription = {
  description: _lt("Present value of an annuity investment."),
  args: args(`
  rate (number) ${_lt("The interest rate.")}
  number_of_periods (number) ${_lt("The number of payments to be made.")}
  payment_amount (number) ${_lt("The amount per period to be paid.")}
  future_value (number, default=${DEFAULT_FUTURE_VALUE}) ${_lt(
    "The future value remaining after the final payment has been made."
  )}
  end_or_beginning (number, default=${DEFAULT_END_OR_BEGINNING}) ${_lt(
    "Whether payments are due at the end (0) or beginning (1) of each period."
  )}
  `),
  returns: ["NUMBER"],
  // to do: replace by dollar format
  returnFormat: { specificFormat: "#,##0.00" },
  compute: function (
    rate: ArgValue,
    numberOfPeriods: ArgValue,
    paymentAmount: ArgValue,
    futureValue: ArgValue = DEFAULT_FUTURE_VALUE,
    endOrBeginning: ArgValue = DEFAULT_END_OR_BEGINNING
  ): number {
    futureValue = futureValue || 0;
    endOrBeginning = endOrBeginning || 0;
    const r = toNumber(rate);
    const n = toNumber(numberOfPeriods);
    const p = toNumber(paymentAmount);
    const fv = toNumber(futureValue);
    const type = toBoolean(endOrBeginning) ? 1 : 0;
    return r ? -((p * (1 + r * type) * ((1 + r) ** n - 1)) / r + fv) / (1 + r) ** n : -(fv + p * n);
  },
};

// -----------------------------------------------------------------------------
// PRICE
// -----------------------------------------------------------------------------
export const PRICE: AddFunctionDescription = {
  description: _lt("Price of a security paying periodic interest."),
  args: args(`
      settlement (date) ${_lt(
        "The settlement date of the security, the date after issuance when the security is delivered to the buyer."
      )}
      maturity (date) ${_lt(
        "The maturity or end date of the security, when it can be redeemed at face, or par value."
      )}
      rate (number) ${_lt("The annualized rate of interest.")}
      yield (number) ${_lt("The expected annual yield of the security.")}
      redemption (number) ${_lt("The redemption amount per 100 face value, or par.")}
      frequency (number) ${_lt("The number of interest or coupon payments per year (1, 2, or 4).")}
      day_count_convention (number, default=${DEFAULT_DAY_COUNT_CONVENTION} ) ${_lt(
    "An indicator of what day count method to use."
  )}
    `),
  returns: ["NUMBER"],
  compute: function (
    settlement: ArgValue,
    maturity: ArgValue,
    rate: ArgValue,
    securityYield: ArgValue,
    redemption: ArgValue,
    frequency: ArgValue,
    dayCountConvention: ArgValue = DEFAULT_DAY_COUNT_CONVENTION
  ): number {
    dayCountConvention = dayCountConvention || 0;
    const _settlement = Math.trunc(toNumber(settlement));
    const _maturity = Math.trunc(toNumber(maturity));
    const _rate = toNumber(rate);
    const _yield = toNumber(securityYield);
    const _redemption = toNumber(redemption);
    const _frequency = Math.trunc(toNumber(frequency));
    const _dayCountConvention = Math.trunc(toNumber(dayCountConvention));

    assert(
      () => _maturity > _settlement,
      _lt(
        "The maturity (%s) must be strictly greater than the settlement (%s).",
        _maturity.toString(),
        _settlement.toString()
      )
    );
    assert(() => _rate >= 0, _lt("The rate (%s) must be positive or null.", _rate.toString()));
    assert(() => _yield >= 0, _lt("The yield (%s) must be positive or null.", _yield.toString()));
    assert(
      () => _redemption > 0,
      _lt("The redemption (%s) must be strictly positive.", _redemption.toString())
    );
    assert(
      () => [1, 2, 4].includes(_frequency),
      _lt("The frequency (%s) must be one of %s.", _frequency.toString(), [1, 2, 4].toString())
    );
    assert(
      () => 0 <= _dayCountConvention && _dayCountConvention <= 4,
      _lt(
        "The day_count_convention (%s) must be between 0 and 4 inclusive.",
        _dayCountConvention.toString()
      )
    );

    const years = YEARFRAC.compute(_settlement, _maturity, _dayCountConvention);
    const nbrRealCoupons = years * _frequency;
    const nbrFullCoupons = Math.ceil(nbrRealCoupons);
    const timeFirstCoupon = nbrRealCoupons - Math.floor(nbrRealCoupons) || 1;

    const yieldFactorPerPeriod = 1 + _yield / _frequency;
    const cashFlowFromCoupon = (100 * _rate) / _frequency;

    if (nbrFullCoupons === 1) {
      return (
        (cashFlowFromCoupon + _redemption) / ((timeFirstCoupon * _yield) / _frequency + 1) -
        cashFlowFromCoupon * (1 - timeFirstCoupon)
      );
    }

    let cashFlowsPresentValue = 0;
    for (let i = 1; i <= nbrFullCoupons; i++) {
      cashFlowsPresentValue +=
        cashFlowFromCoupon / yieldFactorPerPeriod ** (i - 1 + timeFirstCoupon);
    }

    const redemptionPresentValue =
      _redemption / yieldFactorPerPeriod ** (nbrFullCoupons - 1 + timeFirstCoupon);

    return (
      redemptionPresentValue + cashFlowsPresentValue - cashFlowFromCoupon * (1 - timeFirstCoupon)
    );
  },
};

// -----------------------------------------------------------------------------
// YIELD
// -----------------------------------------------------------------------------

export const YIELD: AddFunctionDescription = {
  description: _lt("Annual yield of a security paying periodic interest."),
  args: args(`
        settlement (date) ${_lt(
          "The settlement date of the security, the date after issuance when the security is delivered to the buyer."
        )}
        maturity (date) ${_lt(
          "The maturity or end date of the security, when it can be redeemed at face, or par value."
        )}
        rate (number) ${_lt("The annualized rate of interest.")}
        price (number) ${_lt("The price at which the security is bought per 100 face value.")}
        redemption (number) ${_lt("The redemption amount per 100 face value, or par.")}
        frequency (number) ${_lt(
          "The number of interest or coupon payments per year (1, 2, or 4)."
        )}
        day_count_convention (number, default=${DEFAULT_DAY_COUNT_CONVENTION} ) ${_lt(
    "An indicator of what day count method to use."
  )}
    `),
  returns: ["NUMBER"],
  compute: function (
    settlement: ArgValue,
    maturity: ArgValue,
    rate: ArgValue,
    price: ArgValue,
    redemption: ArgValue,
    frequency: ArgValue,
    dayCountConvention: ArgValue = DEFAULT_DAY_COUNT_CONVENTION
  ): number {
    dayCountConvention = dayCountConvention || 0;
    const _settlement = Math.trunc(toNumber(settlement));
    const _maturity = Math.trunc(toNumber(maturity));
    const _rate = toNumber(rate);
    const _price = toNumber(price);
    const _redemption = toNumber(redemption);
    const _frequency = Math.trunc(toNumber(frequency));
    const _dayCountConvention = Math.trunc(toNumber(dayCountConvention));

    assert(
      () => _maturity > _settlement,
      _lt(
        "The maturity (%s) must be strictly greater than the settlement (%s).",
        _maturity.toString(),
        _settlement.toString()
      )
    );
    assert(() => _rate >= 0, _lt("The rate (%s) must be positive or null.", _rate.toString()));
    assert(() => _price > 0, _lt("The price (%s) must be strictly positive.", _price.toString()));
    assert(
      () => _redemption > 0,
      _lt("The redemption (%s) must be strictly positive.", _redemption.toString())
    );
    assert(
      () => [1, 2, 4].includes(_frequency),
      _lt("The frequency (%s) must be one of %s.", _frequency.toString(), [1, 2, 4].toString())
    );
    assert(
      () => 0 <= _dayCountConvention && _dayCountConvention <= 4,
      _lt(
        "The day_count_convention (%s) must between 0 and 4 inclusive.",
        _dayCountConvention.toString()
      )
    );

    const years = YEARFRAC.compute(_settlement, _maturity, _dayCountConvention);
    const nbrRealCoupons = years * _frequency;
    const nbrFullCoupons = Math.ceil(nbrRealCoupons);
    const timeFirstCoupon = nbrRealCoupons - Math.floor(nbrRealCoupons) || 1;

    const cashFlowFromCoupon = (100 * _rate) / _frequency;

    if (nbrFullCoupons === 1) {
      const subPart = _price + cashFlowFromCoupon * (1 - timeFirstCoupon);
      return (
        ((_redemption + cashFlowFromCoupon - subPart) * _frequency * (1 / timeFirstCoupon)) /
        subPart
      );
    }

    // The result of YIELD function is the yield at which the PRICE function will return the given price.
    // This algorithm uses the Newton's method on the PRICE function to determine the result.
    // Newton's method: https://en.wikipedia.org/wiki/Newton%27s_method

    // As the PRICE function isn't continuous, we apply the Newton's method on the numerator of the PRICE formula.

    // For simplicity, it is not yield but yieldFactorPerPeriod (= 1 + yield / frequency) which will be calibrated in Newton's method.
    // yield can be deduced from yieldFactorPerPeriod in sequence.

    function priceNumerator(
      price: number,
      timeFirstCoupon: number,
      nbrFullCoupons: number,
      yieldFactorPerPeriod: number,
      cashFlowFromCoupon: number,
      redemption: number
    ): number {
      let result =
        redemption -
        (price + cashFlowFromCoupon * (1 - timeFirstCoupon)) *
          yieldFactorPerPeriod ** (nbrFullCoupons - 1 + timeFirstCoupon);
      for (let i = 1; i <= nbrFullCoupons; i++) {
        result += cashFlowFromCoupon * yieldFactorPerPeriod ** (i - 1);
      }
      return result;
    }

    function priceNumeratorDeriv(
      price: number,
      timeFirstCoupon: number,
      nbrFullCoupons: number,
      yieldFactorPerPeriod: number,
      cashFlowFromCoupon: number
    ): number {
      let result =
        -(price + cashFlowFromCoupon * (1 - timeFirstCoupon)) *
        (nbrFullCoupons - 1 + timeFirstCoupon) *
        yieldFactorPerPeriod ** (nbrFullCoupons - 2 + timeFirstCoupon);
      for (let i = 1; i <= nbrFullCoupons; i++) {
        result += cashFlowFromCoupon * (i - 1) * yieldFactorPerPeriod ** (i - 2);
      }
      return result;
    }

    function func(x: number) {
      return priceNumerator(
        _price,
        timeFirstCoupon,
        nbrFullCoupons,
        x,
        cashFlowFromCoupon,
        _redemption
      );
    }
    function derivFunc(x: number) {
      return priceNumeratorDeriv(_price, timeFirstCoupon, nbrFullCoupons, x, cashFlowFromCoupon);
    }

    const initYield = _rate + 1;
    const initYieldFactorPerPeriod = 1 + initYield / _frequency;

    const methodResult = newtonMethod(func, derivFunc, initYieldFactorPerPeriod, 100, 1e-5);
    return (methodResult - 1) * _frequency;
  },
};

// -----------------------------------------------------------------------------
// YIELDMAT
// -----------------------------------------------------------------------------

export const YIELDMAT: AddFunctionDescription = {
  description: _lt("Annual yield of a security paying interest at maturity."),
  args: args(`
        settlement (date) ${_lt(
          "The settlement date of the security, the date after issuance when the security is delivered to the buyer."
        )}
        maturity (date) ${_lt(
          "The maturity or end date of the security, when it can be redeemed at face, or par value."
        )}
        issue (date) ${_lt("The date the security was initially issued.")}
        rate (number) ${_lt("The annualized rate of interest.")}
        price (number) ${_lt("The price at which the security is bought.")}
        day_count_convention (number, default=${DEFAULT_DAY_COUNT_CONVENTION} ) ${_lt(
    "An indicator of what day count method to use."
  )}
    `),
  returns: ["NUMBER"],
  compute: function (
    settlement: ArgValue,
    maturity: ArgValue,
    issue: ArgValue,
    rate: ArgValue,
    price: ArgValue,
    dayCountConvention: ArgValue = DEFAULT_DAY_COUNT_CONVENTION
  ): number {
    dayCountConvention = dayCountConvention || 0;
    const _settlement = Math.trunc(toNumber(settlement));
    const _maturity = Math.trunc(toNumber(maturity));
    const _issue = Math.trunc(toNumber(issue));
    const _rate = toNumber(rate);
    const _price = toNumber(price);
    const _dayCountConvention = Math.trunc(toNumber(dayCountConvention));

    assert(
      () => _settlement >= _issue,
      _lt(
        "The settlement (%s) must be greater than or equal to the issue (%s).",
        _settlement.toString(),
        _issue.toString()
      )
    );
    assert(
      () => _maturity > _settlement,
      _lt(
        "The maturity (%s) must be strictly greater than the settlement (%s).",
        _maturity.toString(),
        _settlement.toString()
      )
    );
    assert(() => _rate >= 0, _lt("The rate (%s) must be positive or null.", _rate.toString()));
    assert(() => _price > 0, _lt("The price (%s) must be strictly positive.", _price.toString()));
    assert(
      () => 0 <= _dayCountConvention && _dayCountConvention <= 4,
      _lt(
        "The day_count_convention (%s) must be between 0 and 4 inclusive.",
        _dayCountConvention.toString()
      )
    );

    const issueToMaturity = YEARFRAC.compute(_issue, _maturity, _dayCountConvention);
    const issueToSettlement = YEARFRAC.compute(_issue, _settlement, _dayCountConvention);
    const settlementToMaturity = YEARFRAC.compute(_settlement, _maturity, _dayCountConvention);

    const numerator =
      (100 * (1 + _rate * issueToMaturity)) / (_price + 100 * _rate * issueToSettlement) - 1;

    return numerator / settlementToMaturity;
  },
};
