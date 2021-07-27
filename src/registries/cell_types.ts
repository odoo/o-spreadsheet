import { Registry } from "../registry";
import { Cell, CellDisplayProperties, CoreGetters, UID } from "../types";

//------------------------------------------------------------------------------
// Cell Registry
//------------------------------------------------------------------------------

/**
 * This registry is intended to map a cell content (raw string) to
 * an instance of a cell.
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

export const cellRegistry = new Registry<CellFactory>();
