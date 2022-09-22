import { _lt } from "../translation";
import { assert, toJsDate } from "./helpers";

/** Assert maturity date > settlement date */
export function checkMaturityAndSettlementDates(settlement: number, maturity: number) {
  assert(
    () => settlement < maturity,
    _lt(
      "The maturity (%s) must be strictly greater than the settlement (%s).",
      maturity.toString(),
      settlement.toString()
    )
  );
}

/** Assert settlement date > issue date */
export function checkSettlementAndIssueDates(settlement: number, issue: number) {
  assert(
    () => issue < settlement,
    _lt(
      "The settlement date (%s) must be strictly greater than the issue date (%s).",
      settlement.toString(),
      issue.toString()
    )
  );
}

/** Assert coupon frequency is in [1, 2, 4] */
export function checkCouponFrequency(frequency: number) {
  assert(
    () => [1, 2, 4].includes(frequency),
    _lt("The frequency (%s) must be one of %s", frequency.toString(), [1, 2, 4].toString())
  );
}

/** Assert dayCountConvention is between 0 and 4 */
export function checkDayCountConvention(dayCountConvention: number) {
  assert(
    () => 0 <= dayCountConvention && dayCountConvention <= 4,
    _lt(
      "The day_count_convention (%s) must be between 0 and 4 inclusive.",
      dayCountConvention.toString()
    )
  );
}

export function assertRedemptionPositive(redemption: number) {
  assert(
    () => redemption > 0,
    _lt("The redemption (%s) must be strictly positive.", redemption.toString())
  );
}

export function assertPricePositive(price: number) {
  assert(() => price > 0, _lt("The price (%s) must be strictly positive.", price.toString()));
}

export function assertNumberOfPeriodsPositive(nPeriods: number) {
  assert(
    () => nPeriods > 0,
    _lt("The number_of_periods (%s) must be greater than 0.", nPeriods.toString())
  );
}

export function assertRatePositive(rate: number) {
  assert(() => rate > 0, _lt("The rate (%s) must be strictly positive.", rate.toString()));
}

export function assertLifePositive(life: number) {
  assert(() => life > 0, _lt("The life (%s) must be strictly positive.", life.toString()));
}

export function assertCostPositiveOrZero(cost: number) {
  assert(() => cost >= 0, _lt("The cost (%s) must be positive or null.", cost.toString()));
}

export function assertPeriodPositive(period: number) {
  assert(() => period > 0, _lt("The period (%s) must be strictly positive.", period.toString()));
}

export function assertSalvagePositiveOrZero(salvage: number) {
  assert(() => salvage >= 0, _lt("The salvage (%s) must be positive or null.", salvage.toString()));
}

export function assertPresentValuePositive(pv: number) {
  assert(() => pv > 0, _lt("The present value (%s) must be strictly positive.", pv.toString()));
}

export function assertPeriodSmallerThanLife(period: number, life: number) {
  assert(
    () => period <= life,
    _lt("The period (%s) must be less than or equal life (%.", period.toString(), life.toString())
  );
}

export function assertInvestmentPositive(investment: number) {
  assert(
    () => investment > 0,
    _lt("The investment (%s) must be strictly positive.", investment.toString())
  );
}

export function assertDiscountPositive(discount: number) {
  assert(
    () => discount > 0,
    _lt("The discount (%s) must be strictly positive.", discount.toString())
  );
}

export function assertDiscountSmallerThanOne(discount: number) {
  assert(() => discount < 1, _lt("The discount (%s) must be smaller than 1.", discount.toString()));
}

export function assertDeprecationFactorPositive(factor: number) {
  assert(
    () => factor > 0,
    _lt("The depreciation factor (%s) must be strictly positive.", factor.toString())
  );
}

export function assertSettlementLessThanOneYearBeforeMaturity(
  settlement: number,
  maturity: number
) {
  const startDate = toJsDate(settlement);
  const endDate = toJsDate(maturity);

  const startDatePlusOneYear = new Date(startDate);
  startDatePlusOneYear.setFullYear(startDate.getFullYear() + 1);

  assert(
    () => endDate.getTime() <= startDatePlusOneYear.getTime(),
    _lt(
      "The settlement date (%s) must at most one year after the maturity date (%s).",
      settlement.toString(),
      maturity.toString()
    )
  );
}
/**
 * Check if the given periods are valid. This will assert :
 *
 * - 0 < numberOfPeriods
 * - 0 < firstPeriod <= lastPeriod
 * - 0 < lastPeriod <= numberOfPeriods
 *
 */
export function checkFirstAndLastPeriodsAreValid(
  firstPeriod: number,
  lastPeriod: number,
  numberOfPeriods: number
) {
  assertNumberOfPeriodsPositive(numberOfPeriods);
  assert(
    () => firstPeriod > 0,
    _lt("The first_period (%s) must be strictly positive.", firstPeriod.toString())
  );
  assert(
    () => lastPeriod > 0,
    _lt("The last_period (%s) must be strictly positive.", lastPeriod.toString())
  );
  assert(
    () => firstPeriod <= lastPeriod,
    _lt(
      "The first_period (%s) must be smaller or equal to the last_period (%s).",
      firstPeriod.toString(),
      lastPeriod.toString()
    )
  );
  assert(
    () => lastPeriod <= numberOfPeriods,
    _lt(
      "The last_period (%s) must be smaller or equal to the number_of_periods (%s).",
      firstPeriod.toString(),
      numberOfPeriods.toString()
    )
  );
}

/**
 * Check if the given periods are valid. This will assert :
 *
 * - 0 < life
 * - 0 <= startPeriod <= endPeriod
 * - 0 <= endPeriod <= life
 *
 */
export function checkStartAndEndPeriodAreValid(
  startPeriod: number,
  endPeriod: number,
  life: number
) {
  assertLifePositive(life);
  assert(
    () => startPeriod >= 0,
    _lt("The start_period (%s) must be greater or equal than 0.", startPeriod.toString())
  );
  assert(
    () => endPeriod >= 0,
    _lt("The end_period (%s) must be greater or equal than 0.", endPeriod.toString())
  );
  assert(
    () => startPeriod <= endPeriod,
    _lt(
      "The start_period (%s) must be smaller or equal to the end_period (%s).",
      startPeriod.toString(),
      endPeriod.toString()
    )
  );
  assert(
    () => endPeriod <= life,
    _lt(
      "The end_period (%s) must be smaller or equal to the life (%s).",
      startPeriod.toString(),
      life.toString()
    )
  );
}
