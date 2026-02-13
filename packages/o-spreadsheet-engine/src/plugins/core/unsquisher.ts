import { CompiledFormula } from "../../formulas/compiler";
import { toCartesian } from "../../helpers/coordinates";
import { expandRange, expandXc } from "../../helpers/expand_range";
import { CoreGetters } from "../../types/core_getters";
import { Position, UID } from "../../types/misc";
import { Range } from "../../types/range";
import { NO_CHANGE, SEPARATOR, SquishedCell, SquishedFormula } from "./squisher";

type UnsquishMethod =
  | "NOT_A_FORMULA"
  | "NEW_FORMULA"
  | "COMBINE_OFFSET"
  | "FIRST_OFFSET"
  | "NO_CHANGE";

export class Unsquisher {
  private previousCell: CompiledFormula | undefined;
  private alreadyAppliedNumberOffset: number[] = [];
  private previousString: string[] = [];
  private alreadyAppliedReferenceOffset: Range[] = [];
  private previousOffset: SquishedFormula | undefined = undefined;

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

    let strategy: UnsquishMethod | undefined;
    for (const { key } of keys) {
      const current = squished[key];
      if (current === undefined || current === null || current === "") {
        continue; // skip empty entries
      }
      if (typeof current === "string") {
        if (current.startsWith("=")) {
          strategy = "NEW_FORMULA";
          // compile the found formula. Reset previousCell and offsets because it's a new formula
          const compiled = CompiledFormula.CompileFormula(current, sheetId, getters);
          this.previousCell = compiled;
          this.alreadyAppliedNumberOffset = compiled.literalValues.numbers.map((n) => n.value);
          this.previousString = compiled.literalValues.strings.map((s) => s.value);
          this.alreadyAppliedReferenceOffset = [...compiled.rangeDependencies];
          this.previousOffset = undefined;
        } else {
          strategy = "NOT_A_FORMULA";
        }
      } else {
        // the current cell is an object, let's see if there is a transformation
        if (current.N || current.S || current.R) {
          if (!strategy || strategy === "NEW_FORMULA") {
            strategy = "FIRST_OFFSET";
          } else {
            strategy = "COMBINE_OFFSET";
          }
        } else {
          strategy = "NO_CHANGE";
        }
      }

      const parts = key.split(":");
      const positionsOfKey = parts.length === 1 ? expandXc(key) : expandRange(parts[0], parts[1]);
      switch (strategy) {
        case "NEW_FORMULA":
        case "NO_CHANGE":
          for (const position of positionsOfKey) {
            yield { position, compiled: this.previousCell };
          }
          break;
        case "NOT_A_FORMULA":
          for (const position of positionsOfKey) {
            yield {
              position,
              content: current as string | undefined,
            };
          }
          break;
        case "FIRST_OFFSET":
          this.previousOffset = current as SquishedFormula;
          for (const position of positionsOfKey) {
            const result = this.unsquish(current as SquishedFormula, sheetId, getters);
            yield { position, compiled: result };
          }
          break;
        case "COMBINE_OFFSET":
          if (!this.previousOffset) {
            throw new Error("No previous offset to combine with");
          }
          const currentOffset = current as SquishedFormula;
          this.previousOffset.N = currentOffset.N ?? this.previousOffset.N;
          this.previousOffset.S = currentOffset.S ?? this.previousOffset.S;
          this.previousOffset.R = currentOffset.R ?? this.previousOffset.R;
          for (const position of positionsOfKey) {
            const result = this.unsquish(this.previousOffset, sheetId, getters);
            yield { position, compiled: result };
          }
          break;
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
          // special case when the sheet name contains the separator
          references = squishedElement.R;
        } else {
          references = squishedElement.R.split(SEPARATOR);
        }
        current.dependencies = references.map((refStr: string, index: number) => {
          if (refStr === NO_CHANGE) {
            return { ...this.alreadyAppliedReferenceOffset[index] };
          } else if (refStr.startsWith("+") || refStr.startsWith("-")) {
            //offset in either row R or col C (not both)
            const offset = parseInt(refStr.slice(2), 10);
            const sign = refStr[0] === "+" ? 1 : -1;
            if (refStr[1] === "R") {
              const adjustedOffset =
                this.alreadyAppliedReferenceOffset[index].zone.top + offset * sign;
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
              const adjustedOffset =
                this.alreadyAppliedReferenceOffset[index].zone.left + offset * sign;
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
