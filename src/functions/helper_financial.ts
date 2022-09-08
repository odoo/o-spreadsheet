import { _lt } from "../translation";
import { assert } from "./helpers";

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
