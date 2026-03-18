import { SquishedCoreCommand } from "../../collaborative/commandSquisher";
import { CompiledFormula } from "../../formulas/compiler";
import { toCartesian } from "../../helpers/coordinates";
import { expandRange, expandXc } from "../../helpers/expand_range";
import { isNumber, parseNumber } from "../../helpers/numbers";
import { CoreCommand, UpdateCellCommand } from "../../types/commands";
import { CoreGetters } from "../../types/core_getters";
import { DEFAULT_LOCALE } from "../../types/locale";
import { Position, UID } from "../../types/misc";
import { Range } from "../../types/range";
import { NO_CHANGE, SEPARATOR, SquishedContent, SquishedFormula } from "./squisher";

type UnsquishMethod =
  | "NOT_A_FORMULA"
  | "NEW_FORMULA"
  | "NEW_NUMBER"
  | "FIRST_OFFSET"
  | "COMBINE_OFFSET"
  | "OFFSET_NUMBER";

export class Unsquisher {
  private previousFormula: CompiledFormula | undefined;
  private alreadyAppliedNumberOffset: number[] = [];
  private previousString: string[] = [];
  private alreadyAppliedReferenceOffset: Range[] = [];
  private previousOffset: SquishedFormula | undefined = undefined;
  private previousNumber: number | undefined = undefined;

  rebase() {
    this.previousFormula = undefined;
    this.alreadyAppliedNumberOffset = [];
    this.previousString = [];
    this.alreadyAppliedReferenceOffset = [];
    this.previousOffset = undefined;
    this.previousNumber = undefined;
  }

  /**
   * Expands a list of commands that may contain SQUISHED_UPDATE_CELL commands back to a list of full commands.
   */
  *unsquishCommands(
    commands: readonly (CoreCommand | SquishedCoreCommand)[],
    getters: CoreGetters
  ): Generator<CoreCommand> {
    let strategy: UnsquishMethod | undefined;
    for (const command of commands) {
      if (command.type !== "UPDATE_CELL" && command.type !== "SQUISHED_UPDATE_CELL") {
        yield command;
        continue;
      }

      const current = command.content;
      if (current === undefined || current === null || current === "") {
        strategy = "NOT_A_FORMULA";
      } else {
        strategy = this.chooseStrategy(current, strategy, command.sheetId, getters);
      }

      let targetPositions: Iterable<Position>;
      if (command.type === "SQUISHED_UPDATE_CELL" && "targetRange" in command) {
        const [start, end] = command.targetRange.split(":");
        targetPositions = expandRange(start, end);
      } else {
        targetPositions = [{ row: command.row, col: command.col }];
      }

      yield* this.applyStrategy(
        strategy,
        targetPositions,
        current,
        command.sheetId,
        getters,
        (position, data) => {
          const finalContent = data.compiled
            ? data.compiled.toFormulaString(getters)
            : data.content;
          const originalCommand: UpdateCellCommand = {
            type: "UPDATE_CELL",
            sheetId: command.sheetId,
            row: position.row,
            col: position.col,
          };
          if ("content" in command || data.compiled) {
            originalCommand.content = finalContent;
          }
          if ("style" in command) {
            originalCommand.style = command.style;
          }
          if ("format" in command) {
            originalCommand.format = command.format;
          }
          return originalCommand;
        }
      );
    }
  }

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
    squished: { [cellRefOrRange: string]: SquishedContent | undefined },
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
      } else {
        strategy = this.chooseStrategy(current, strategy, sheetId, getters);
      }

      const parts = key.split(":");
      const targetPositions = parts.length === 1 ? expandXc(key) : expandRange(parts[0], parts[1]);

      yield* this.applyStrategy(
        strategy,
        targetPositions,
        current,
        sheetId,
        getters,
        (position, data) => ({ position, ...data })
      );
    }
  }

  /**
   * Determines the unsquishing strategy based on the current content and previous state. This logic is the same for both unsquishing commands and sheets.
   */
  private chooseStrategy(
    current: SquishedContent,
    previousStrategy: UnsquishMethod | undefined,
    sheetId: UID,
    getters: CoreGetters
  ): UnsquishMethod | undefined {
    let strategy = previousStrategy;
    if (typeof current === "string") {
      if (current.startsWith("=")) {
        strategy = "NEW_FORMULA";
        // compile the found formula. Reset previousCell and offsets because it's a new formula
        const compiled = CompiledFormula.Compile(current, sheetId, getters);
        this.previousFormula = compiled;
        this.alreadyAppliedNumberOffset = compiled.literalValues.numbers.map((n) => n.value);
        this.previousString = compiled.literalValues.strings.map((s) => s.value);
        this.alreadyAppliedReferenceOffset = [...compiled.rangeDependencies];
        this.previousOffset = undefined;
        this.previousNumber = undefined;
      } else if (isNumber(current, DEFAULT_LOCALE)) {
        strategy = "NEW_NUMBER";
        this.rebase();
        this.previousNumber = parseNumber(current, DEFAULT_LOCALE);
      } else {
        this.rebase();
        strategy = "NOT_A_FORMULA";
      }
    } else {
      // the current cell is an object, let's see if there is a transformation
      if (current.N || current.S || current.R) {
        if (!strategy) {
          throw new Error("Incorrect order of commands, cannot unsquish");
        }
        switch (strategy) {
          case "NEW_FORMULA":
            strategy = "FIRST_OFFSET";
            break;
          case "NEW_NUMBER":
            if (current.R || current.S) {
              throw new Error(
                "Invalid squished format: cannot have string or reference offsets for a number"
              );
            }
            strategy = "OFFSET_NUMBER";
            break;
          case "FIRST_OFFSET":
            strategy = "COMBINE_OFFSET";
            break;
        }
      }
    }
    return strategy;
  }

  /**
   * Applies the given unsquishing strategy to the current cell content and yields the resulting commands or cell updates.
   * This logic is the same for both unsquishing commands and sheets.
   * @param strategy - the unsquishing strategy to apply, determined by the current content and previous state
   * @param targetPositions - the positions that the current squished content applies to (can be multiples in case of range keys)
   * @param squishedContent
   * @param sheetId
   * @param getters
   * @param yieldTransformer - a function that transforms the position and unsquished data into the desired output format (e.g. a command or a cell update object)
   * @private
   */
  private *applyStrategy<T>(
    strategy: UnsquishMethod | undefined,
    targetPositions: Iterable<Position>,
    squishedContent: SquishedContent | undefined,
    sheetId: UID,
    getters: CoreGetters,
    yieldTransformer: (
      position: Position,
      data: { content?: string; compiled?: CompiledFormula }
    ) => T
  ): Generator<T> {
    const current = squishedContent;
    switch (strategy) {
      case "NEW_FORMULA":
        for (const position of targetPositions) {
          yield yieldTransformer(position, { compiled: this.previousFormula });
        }
        break;

      case "NOT_A_FORMULA":
        for (const position of targetPositions) {
          yield yieldTransformer(position, { content: current as string | undefined });
        }
        break;

      case "FIRST_OFFSET": {
        const currentOffset = current as SquishedFormula;
        this.previousOffset = currentOffset;
        for (const position of targetPositions) {
          const result = this.unsquishFormula(currentOffset, sheetId, getters);
          yield yieldTransformer(position, { compiled: result });
        }
        break;
      }

      case "COMBINE_OFFSET": {
        if (!this.previousOffset) {
          throw new Error("No previous offset to combine with");
        }
        const currentOffset = current as SquishedFormula;
        this.previousOffset.N = currentOffset.N ?? this.previousOffset.N;
        this.previousOffset.S = currentOffset.S ?? this.previousOffset.S;
        this.previousOffset.R = currentOffset.R ?? this.previousOffset.R;
        for (const position of targetPositions) {
          const result = this.unsquishFormula(this.previousOffset, sheetId, getters);
          yield yieldTransformer(position, { compiled: result });
        }
        break;
      }
      case "NEW_NUMBER": {
        for (const position of targetPositions) {
          yield yieldTransformer(position, { content: current as string | undefined });
        }
        break;
      }
      case "OFFSET_NUMBER": {
        const offset = (current as SquishedFormula).N;
        if (offset === undefined || this.previousNumber === undefined) {
          throw new Error(
            `No ${offset} provided for OFFSET_NUMBER strategy, previous ${
              this.previousNumber
            } for ${sheetId}!${JSON.stringify(current)} `
          );
        }
        const offsetValue = parseFloat(offset);

        for (const position of targetPositions) {
          yield yieldTransformer(position, {
            content: (this.previousNumber += offsetValue).toString(),
          });
        }
        break;
      }
    }
  }

  /**
   * Unsquishes the given squished formula by applying the offsets to the previous formula's literal values and range dependencies.
   */
  private unsquishFormula(
    squishedFormula: SquishedFormula,
    sheetId: UID,
    getters: CoreGetters
  ): CompiledFormula {
    if (typeof squishedFormula === "object" && this.previousFormula) {
      const current: {
        numbers: { value: number }[];
        strings: { value: string }[];
        dependencies: Range[];
      } = {
        numbers: [],
        strings: [],
        dependencies: [],
      };
      if (squishedFormula.N !== undefined && squishedFormula.N.length > 0) {
        current.numbers = squishedFormula.N.split(SEPARATOR).map(this.adjustNumbers);
      } else {
        current.numbers = this.previousFormula.literalValues.numbers;
      }
      if (squishedFormula.S !== undefined && squishedFormula.S.length > 0) {
        current.strings = squishedFormula.S.map(this.adjustStrings);
      } else {
        current.strings = this.previousFormula.literalValues.strings;
      }
      if (squishedFormula.R !== undefined && this.previousFormula) {
        // references
        let references: string[];
        if (typeof squishedFormula.R !== "string") {
          // special case when the sheet name contains the separator
          references = squishedFormula.R;
        } else {
          references = squishedFormula.R.split(SEPARATOR);
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
              const updatedRange: Range = { ...this.alreadyAppliedReferenceOffset[index] };
              updatedRange.zone = updatedRange.unboundedZone = {
                ...updatedRange.zone,
                top: adjustedOffset,
                bottom: adjustedOffset,
              };
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
        current.dependencies = this.previousFormula.rangeDependencies;
      }
      return CompiledFormula.CopyWithDependenciesAndLiteral(
        this.previousFormula,
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
