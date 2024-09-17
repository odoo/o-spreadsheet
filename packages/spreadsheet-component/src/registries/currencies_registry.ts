import { Currency } from "../types";
import { Registry } from "./registry";

/**
 * Registry intended to support usual currencies. It is mainly used to create
 * currency formats that can be selected or modified when customizing formats.
 */
export const currenciesRegistry = new Registry<Currency>();
