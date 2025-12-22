import { CompiledFormula } from "../../formulas/compiler";
import { toCartesian } from "../../helpers/coordinates";
import { expandRange, expandXc } from "../../helpers/expand_range";
import { CoreGetters } from "../../types/core_getters";
import { Position, UID } from "../../types/misc";
import { Range } from "../../types/range";
import { NO_CHANGE, SEPARATOR, SquishedCell, SquishedFormula } from "./squisher";

export class Unsquisher {
  private previousCell: CompiledFormula | undefined;
  private alreadyAppliedNumberOffset: number[] = [];
  private previousString: string[] = [];
  private alreadyAppliedReferenceOffset: Range[] = [];
  private previousTransformation: SquishedFormula | undefined = undefined;

  /**
   * Expands a squished sheet object back to a full cell map.
   * For range keys like "B2:B73", fills all cells in the range with the value.
   * For single cell keys like "A1", copies as is.
   * Assumes input is an object: { [ref: string]: string | object }
   *
   * @param squished - The squished sheet object.
   * Yields [cellRef, value] for each cell in the expanded squished object.
   * @param sheetId
   * @param getters
   */
  *unsquishSheet(
    squished: { [key: string]: SquishedCell | undefined },
    sheetId: UID,
    getters: CoreGetters
  ): Generator<{
    position: Position;
    content?: string;
    compiled?: CompiledFormula;
  }> {
    // sort the keys in cartesian order (col first, then row) using the first part of the range (before ":")
    const keys = Object.keys(squished)
      .map((x) => {
        return { cartesian: toCartesian(x.split(":")[0]), key: x };
      })
      .sort((a, b) =>
        a.cartesian.col === b.cartesian.col
          ? a.cartesian.row - b.cartesian.row
          : a.cartesian.col - b.cartesian.col
      );

    for (const { key } of keys) {
      if (squished[key] === undefined || squished[key] === null || squished[key] === "") {
        continue; // skip empty entries
      }
      if (typeof squished[key] === "string" && squished[key].startsWith("=")) {
        // compile the found formula. Reset previousCell and offsets because it's a new formula
        const compiled = CompiledFormula.CompileFormula(squished[key], sheetId, getters);
        this.previousCell = compiled;
        this.alreadyAppliedNumberOffset = compiled.literalValues.numbers.map((n) => n.value);
        this.previousString = compiled.literalValues.strings.map((s) => s.value);
        this.alreadyAppliedReferenceOffset = compiled.rangeDependencies.map((r) => r);
        this.previousTransformation = undefined;
      }
      const parts = key.split(":");
      const positionsOfKey = parts.length === 1 ? expandXc(key) : expandRange(parts[0], parts[1]);
      for (const cell of positionsOfKey) {
        const current = squished[key];
        if (typeof current === "string") {
          if (current.startsWith("=")) {
            // we can use the compiled formula for all cells in the range
            yield { position: { col: cell[0], row: cell[1] }, compiled: this.previousCell };
          } else {
            // plain string content for all cells in the range
            yield { position: { col: cell[0], row: cell[1] }, content: current };
          }
        } else {
          // the current cell is an object, let's see if there is a transformation
          if (!current.N && !current.S && !current.R) {
            // empty cell with object content means "same as last time" on another position
            if (this.previousTransformation === undefined) {
              // no previous transformation to refer to, so just reuse the previous cell
              yield { position: { col: cell[0], row: cell[1] }, compiled: this.previousCell };
              continue;
            }
          } else {
            if (this.previousTransformation) {
              // there was a previous transformation, we need to replace the new parts without overriding the missing ones
              if (current.N) {
                this.previousTransformation.N = current.N;
              }
              if (current.S) {
                this.previousTransformation.S = current.S;
              }
              if (current.R) {
                this.previousTransformation.R = current.R;
              }
            } else {
              this.previousTransformation = current;
            }
          }
          const result = this.unsquish(this.previousTransformation, sheetId, getters);
          yield { position: { col: cell[0], row: cell[1] }, compiled: result };
        }
      }
    }
  }

  private unsquish(
    squishedElement: SquishedFormula,
    sheetId: UID,
    getters: CoreGetters
  ): CompiledFormula {
    if (typeof squishedElement === "object" && this.previousCell) {
      const current: {
        numbers: { value: number }[];
        strings: { value: string }[];
        dependencies: Range[];
      } = {
        numbers: [],
        strings: [],
        dependencies: [],
      };
      if (squishedElement.N !== undefined && squishedElement.N.length > 0) {
        current.numbers = squishedElement.N.split(SEPARATOR).map(this.adjustNumbers);
      } else {
        current.numbers = this.previousCell.literalValues.numbers;
      }
      if (squishedElement.S !== undefined && squishedElement.S.length > 0) {
        current.strings = squishedElement.S.map(this.adjustStrings);
      } else {
        current.strings = this.previousCell.literalValues.strings;
      }
      if (squishedElement.R !== undefined && this.previousCell) {
        // references
        let references: string[];
        if (typeof squishedElement.R !== "string") {
          // special case when sheets names contains the separator
          references = squishedElement.R;
        } else {
          references = squishedElement.R.split(SEPARATOR);
        }
        current.dependencies = references.map((refStr: string, index: number) => {
          if (refStr === NO_CHANGE) {
            return { ...this.alreadyAppliedReferenceOffset[index] };
          } else if (refStr.startsWith("+")) {
            //offset in either row R or col C (not both)
            const offset = parseInt(refStr.slice(2), 10);

            if (refStr[1] === "R") {
              const adjustedOffset = this.alreadyAppliedReferenceOffset[index].zone.top + offset;
              const updatedRange: Range = Object.assign(
                {},
                this.alreadyAppliedReferenceOffset[index]
              );
              updatedRange.zone = updatedRange.unboundedZone = Object.assign(
                {},
                updatedRange.zone,
                {
                  top: adjustedOffset,
                  bottom: adjustedOffset,
                }
              );
              this.alreadyAppliedReferenceOffset[index] = updatedRange;
              return updatedRange;
            } else if (refStr[1] === "C") {
              const adjustedOffset = this.alreadyAppliedReferenceOffset[index].zone.left + offset;
              const updatedRange: Range = Object.assign(
                {},
                this.alreadyAppliedReferenceOffset[index]
              );
              updatedRange.zone = updatedRange.unboundedZone = Object.assign(
                {},
                updatedRange.zone,
                {
                  left: adjustedOffset,
                  right: adjustedOffset,
                }
              );
              this.alreadyAppliedReferenceOffset[index] = updatedRange;
              return updatedRange;
            } else {
              throw new Error(`Invalid reference offset format: ${refStr}`);
            }
          } else {
            // the full reference
            const fullRange = getters.getRangeFromSheetXC(sheetId, refStr);
            this.alreadyAppliedReferenceOffset[index] = fullRange;
            return fullRange;
          }
        });
      } else {
        current.dependencies = this.previousCell.rangeDependencies;
      }
      return CompiledFormula.CopyWithDependenciesAndLiteral(
        this.previousCell,
        sheetId,
        current.dependencies,
        current.numbers,
        current.strings
      );
    }
    throw new Error("Invalid squished element or no previous cell to unsquish against");
  }

  private adjustStrings = (str: string, index: number): { value: string } => {
    if (str === NO_CHANGE) {
      return { value: this.previousString[index] };
    } else {
      this.previousString[index] = str;
      return { value: str };
    }
  };

  private adjustNumbers = (numStr: string, index: number): { value: number } => {
    if (numStr === NO_CHANGE) {
      return { value: this.alreadyAppliedNumberOffset[index] };
    } else {
      const currentOffset = parseFloat(numStr.slice(1));
      const adjustedOffset = (this.alreadyAppliedNumberOffset[index] || 0) + currentOffset;
      this.alreadyAppliedNumberOffset[index] = adjustedOffset;
      return {
        value: adjustedOffset,
      };
    }
  };
}
