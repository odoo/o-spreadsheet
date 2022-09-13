import { addMonthsToDate, getYearFrac, isLastDayOfMonth, jsDateToRoundNumber } from "../helpers";
import { _lt } from "../translation";
import { AddFunctionDescription, ArgValue, MatrixArgValue, PrimitiveArgValue } from "../types";
import { args } from "./arguments";
import { assert, reduceNumbers, toBoolean, toJsDate, toNumber, visitNumbers } from "./helpers";
import {
  assertNumberOfPeriodsPositive,
  assertPricePositive,
  assertRatePositive,
  assertRedemptionPositive,
  checkCouponFrequency,
  checkDayCountConvention,
  checkMaturityAndSettlementDates,
  checkSettlementAndIssueDates,
} from "./helper_financial";
import { YEARFRAC } from "./module_date";

const DEFAULT_DAY_COUNT_CONVENTION = 0;
const DEFAULT_END_OR_BEGINNING = 0;
const DEFAULT_FUTURE_VALUE = 0;

const COUPON_FUNCTION_ARGS = args(`
settlement (date) ${_lt(
  "The settlement date of the security, the date after issuance when the security is delivered to the buyer."
)}
maturity (date) ${_lt(
  "The maturity or end date of the security, when it can be redeemed at face, or par value."
)}
frequency (number) ${_lt("The number of interest or coupon payments per year (1, 2, or 4).")}
day_count_convention (number, default=${DEFAULT_DAY_COUNT_CONVENTION} ) ${_lt(
  "An indicator of what day count method to use."
)}
`);

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
    assert(() => count < interMax, _lt(`Function [[FUNCTION_NAME]] didn't find any result.`));
    count++;
  } while (!yEqual0);
  return x;
}

// -----------------------------------------------------------------------------
// ACCRINTM
// -----------------------------------------------------------------------------
export const ACCRINTM: AddFunctionDescription = {
  description: _lt("Accrued interest of security paying at maturity."),
  args: args(`
        issue (date) ${_lt("The date the security was initially issued.")}
        maturity (date) ${_lt("The maturity date of the security.")}
        rate (number) ${_lt("The annualized rate of interest.")}
        redemption (number) ${_lt("The redemption amount per 100 face value, or par.")}
        day_count_convention (number, default=${DEFAULT_DAY_COUNT_CONVENTION} ) ${_lt(
    "An indicator of what day count method to use."
  )}
    `),
  returns: ["NUMBER"],
  compute: function (
    issue: PrimitiveArgValue,
    settlement: PrimitiveArgValue,
    rate: PrimitiveArgValue,
    redemption: PrimitiveArgValue,
    dayCountConvention: PrimitiveArgValue = DEFAULT_DAY_COUNT_CONVENTION
  ): number {
    dayCountConvention = dayCountConvention || 0;
    const start = Math.trunc(toNumber(issue));
    const end = Math.trunc(toNumber(settlement));
    const _redemption = toNumber(redemption);
    const _rate = toNumber(rate);
    const _dayCountConvention = Math.trunc(toNumber(dayCountConvention));

    checkSettlementAndIssueDates(end, start);
    checkDayCountConvention(_dayCountConvention);
    assertRedemptionPositive(_redemption);
    assertRatePositive(_rate);

    const yearFrac = YEARFRAC.compute(start, end, dayCountConvention) as number;
    return _redemption * _rate * yearFrac;
  },
};

// -----------------------------------------------------------------------------
// COUPDAYS
// -----------------------------------------------------------------------------
export const COUPDAYS: AddFunctionDescription = {
  description: _lt("Days in coupon period containing settlement date."),
  args: COUPON_FUNCTION_ARGS,
  returns: ["NUMBER"],
  compute: function (
    settlement: PrimitiveArgValue,
    maturity: PrimitiveArgValue,
    frequency: PrimitiveArgValue,
    dayCountConvention: PrimitiveArgValue = DEFAULT_DAY_COUNT_CONVENTION
  ): number {
    dayCountConvention = dayCountConvention || 0;
    const start = Math.trunc(toNumber(settlement));
    const end = Math.trunc(toNumber(maturity));
    const _frequency = Math.trunc(toNumber(frequency));
    const _dayCountConvention = Math.trunc(toNumber(dayCountConvention));

    checkMaturityAndSettlementDates(start, end);
    checkCouponFrequency(_frequency);
    checkDayCountConvention(_dayCountConvention);

    // https://wiki.documentfoundation.org/Documentation/Calc_Functions/COUPDAYS
    if (_dayCountConvention === 1) {
      const before = COUPPCD.compute(settlement, maturity, frequency, dayCountConvention) as number;
      const after = COUPNCD.compute(settlement, maturity, frequency, dayCountConvention) as number;
      return after - before;
    }

    const daysInYear = _dayCountConvention === 3 ? 365 : 360;
    return daysInYear / _frequency;
  },
};

// -----------------------------------------------------------------------------
// COUPDAYBS
// -----------------------------------------------------------------------------
export const COUPDAYBS: AddFunctionDescription = {
  description: _lt("Days from settlement until next coupon."),
  args: COUPON_FUNCTION_ARGS,
  returns: ["NUMBER"],
  compute: function (
    settlement: PrimitiveArgValue,
    maturity: PrimitiveArgValue,
    frequency: PrimitiveArgValue,
    dayCountConvention: PrimitiveArgValue = DEFAULT_DAY_COUNT_CONVENTION
  ): number {
    dayCountConvention = dayCountConvention || 0;
    const start = Math.trunc(toNumber(settlement));
    const end = Math.trunc(toNumber(maturity));
    const _frequency = Math.trunc(toNumber(frequency));
    const _dayCountConvention = Math.trunc(toNumber(dayCountConvention));

    checkMaturityAndSettlementDates(start, end);
    checkCouponFrequency(_frequency);
    checkDayCountConvention(_dayCountConvention);

    const couponBeforeStart = COUPPCD.compute(start, end, frequency, dayCountConvention) as number;
    if ([1, 2, 3].includes(_dayCountConvention)) {
      return start - couponBeforeStart;
    }

    if (_dayCountConvention === 4) {
      const yearFrac = getYearFrac(couponBeforeStart, start, _dayCountConvention);
      return Math.round(yearFrac * 360);
    }

    const startDate = toJsDate(start);
    const dateCouponBeforeStart = toJsDate(couponBeforeStart);

    const y1 = dateCouponBeforeStart.getFullYear();
    const y2 = startDate.getFullYear();
    const m1 = dateCouponBeforeStart.getMonth() + 1; // +1 because months in js start at 0 and it's confusing
    const m2 = startDate.getMonth() + 1;
    let d1 = dateCouponBeforeStart.getDate();
    let d2 = startDate.getDate();

    /**
     * Rules based on https://en.wikipedia.org/wiki/Day_count_convention#30/360_US
     *
     * These are slightly modified (no mention of if investment is EOM and rules order is modified),
     * but from my testing this seems the rules used by Excel/GSheet.
     */
    if (
      m1 === 2 &&
      m2 === 2 &&
      isLastDayOfMonth(dateCouponBeforeStart) &&
      isLastDayOfMonth(startDate)
    ) {
      d2 = 30;
    }
    if (d2 === 31 && (d1 === 30 || d1 === 31)) {
      d2 = 30;
    }
    if (m1 === 2 && isLastDayOfMonth(dateCouponBeforeStart)) {
      d1 = 30;
    }
    if (d1 === 31) {
      d1 = 30;
    }

    return (y2 - y1) * 360 + (m2 - m1) * 30 + (d2 - d1);
  },
};

// -----------------------------------------------------------------------------
// COUPDAYSNC
// -----------------------------------------------------------------------------
export const COUPDAYSNC: AddFunctionDescription = {
  description: _lt("Days from settlement until next coupon."),
  args: COUPON_FUNCTION_ARGS,
  returns: ["NUMBER"],
  compute: function (
    settlement: PrimitiveArgValue,
    maturity: PrimitiveArgValue,
    frequency: PrimitiveArgValue,
    dayCountConvention: PrimitiveArgValue = DEFAULT_DAY_COUNT_CONVENTION
  ): number {
    dayCountConvention = dayCountConvention || 0;
    const start = Math.trunc(toNumber(settlement));
    const end = Math.trunc(toNumber(maturity));
    const _frequency = Math.trunc(toNumber(frequency));
    const _dayCountConvention = Math.trunc(toNumber(dayCountConvention));

    checkMaturityAndSettlementDates(start, end);
    checkCouponFrequency(_frequency);
    checkDayCountConvention(_dayCountConvention);

    const couponAfterStart = COUPNCD.compute(start, end, frequency, dayCountConvention) as number;
    if ([1, 2, 3].includes(_dayCountConvention)) {
      return couponAfterStart - start;
    }

    if (_dayCountConvention === 4) {
      const yearFrac = getYearFrac(start, couponAfterStart, _dayCountConvention);
      return Math.round(yearFrac * 360);
    }

    const coupDayBs = COUPDAYBS.compute(
      settlement,
      maturity,
      frequency,
      _dayCountConvention
    ) as number;
    const coupDays = COUPDAYS.compute(
      settlement,
      maturity,
      frequency,
      _dayCountConvention
    ) as number;
    return coupDays - coupDayBs;
  },
};

// -----------------------------------------------------------------------------
// COUPNCD
// -----------------------------------------------------------------------------
export const COUPNCD: AddFunctionDescription = {
  description: _lt("Next coupon date after the settlement date."),
  args: COUPON_FUNCTION_ARGS,
  returns: ["NUMBER"],
  computeFormat: () => "m/d/yyyy",
  compute: function (
    settlement: PrimitiveArgValue,
    maturity: PrimitiveArgValue,
    frequency: PrimitiveArgValue,
    dayCountConvention: PrimitiveArgValue = DEFAULT_DAY_COUNT_CONVENTION
  ): number {
    dayCountConvention = dayCountConvention || 0;
    const start = Math.trunc(toNumber(settlement));
    const end = Math.trunc(toNumber(maturity));
    const _frequency = Math.trunc(toNumber(frequency));
    const _dayCountConvention = Math.trunc(toNumber(dayCountConvention));

    checkMaturityAndSettlementDates(start, end);
    checkCouponFrequency(_frequency);
    checkDayCountConvention(_dayCountConvention);

    const monthsPerPeriod = 12 / _frequency;

    const coupNum = COUPNUM.compute(settlement, maturity, frequency, dayCountConvention) as number;
    const date = addMonthsToDate(toJsDate(end), -(coupNum - 1) * monthsPerPeriod, true);
    return jsDateToRoundNumber(date);
  },
};

// -----------------------------------------------------------------------------
// COUPNUM
// -----------------------------------------------------------------------------
export const COUPNUM: AddFunctionDescription = {
  description: _lt("Number of coupons between settlement and maturity."),
  args: COUPON_FUNCTION_ARGS,
  returns: ["NUMBER"],
  compute: function (
    settlement: PrimitiveArgValue,
    maturity: PrimitiveArgValue,
    frequency: PrimitiveArgValue,
    dayCountConvention: PrimitiveArgValue = DEFAULT_DAY_COUNT_CONVENTION
  ): number {
    dayCountConvention = dayCountConvention || 0;
    const start = Math.trunc(toNumber(settlement));
    const end = Math.trunc(toNumber(maturity));
    const _frequency = Math.trunc(toNumber(frequency));
    const _dayCountConvention = Math.trunc(toNumber(dayCountConvention));

    checkMaturityAndSettlementDates(start, end);
    checkCouponFrequency(_frequency);
    checkDayCountConvention(_dayCountConvention);

    let num = 1;
    let currentDate = end;
    const monthsPerPeriod = 12 / _frequency;

    while (currentDate > start) {
      currentDate = jsDateToRoundNumber(
        addMonthsToDate(toJsDate(currentDate), -monthsPerPeriod, false)
      );
      num++;
    }
    return num - 1;
  },
};

// -----------------------------------------------------------------------------
// COUPPCD
// -----------------------------------------------------------------------------
export const COUPPCD: AddFunctionDescription = {
  description: _lt("Last coupon date prior to or on the settlement date."),
  args: COUPON_FUNCTION_ARGS,
  returns: ["NUMBER"],
  computeFormat: () => "m/d/yyyy",
  compute: function (
    settlement: PrimitiveArgValue,
    maturity: PrimitiveArgValue,
    frequency: PrimitiveArgValue,
    dayCountConvention: PrimitiveArgValue = DEFAULT_DAY_COUNT_CONVENTION
  ): number {
    dayCountConvention = dayCountConvention || 0;
    const start = Math.trunc(toNumber(settlement));
    const end = Math.trunc(toNumber(maturity));
    const _frequency = Math.trunc(toNumber(frequency));
    const _dayCountConvention = Math.trunc(toNumber(dayCountConvention));

    checkMaturityAndSettlementDates(start, end);
    checkCouponFrequency(_frequency);
    checkDayCountConvention(_dayCountConvention);

    const monthsPerPeriod = 12 / _frequency;

    const coupNum = COUPNUM.compute(settlement, maturity, frequency, dayCountConvention) as number;
    const date = addMonthsToDate(toJsDate(end), -coupNum * monthsPerPeriod, true);
    return jsDateToRoundNumber(date);
  },
};

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
  computeFormat: () => "#,##0.00",
  compute: function (
    cost: PrimitiveArgValue,
    salvage: PrimitiveArgValue,
    life: PrimitiveArgValue,
    period: PrimitiveArgValue,
    ...args: PrimitiveArgValue[]
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
    settlement: PrimitiveArgValue,
    maturity: PrimitiveArgValue,
    rate: PrimitiveArgValue,
    securityYield: PrimitiveArgValue,
    frequency: PrimitiveArgValue,
    dayCountConvention: PrimitiveArgValue = DEFAULT_DAY_COUNT_CONVENTION
  ): number {
    dayCountConvention = dayCountConvention || 0;
    const start = Math.trunc(toNumber(settlement));
    const end = Math.trunc(toNumber(maturity));
    const _rate = toNumber(rate);
    const _yield = toNumber(securityYield);
    const _frequency = Math.trunc(toNumber(frequency));
    const _dayCountConvention = Math.trunc(toNumber(dayCountConvention));

    checkMaturityAndSettlementDates(start, end);
    checkCouponFrequency(_frequency);
    checkDayCountConvention(_dayCountConvention);

    assert(() => _rate >= 0, _lt("The rate (%s) must be positive or null.", _rate.toString()));
    assert(() => _yield >= 0, _lt("The yield (%s) must be positive or null.", _yield.toString()));

    const years = YEARFRAC.compute(start, end, _dayCountConvention) as number;
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
// EFFECT
// -----------------------------------------------------------------------------
export const EFFECT: AddFunctionDescription = {
  description: _lt("Annual effective interest rate."),
  args: args(`
  nominal_rate (number) ${_lt("The nominal interest rate per year.")}
  periods_per_year (number) ${_lt("The number of compounding periods per year.")}
  `),
  returns: ["NUMBER"],
  compute: function (nominal_rate: PrimitiveArgValue, periods_per_year: PrimitiveArgValue): number {
    const nominal = toNumber(nominal_rate);
    const periods = Math.trunc(toNumber(periods_per_year));

    assert(
      () => nominal > 0,
      _lt("The nominal rate (%s) must be strictly greater than 0.", nominal.toString())
    );
    assert(
      () => periods > 0,
      _lt("The number of periods by year (%s) must strictly greater than 0.", periods.toString())
    );

    // https://en.wikipedia.org/wiki/Nominal_interest_rate#Nominal_versus_effective_interest_rate
    return Math.pow(1 + nominal / periods, periods) - 1;
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
  computeFormat: () => "#,##0.00",
  compute: function (
    rate: PrimitiveArgValue,
    numberOfPeriods: PrimitiveArgValue,
    paymentAmount: PrimitiveArgValue,
    presentValue: PrimitiveArgValue = DEFAULT_PRESENT_VALUE,
    endOrBeginning: PrimitiveArgValue = DEFAULT_END_OR_BEGINNING
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
// IPMT
// -----------------------------------------------------------------------------
export const IPMT: AddFunctionDescription = {
  description: _lt("Payment on the principal of an investment."),
  args: args(`
  rate (number) ${_lt("The annualized rate of interest.")}
  period (number) ${_lt("The amortization period, in terms of number of periods.")}
  number_of_periods (number) ${_lt("The number of payments to be made.")}
  present_value (number) ${_lt("The current value of the annuity.")}
  future_value (number, default=${DEFAULT_FUTURE_VALUE}) ${_lt(
    "The future value remaining after the final payment has been made."
  )}
  end_or_beginning (number, default=${DEFAULT_END_OR_BEGINNING}) ${_lt(
    "Whether payments are due at the end (0) or beginning (1) of each period."
  )}
  `),
  returns: ["NUMBER"],
  computeFormat: () => "#,##0.00",
  compute: function (
    rate: PrimitiveArgValue,
    currentPeriod: PrimitiveArgValue,
    numberOfPeriods: PrimitiveArgValue,
    presentValue: PrimitiveArgValue,
    futureValue: PrimitiveArgValue = DEFAULT_FUTURE_VALUE,
    endOrBeginning: PrimitiveArgValue = DEFAULT_END_OR_BEGINNING
  ): number {
    const payment = PMT.compute(
      rate,
      numberOfPeriods,
      presentValue,
      futureValue,
      endOrBeginning
    ) as number;
    const ppmt = PPMT.compute(
      rate,
      currentPeriod,
      numberOfPeriods,
      presentValue,
      futureValue,
      endOrBeginning
    ) as number;
    return payment - ppmt;
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
  computeFormat: () => "0%",
  compute: function (
    cashFlowAmounts: MatrixArgValue,
    rateGuess: PrimitiveArgValue = DEFAULT_RATE_GUESS
  ): number {
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
// ISPMT
// -----------------------------------------------------------------------------
export const ISPMT: AddFunctionDescription = {
  description: _lt("Returns the interest paid at a particular period of an investment."),
  args: args(`
  rate (number) ${_lt("The interest rate.")}
  period (number) ${_lt("The period for which you want to view the interest payment.")}
  number_of_periods (number) ${_lt("The number of payments to be made.")}
  present_value (number) ${_lt("The current value of the annuity.")}
  `),
  returns: ["NUMBER"],
  compute: function (
    rate: PrimitiveArgValue,
    currentPeriod: PrimitiveArgValue,
    numberOfPeriods: PrimitiveArgValue,
    presentValue: PrimitiveArgValue
  ): number {
    const interestRate = toNumber(rate);
    const period = toNumber(currentPeriod);
    const nOfPeriods = toNumber(numberOfPeriods);
    const investment = toNumber(presentValue);

    assert(
      () => nOfPeriods !== 0,
      _lt("The number of periods must be different than 0.", nOfPeriods.toString())
    );

    const currentInvestment = investment - investment * (period / nOfPeriods);
    return -1 * currentInvestment * interestRate;
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
    settlement: PrimitiveArgValue,
    maturity: PrimitiveArgValue,
    rate: PrimitiveArgValue,
    securityYield: PrimitiveArgValue,
    frequency: PrimitiveArgValue,
    dayCountConvention: PrimitiveArgValue = DEFAULT_DAY_COUNT_CONVENTION
  ): number {
    const duration = DURATION.compute(
      settlement,
      maturity,
      rate,
      securityYield,
      frequency,
      dayCountConvention
    ) as number;
    const y = toNumber(securityYield);
    const k = Math.trunc(toNumber(frequency));
    return duration / (1 + y / k);
  },
};

// -----------------------------------------------------------------------------
// NOMINAL
// -----------------------------------------------------------------------------
export const NOMINAL: AddFunctionDescription = {
  description: _lt("Annual nominal interest rate."),
  args: args(`
  effective_rate (number) ${_lt("The effective interest rate per year.")}
  periods_per_year (number) ${_lt("The number of compounding periods per year.")}
  `),
  returns: ["NUMBER"],
  compute: function (
    effective_rate: PrimitiveArgValue,
    periods_per_year: PrimitiveArgValue
  ): number {
    const effective = toNumber(effective_rate);
    const periods = Math.trunc(toNumber(periods_per_year));

    assert(
      () => effective > 0,
      _lt("The effective rate (%s) must must strictly greater than 0.", effective.toString())
    );
    assert(
      () => periods > 0,
      _lt("The number of periods by year (%s) must strictly greater than 0.", periods.toString())
    );

    // https://en.wikipedia.org/wiki/Nominal_interest_rate#Nominal_versus_effective_interest_rate
    return (Math.pow(effective + 1, 1 / periods) - 1) * periods;
  },
};

// -----------------------------------------------------------------------------
// NPER
// -----------------------------------------------------------------------------
export const NPER: AddFunctionDescription = {
  description: _lt("Number of payment periods for an investment."),
  args: args(`
  rate (number) ${_lt("The interest rate.")}
  payment_amount (number) ${_lt("The amount of each payment made.")}
  present_value (number) ${_lt("The current value of the annuity.")}
  future_value (number, default=${DEFAULT_FUTURE_VALUE}) ${_lt(
    "The future value remaining after the final payment has been made."
  )}
  end_or_beginning (number, default=${DEFAULT_END_OR_BEGINNING}) ${_lt(
    "Whether payments are due at the end (0) or beginning (1) of each period."
  )}
  `),
  returns: ["NUMBER"],
  compute: function (
    rate: PrimitiveArgValue,
    paymentAmount: PrimitiveArgValue,
    presentValue: PrimitiveArgValue,
    futureValue: PrimitiveArgValue = DEFAULT_FUTURE_VALUE,
    endOrBeginning: PrimitiveArgValue = DEFAULT_END_OR_BEGINNING
  ): number {
    futureValue = futureValue || 0;
    endOrBeginning = endOrBeginning || 0;
    const r = toNumber(rate);
    const p = toNumber(paymentAmount);
    const pv = toNumber(presentValue);
    const fv = toNumber(futureValue);
    const t = toBoolean(endOrBeginning) ? 1 : 0;

    /**
     * https://wiki.documentfoundation.org/Documentation/Calc_Functions/NPER
     *
     * 0 = pv * (1 + r)^N + fv + [ p * (1 + r * t) * ((1 + r)^N - 1) ] / r
     *
     * We solve the equation for N:
     *
     * with C = [ p * (1 + r * t)] / r and
     *      R = 1 + r
     *
     * => 0 = pv * R^N + C * R^N - C + fv
     * <=> (C - fv) = R^N * (pv + C)
     * <=> log[(C - fv) / (pv + C)] = N * log(R)
     */
    if (r === 0) {
      return -(fv + pv) / p;
    }
    const c = (p * (1 + r * t)) / r;
    return Math.log((c - fv) / (pv + c)) / Math.log(1 + r);
  },
};

// -----------------------------------------------------------------------------
// NPV
// -----------------------------------------------------------------------------

function npvResult(r: number, startValue: number, values: ArgValue[]): number {
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
  computeFormat: () => "#,##0.00",
  compute: function (discount: PrimitiveArgValue, ...values: ArgValue[]): number {
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
  compute: function (
    rate: PrimitiveArgValue,
    presentValue: PrimitiveArgValue,
    futureValue: PrimitiveArgValue
  ): number {
    const _rate = toNumber(rate);
    const _presentValue = toNumber(presentValue);
    const _futureValue = toNumber(futureValue);

    assertRatePositive(_rate);
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
// PMT
// -----------------------------------------------------------------------------
export const PMT: AddFunctionDescription = {
  description: _lt("Periodic payment for an annuity investment."),
  args: args(`
  rate (number) ${_lt("The annualized rate of interest.")}
  number_of_periods (number) ${_lt("The number of payments to be made.")}
  present_value (number) ${_lt("The current value of the annuity.")}
  future_value (number, default=${DEFAULT_FUTURE_VALUE}) ${_lt(
    "The future value remaining after the final payment has been made."
  )}
  end_or_beginning (number, default=${DEFAULT_END_OR_BEGINNING}) ${_lt(
    "Whether payments are due at the end (0) or beginning (1) of each period."
  )}
  `),
  returns: ["NUMBER"],
  computeFormat: () => "#,##0.00",
  compute: function (
    rate: PrimitiveArgValue,
    numberOfPeriods: PrimitiveArgValue,
    presentValue: PrimitiveArgValue,
    futureValue: PrimitiveArgValue = DEFAULT_FUTURE_VALUE,
    endOrBeginning: PrimitiveArgValue = DEFAULT_END_OR_BEGINNING
  ): number {
    futureValue = futureValue || 0;
    endOrBeginning = endOrBeginning || 0;
    const n = toNumber(numberOfPeriods);
    const r = toNumber(rate);
    const t = toBoolean(endOrBeginning) ? 1 : 0;
    let fv = toNumber(futureValue);
    let pv = toNumber(presentValue);

    assertNumberOfPeriodsPositive(n);

    /**
     * https://wiki.documentfoundation.org/Documentation/Calc_Functions/PMT
     *
     * 0 = pv * (1 + r)^N + fv + [ p * (1 + r * t) * ((1 + r)^N - 1) ] / r
     *
     * We simply the equation for p
     */
    if (r === 0) {
      return -(fv + pv) / n;
    }
    let payment = -(pv * (1 + r) ** n + fv);
    payment = (payment * r) / ((1 + r * t) * ((1 + r) ** n - 1));

    return payment;
  },
};

// -----------------------------------------------------------------------------
// PPMT
// -----------------------------------------------------------------------------
export const PPMT: AddFunctionDescription = {
  description: _lt("Payment on the principal of an investment."),
  args: args(`
  rate (number) ${_lt("The annualized rate of interest.")}
  period (number) ${_lt("The amortization period, in terms of number of periods.")}
  number_of_periods (number) ${_lt("The number of payments to be made.")}
  present_value (number) ${_lt("The current value of the annuity.")}
  future_value (number, default=${DEFAULT_FUTURE_VALUE}) ${_lt(
    "The future value remaining after the final payment has been made."
  )}
  end_or_beginning (number, default=${DEFAULT_END_OR_BEGINNING}) ${_lt(
    "Whether payments are due at the end (0) or beginning (1) of each period."
  )}
  `),
  returns: ["NUMBER"],
  computeFormat: () => "#,##0.00",
  compute: function (
    rate: PrimitiveArgValue,
    currentPeriod: PrimitiveArgValue,
    numberOfPeriods: PrimitiveArgValue,
    presentValue: PrimitiveArgValue,
    futureValue: PrimitiveArgValue = DEFAULT_FUTURE_VALUE,
    endOrBeginning: PrimitiveArgValue = DEFAULT_END_OR_BEGINNING
  ): number {
    futureValue = futureValue || 0;
    endOrBeginning = endOrBeginning || 0;
    const n = toNumber(numberOfPeriods);
    const r = toNumber(rate);
    const period = toNumber(currentPeriod);
    const type = toBoolean(endOrBeginning) ? 1 : 0;
    const fv = toNumber(futureValue);
    const pv = toNumber(presentValue);

    assertNumberOfPeriodsPositive(n);
    assert(
      () => period > 0 && period <= n,
      _lt("The period must be between 1 and number_of_periods", n.toString())
    );

    const payment = PMT.compute(r, n, pv, fv, endOrBeginning) as number;

    if (type === 1 && period === 1) return payment;
    const eqPeriod = type === 0 ? period - 1 : period - 2;
    const eqPv = pv + payment * type;

    const capitalAtPeriod = -(FV.compute(r, eqPeriod, payment, eqPv, 0) as number);
    const currentInterest = capitalAtPeriod * r;
    return payment + currentInterest;
  },
};

// -----------------------------------------------------------------------------
// PV
// -----------------------------------------------------------------------------
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
  computeFormat: () => "#,##0.00",
  compute: function (
    rate: PrimitiveArgValue,
    numberOfPeriods: PrimitiveArgValue,
    paymentAmount: PrimitiveArgValue,
    futureValue: PrimitiveArgValue = DEFAULT_FUTURE_VALUE,
    endOrBeginning: PrimitiveArgValue = DEFAULT_END_OR_BEGINNING
  ): number {
    futureValue = futureValue || 0;
    endOrBeginning = endOrBeginning || 0;
    const r = toNumber(rate);
    const n = toNumber(numberOfPeriods);
    const p = toNumber(paymentAmount);
    const fv = toNumber(futureValue);
    const type = toBoolean(endOrBeginning) ? 1 : 0;
    // https://wiki.documentfoundation.org/Documentation/Calc_Functions/PV
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
    settlement: PrimitiveArgValue,
    maturity: PrimitiveArgValue,
    rate: PrimitiveArgValue,
    securityYield: PrimitiveArgValue,
    redemption: PrimitiveArgValue,
    frequency: PrimitiveArgValue,
    dayCountConvention: PrimitiveArgValue = DEFAULT_DAY_COUNT_CONVENTION
  ): number {
    dayCountConvention = dayCountConvention || 0;
    const _settlement = Math.trunc(toNumber(settlement));
    const _maturity = Math.trunc(toNumber(maturity));
    const _rate = toNumber(rate);
    const _yield = toNumber(securityYield);
    const _redemption = toNumber(redemption);
    const _frequency = Math.trunc(toNumber(frequency));
    const _dayCountConvention = Math.trunc(toNumber(dayCountConvention));

    checkMaturityAndSettlementDates(_settlement, _maturity);
    checkCouponFrequency(_frequency);
    checkDayCountConvention(_dayCountConvention);

    assert(() => _rate >= 0, _lt("The rate (%s) must be positive or null.", _rate.toString()));
    assert(() => _yield >= 0, _lt("The yield (%s) must be positive or null.", _yield.toString()));
    assertRedemptionPositive(_redemption);

    const years = YEARFRAC.compute(_settlement, _maturity, _dayCountConvention) as number;
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
// PRICEDISC
// -----------------------------------------------------------------------------
export const PRICEDISC: AddFunctionDescription = {
  description: _lt("Price of a discount security."),
  args: args(`
      settlement (date) ${_lt(
        "The settlement date of the security, the date after issuance when the security is delivered to the buyer."
      )}
      maturity (date) ${_lt(
        "The maturity or end date of the security, when it can be redeemed at face, or par value."
      )}
      discount (number) ${_lt("The discount rate of the security at time of purchase.")}
      redemption (number) ${_lt("The redemption amount per 100 face value, or par.")}
      day_count_convention (number, default=${DEFAULT_DAY_COUNT_CONVENTION} ) ${_lt(
    "An indicator of what day count method to use."
  )}
    `),
  returns: ["NUMBER"],
  compute: function (
    settlement: PrimitiveArgValue,
    maturity: PrimitiveArgValue,
    discount: PrimitiveArgValue,
    redemption: PrimitiveArgValue,
    dayCountConvention: PrimitiveArgValue = DEFAULT_DAY_COUNT_CONVENTION
  ): number {
    dayCountConvention = dayCountConvention || 0;
    const _settlement = Math.trunc(toNumber(settlement));
    const _maturity = Math.trunc(toNumber(maturity));
    const _discount = toNumber(discount);
    const _redemption = toNumber(redemption);
    const _dayCountConvention = Math.trunc(toNumber(dayCountConvention));

    checkMaturityAndSettlementDates(_settlement, _maturity);
    checkDayCountConvention(_dayCountConvention);

    assert(
      () => _discount > 0,
      _lt("The discount (%s) must be greater than 0.", _discount.toString())
    );
    assertRedemptionPositive(_redemption);

    /**
     * https://support.microsoft.com/en-us/office/pricedisc-function-d06ad7c1-380e-4be7-9fd9-75e3079acfd3
     *
     * B = number of days in year, depending on year basis
     * DSM = number of days from settlement to maturity
     *
     * PRICEDISC = redemption - discount * redemption * (DSM/B)
     */
    const yearsFrac = YEARFRAC.compute(_settlement, _maturity, _dayCountConvention) as number;
    return _redemption - _discount * _redemption * yearsFrac;
  },
};

// -----------------------------------------------------------------------------
// PRICEMAT
// -----------------------------------------------------------------------------
export const PRICEMAT: AddFunctionDescription = {
  description: _lt(
    "Calculates the price of a security paying interest at maturity, based on expected yield."
  ),
  args: args(`
      settlement (date) ${_lt(
        "The settlement date of the security, the date after issuance when the security is delivered to the buyer."
      )}
      maturity (date) ${_lt(
        "The maturity or end date of the security, when it can be redeemed at face, or par value."
      )}
      issue (date) ${_lt("The date the security was initially issued.")}
      rate (number) ${_lt("The annualized rate of interest.")}
      yield (number) ${_lt("The expected annual yield of the security.")}
      day_count_convention (number, default=${DEFAULT_DAY_COUNT_CONVENTION} ) ${_lt(
    "An indicator of what day count method to use."
  )}
    `),
  returns: ["NUMBER"],
  compute: function (
    settlement: PrimitiveArgValue,
    maturity: PrimitiveArgValue,
    issue: PrimitiveArgValue,
    rate: PrimitiveArgValue,
    securityYield: PrimitiveArgValue,
    dayCountConvention: PrimitiveArgValue = DEFAULT_DAY_COUNT_CONVENTION
  ): number {
    dayCountConvention = dayCountConvention || 0;
    const _settlement = Math.trunc(toNumber(settlement));
    const _maturity = Math.trunc(toNumber(maturity));
    const _issue = Math.trunc(toNumber(issue));
    const _rate = toNumber(rate);
    const _yield = toNumber(securityYield);
    const _dayCount = Math.trunc(toNumber(dayCountConvention));

    checkSettlementAndIssueDates(_settlement, _issue);
    checkMaturityAndSettlementDates(_settlement, _maturity);
    checkDayCountConvention(_dayCount);

    assert(() => _rate >= 0, _lt("The rate (%s) must be positive or null.", _rate.toString()));
    assert(() => _yield >= 0, _lt("The yield (%s) must be positive or null.", _yield.toString()));

    /**
     * https://support.microsoft.com/en-us/office/pricemat-function-52c3b4da-bc7e-476a-989f-a95f675cae77
     *
     * B = number of days in year, depending on year basis
     * DSM = number of days from settlement to maturity
     * DIM = number of days from issue to maturity
     * DIS = number of days from issue to settlement
     *
     *             100 + (DIM/B * rate * 100)
     *  PRICEMAT =  __________________________   - (DIS/B * rate * 100)
     *              1 + (DSM/B * yield)
     *
     * The ratios number_of_days / days_in_year are computed using the YEARFRAC function, that handle
     * differences due to day count conventions.
     *
     * Compatibility note :
     *
     * Contrary to GSheet and OpenOffice, Excel doesn't seems to always use its own YEARFRAC function
     * to compute PRICEMAT, and give different values for some combinations of dates and day count
     * conventions ( notably for leap years and dayCountConvention = 1 (Actual/Actual)).
     *
     * Our function PRICEMAT give us the same results as LibreOffice Calc.
     * Google Sheet use the formula with YEARFRAC, but its YEARFRAC function results are different
     * from the results of Excel/LibreOffice, thus we get different values with PRICEMAT.
     *
     */
    const settlementToMaturity = YEARFRAC.compute(_settlement, _maturity, _dayCount) as number;
    const issueToSettlement = YEARFRAC.compute(_settlement, _issue, _dayCount) as number;
    const issueToMaturity = YEARFRAC.compute(_issue, _maturity, _dayCount) as number;

    const numerator = 100 + issueToMaturity * _rate * 100;
    const denominator = 1 + settlementToMaturity * _yield;
    const term2 = issueToSettlement * _rate * 100;
    return numerator / denominator - term2;
  },
};

// -----------------------------------------------------------------------------
// RATE
// -----------------------------------------------------------------------------
const RATE_GUESS_DEFAULT = 0.1;
export const RATE: AddFunctionDescription = {
  description: _lt("Interest rate of an annuity investment."),
  args: args(`
  number_of_periods (number) ${_lt("The number of payments to be made.")}
  payment_per_period (number) ${_lt("The amount per period to be paid.")}
  present_value (number) ${_lt("The current value of the annuity.")}
  future_value (number, default=${DEFAULT_FUTURE_VALUE}) ${_lt(
    "The future value remaining after the final payment has been made."
  )}
  end_or_beginning (number, default=${DEFAULT_END_OR_BEGINNING}) ${_lt(
    "Whether payments are due at the end (0) or beginning (1) of each period."
  )}
  rate_guess (number, default=${RATE_GUESS_DEFAULT}) ${_lt(
    "An estimate for what the interest rate will be."
  )}
  `),
  returns: ["NUMBER"],
  computeFormat: () => "0%",
  compute: function (
    numberOfPeriods: PrimitiveArgValue,
    paymentPerPeriod: PrimitiveArgValue,
    presentValue: PrimitiveArgValue,
    futureValue: PrimitiveArgValue = DEFAULT_FUTURE_VALUE,
    endOrBeginning: PrimitiveArgValue = DEFAULT_END_OR_BEGINNING,
    rateGuess: PrimitiveArgValue = RATE_GUESS_DEFAULT
  ): number {
    futureValue = futureValue || 0;
    endOrBeginning = endOrBeginning || 0;
    rateGuess = rateGuess || RATE_GUESS_DEFAULT;
    const n = toNumber(numberOfPeriods);
    const payment = toNumber(paymentPerPeriod);
    const type = toBoolean(endOrBeginning) ? 1 : 0;
    const guess = toNumber(rateGuess);
    let fv = toNumber(futureValue);
    let pv = toNumber(presentValue);

    assertNumberOfPeriodsPositive(n);
    assert(
      () => [payment, pv, fv].some((val) => val > 0) && [payment, pv, fv].some((val) => val < 0),
      _lt(
        "There must be both positive and negative values in [payment_amount, present_value, future_value].",
        n.toString()
      )
    );
    assert(() => guess > -1, _lt("The rate_guess (%s) must be greater than -1.", guess.toString()));

    fv -= payment * type;
    pv += payment * type;

    // https://github.com/apache/openoffice/blob/trunk/main/sc/source/core/tool/interpr2.cxx
    const func = (rate: number) => {
      const powN = Math.pow(1 + rate, n);
      const intResult = (powN - 1) / rate;
      return fv + pv * powN + payment * intResult;
    };
    const derivFunc = (rate: number) => {
      const powNMinus1 = Math.pow(1 + rate, n - 1);
      const powN = Math.pow(1 + rate, n);
      const intResult = (powN - 1) / rate;
      const intResultDeriv = (n * powNMinus1) / rate - intResult / rate;
      const fTermDerivation = pv * n * powNMinus1 + payment * intResultDeriv;
      return fTermDerivation;
    };

    return newtonMethod(func, derivFunc, guess, 40, 1e-5);
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
    settlement: PrimitiveArgValue,
    maturity: PrimitiveArgValue,
    rate: PrimitiveArgValue,
    price: PrimitiveArgValue,
    redemption: PrimitiveArgValue,
    frequency: PrimitiveArgValue,
    dayCountConvention: PrimitiveArgValue = DEFAULT_DAY_COUNT_CONVENTION
  ): number {
    dayCountConvention = dayCountConvention || 0;
    const _settlement = Math.trunc(toNumber(settlement));
    const _maturity = Math.trunc(toNumber(maturity));
    const _rate = toNumber(rate);
    const _price = toNumber(price);
    const _redemption = toNumber(redemption);
    const _frequency = Math.trunc(toNumber(frequency));
    const _dayCountConvention = Math.trunc(toNumber(dayCountConvention));

    checkMaturityAndSettlementDates(_settlement, _maturity);
    checkCouponFrequency(_frequency);
    checkDayCountConvention(_dayCountConvention);

    assert(() => _rate >= 0, _lt("The rate (%s) must be positive or null.", _rate.toString()));
    assertPricePositive(_price);
    assertRedemptionPositive(_redemption);

    const years = YEARFRAC.compute(_settlement, _maturity, _dayCountConvention) as number;
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
// YIELDDISC
// -----------------------------------------------------------------------------
export const YIELDDISC: AddFunctionDescription = {
  description: _lt("Annual yield of a discount security."),
  args: args(`
        settlement (date) ${_lt(
          "The settlement date of the security, the date after issuance when the security is delivered to the buyer."
        )}
        maturity (date) ${_lt(
          "The maturity or end date of the security, when it can be redeemed at face, or par value."
        )}
        price (number) ${_lt("The price at which the security is bought per 100 face value.")}
        redemption (number) ${_lt("The redemption amount per 100 face value, or par.")}
        day_count_convention (number, default=${DEFAULT_DAY_COUNT_CONVENTION} ) ${_lt(
    "An indicator of what day count method to use."
  )}
    `),
  returns: ["NUMBER"],
  compute: function (
    settlement: PrimitiveArgValue,
    maturity: PrimitiveArgValue,
    price: PrimitiveArgValue,
    redemption: PrimitiveArgValue,
    dayCountConvention: PrimitiveArgValue = DEFAULT_DAY_COUNT_CONVENTION
  ): number {
    dayCountConvention = dayCountConvention || 0;
    const _settlement = Math.trunc(toNumber(settlement));
    const _maturity = Math.trunc(toNumber(maturity));
    const _price = toNumber(price);
    const _redemption = toNumber(redemption);
    const _dayCountConvention = Math.trunc(toNumber(dayCountConvention));

    checkMaturityAndSettlementDates(_settlement, _maturity);
    checkDayCountConvention(_dayCountConvention);
    assertPricePositive(_price);
    assertRedemptionPositive(_redemption);

    /**
     * https://wiki.documentfoundation.org/Documentation/Calc_Functions/YIELDDISC
     *
     *                    (redemption / price) - 1
     * YIELDDISC = _____________________________________
     *             YEARFRAC(settlement, maturity, basis)
     */
    const yearFrac = YEARFRAC.compute(settlement, maturity, dayCountConvention) as number;
    return (_redemption / _price - 1) / yearFrac;
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
    settlement: PrimitiveArgValue,
    maturity: PrimitiveArgValue,
    issue: PrimitiveArgValue,
    rate: PrimitiveArgValue,
    price: PrimitiveArgValue,
    dayCountConvention: PrimitiveArgValue = DEFAULT_DAY_COUNT_CONVENTION
  ): number {
    dayCountConvention = dayCountConvention || 0;
    const _settlement = Math.trunc(toNumber(settlement));
    const _maturity = Math.trunc(toNumber(maturity));
    const _issue = Math.trunc(toNumber(issue));
    const _rate = toNumber(rate);
    const _price = toNumber(price);
    const _dayCountConvention = Math.trunc(toNumber(dayCountConvention));

    checkMaturityAndSettlementDates(_settlement, _maturity);
    checkDayCountConvention(_dayCountConvention);

    assert(
      () => _settlement >= _issue,
      _lt(
        "The settlement (%s) must be greater than or equal to the issue (%s).",
        _settlement.toString(),
        _issue.toString()
      )
    );
    assert(() => _rate >= 0, _lt("The rate (%s) must be positive or null.", _rate.toString()));
    assertPricePositive(_price);

    const issueToMaturity = YEARFRAC.compute(_issue, _maturity, _dayCountConvention) as number;
    const issueToSettlement = YEARFRAC.compute(_issue, _settlement, _dayCountConvention) as number;
    const settlementToMaturity = YEARFRAC.compute(
      _settlement,
      _maturity,
      _dayCountConvention
    ) as number;

    const numerator =
      (100 * (1 + _rate * issueToMaturity)) / (_price + 100 * _rate * issueToSettlement) - 1;

    return numerator / settlementToMaturity;
  },
};
