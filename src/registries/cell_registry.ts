import { Registry } from "../registry";
import { Cell, CellDisplayProperties, CoreGetters, UID } from "../types";

//------------------------------------------------------------------------------
// Cell Registry
//------------------------------------------------------------------------------

/**
 * This registry is intended to map a type of cell (tag) to a class of
 * component, that will be used in the UI to represent the figure.
 *
 * The most important type of figure will be the Chart
 */

interface CellFactory {
  sequence: number;
  match: (content: string) => boolean;
  createCell: (
    id: UID,
    content: string,
    properties: CellDisplayProperties,
    sheetId: UID,
    getters: CoreGetters
  ) => Cell;
}

export const cellTypes = new Registry<CellFactory>();
