/**
 * State
 *
 * This file defines the basic types involved in maintaining the running state
 * of a o-spreadsheet.
 *
 * The most important exported values are:
 * - interface GridState: the internal type of the state managed by the model
 */

export type {
  CreateRevisionOptions,
  HistoryChange,
  OperationSequenceNode,
  Transformation,
  TransformationFactory,
} from "@odoo/o-spreadsheet-engine";
export type * from "@odoo/o-spreadsheet-engine/types/autofill";
export * from "@odoo/o-spreadsheet-engine/types/cells";
export * from "@odoo/o-spreadsheet-engine/types/chart/chart";
export * from "@odoo/o-spreadsheet-engine/types/clipboard";
export type * from "@odoo/o-spreadsheet-engine/types/collaborative/revisions";
export type * from "@odoo/o-spreadsheet-engine/types/collaborative/session";
export * from "@odoo/o-spreadsheet-engine/types/commands";
export * from "@odoo/o-spreadsheet-engine/types/conditional_formatting";
export type * from "@odoo/o-spreadsheet-engine/types/currency";
export * from "@odoo/o-spreadsheet-engine/types/data_validation";
export type * from "@odoo/o-spreadsheet-engine/types/env";
export * from "@odoo/o-spreadsheet-engine/types/errors";
export type * from "@odoo/o-spreadsheet-engine/types/figure";
export type * from "@odoo/o-spreadsheet-engine/types/format";
export type * from "@odoo/o-spreadsheet-engine/types/functions";
export type * from "@odoo/o-spreadsheet-engine/types/generic_criterion";
export type * from "@odoo/o-spreadsheet-engine/types/getters";
export type * from "@odoo/o-spreadsheet-engine/types/history";
export * from "@odoo/o-spreadsheet-engine/types/locale";
export * from "@odoo/o-spreadsheet-engine/types/misc";
export * from "@odoo/o-spreadsheet-engine/types/pivot";
export type * from "@odoo/o-spreadsheet-engine/types/pivot_runtime";
export type * from "@odoo/o-spreadsheet-engine/types/range";
export * from "@odoo/o-spreadsheet-engine/types/rendering";
export * from "@odoo/o-spreadsheet-engine/types/table";
export type * from "@odoo/o-spreadsheet-engine/types/workbook_data";
