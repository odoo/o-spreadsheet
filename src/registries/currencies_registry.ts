import { Registry } from "../registry";
import { Currency } from "../types";

/**
 * Registry intended to support usual currencies. It is mainly used to create
 * currency formats that can be selected or modified when customizing formats.
 */
export const currenciesRegistry = new Registry<Currency>();
