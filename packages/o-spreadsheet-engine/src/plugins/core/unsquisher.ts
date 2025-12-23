import { compile, InternalCompiledFormula } from "../../formulas/compiler";
import { toCartesian } from "../../helpers/coordinates";
import { expandRange } from "../../helpers/expand_range";
import { Position } from "../../types/misc";

export class Unsquisher {
  private previousCell: InternalCompiledFormula | undefined;

  /**
   * Expands a squished sheet object back to a full cell map.
   * For range keys like "B2:B73", fills all cells in the range with the value.
   * For single cell keys like "A1", copies as is.
   * Assumes input is an object: { [ref: string]: string | object }
   *
   * @param squished - The squished sheet object.
   * Yields [cellRef, value] for each cell in the expanded squished object.
   */
  *unsquishSheet(squished: { [key: string]: any }): Generator<{
    position: Position;
    content?: string;
    compiled?: InternalCompiledFormula;
  }> {
    for (const key in squished) {
      if (key.includes(":")) {
        // Range key, e.g. B2:B73
        const [start, end] = key.split(":");
        for (const cell of expandRange(start, end)) {
          const result = this.unsquish(squished[key]);
          if (typeof result === "string") {
            yield { position: { col: cell[0], row: cell[1] }, content: result };
          } else {
            yield { position: { col: cell[0], row: cell[1] }, compiled: result };
          }
        }
      } else {
        // Single cell
        toCartesian(key);
        const result = this.unsquish(squished[key]);
        if (typeof result === "string") {
          yield { position: toCartesian(key), content: result };
        } else {
          yield { position: toCartesian(key), compiled: result };
        }
      }
    }
  }

  unsquish(squishedElement: any): string | InternalCompiledFormula {
    /*
     * 2 cases:
     * 1) squishedElement is a string -> simple formula, return as is
     * 2) squishedElement is an object with C property -> complex formula, need to unsquish references, numbers, strings
     * */
    if (typeof squishedElement === "string") {
      if (squishedElement.startsWith("=")) {
        // simple formula
        const compiled = compile(squishedElement);
        this.previousCell = compiled;
        return compiled;
      }

      return squishedElement;
    }
    if (typeof squishedElement === "object") {
      if (squishedElement.N !== undefined) {
        // numbers
      }
      if (squishedElement.S !== undefined) {
        // strings
      }
      if (squishedElement.R !== undefined) {
        // references
      }
    }
    return "prout";
  }
}
