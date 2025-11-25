import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, useState } from "@odoo/owl";
import { FunctionDescription } from "../../../types";
import { Collapse } from "../../side_panel/components/collapse/collapse";

interface Props {
  functionDescription: FunctionDescription;
  argsToFocus: number[];
  repeatingArgGroupIndex: number | undefined;
}

export class FunctionDescriptionProvider extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-FunctionDescriptionProvider";
  static props = {
    functionDescription: Object,
    argsToFocus: Array,
    repeatingArgGroupIndex: { type: Number, optional: true },
  };
  static components = { Collapse };

  private state: { isCollapsed: boolean } = useState({
    isCollapsed: true,
  });

  toggle() {
    this.state.isCollapsed = !this.state.isCollapsed;
  }

  getContext(): Props {
    return this.props;
  }

  get formulaHeaderContent(): { content: string; focused?: boolean }[] {
    const { functionDescription, repeatingArgGroupIndex, argsToFocus } = this.props;
    const argSeparator = this.env.model.getters.getLocale().formulaArgSeparator + " ";

    const result: { content: string; focused?: boolean }[] = [
      { content: functionDescription.name + " ( " },
    ];

    for (let i = 0; i < functionDescription.args.length; i++) {
      const arg = functionDescription.args[i];
      const isRepeating = arg.repeating;

      if (i > 0) {
        result.push({ content: argSeparator });
      }

      if (isRepeating) {
        // treat all repeating args in one go
        const displayBrackets = arg.optional || (repeatingArgGroupIndex ?? 0) > 0;
        const repeatingArgNames = functionDescription.args
          .slice(i, i + functionDescription.nbrArgRepeating)
          .map((arg) => arg.name);

        if (repeatingArgGroupIndex) {
          result.push({ content: "... " + argSeparator });
        }
        if (displayBrackets) {
          result.push({ content: "[" });
        }
        for (let idx = 0; idx < repeatingArgNames.length; idx++) {
          const name = repeatingArgNames[idx];
          const argIndex = i + idx;
          const focused = argsToFocus.includes(argIndex);
          result.push({ content: name + ((repeatingArgGroupIndex ?? 0) + 1), focused });
          // Add separator after each element except the last
          if (idx < repeatingArgNames.length - 1) {
            result.push({ content: argSeparator });
          }
        }
        if (displayBrackets) {
          result.push({ content: "]" });
        }
        if (functionDescription.nbrArgRepeating <= 1) {
          result.push({ content: argSeparator + "[" });
          for (let idx = 0; idx < repeatingArgNames.length; idx++) {
            const name = repeatingArgNames[idx];
            result.push({ content: name + ((repeatingArgGroupIndex ?? 0) + 2) });
            // Add separator after each element except the last
            if (idx < repeatingArgNames.length - 1) {
              result.push({ content: argSeparator });
            }
          }
          result.push({ content: "]" });
        }
        result.push({ content: argSeparator + "... " });

        // Skip the processed repeating args
        i += functionDescription.nbrArgRepeating - 1;
      } else {
        const displayBrackets = arg.optional || arg.default;
        const focused = argsToFocus.includes(i);
        if (displayBrackets) {
          result.push({ content: "[" });
        }
        result.push({ content: arg.name, focused });
        if (displayBrackets) {
          result.push({ content: "]" });
        }
      }
    }

    result.push({ content: " )" });

    return result;
  }
}
