import { tokenColors } from "@odoo/o-spreadsheet-engine/constants";
import { EnrichedToken } from "@odoo/o-spreadsheet-engine/formulas/composer_tokenizer";
import { CellComposerStore } from "../components/composer/composer/cell_composer_store";
import {
  AutoCompleteProposal,
  autoCompleteProviders,
} from "../registries/auto_completes/auto_complete_registry";
import { ArgDefinition } from "../types";

export function createAutocompleteArgumentsProvider(formulaName: string, args: ArgDefinition[]) {
  for (let i = 0; i < args.length; i++) {
    const proposalValues = args[i].proposalValues;
    if (proposalValues === undefined || proposalValues.length === 0) {
      continue;
    }

    const getProposals = (tokenAtCursor: EnrichedToken) => {
      const functionContext = tokenAtCursor.functionContext;
      if (
        !functionContext ||
        functionContext.parent.toUpperCase() !== formulaName.toUpperCase() ||
        functionContext.argPosition !== i
      ) {
        return;
      }

      const proposals: AutoCompleteProposal[] = [];
      let text = "";
      for (const { value, label } of proposalValues) {
        switch (typeof value) {
          case "string":
            text = `"${value}"`;
            break;
          case "number":
            text = value.toString();
            break;
          case "boolean":
            text = value ? "TRUE" : "FALSE";
            break;
          default:
        }

        proposals.push({
          text,
          description: label,
          htmlContent: [
            {
              value: text,
              color: typeof value === "string" ? tokenColors.STRING : tokenColors.NUMBER,
            },
          ],
          fuzzySearchKey: text,
          alwaysExpanded: true,
        });
      }

      return proposals;
    };

    autoCompleteProviders.add(`${formulaName}_function_${args[i].name}_argument_proposals`, {
      sequence: 50,
      autoSelectFirstProposal: true,
      selectProposal: insertTokenAtArgStartingPosition,
      getProposals,
    });
  }
}

/**
 * Perform the autocomplete of the composer by inserting the value
 * at the cursor position, replacing the current token if necessary.
 * Must be bound to the autocomplete provider.
 */
export function insertTokenAtArgStartingPosition(
  this: { composer: CellComposerStore },
  tokenAtCursor: EnrichedToken,
  proposal: AutoCompleteProposal
) {
  let start = tokenAtCursor.end;
  const end = tokenAtCursor.end;
  if (!["LEFT_PAREN", "ARG_SEPARATOR"].includes(tokenAtCursor.type)) {
    // replace the whole token
    start = tokenAtCursor.start;
  }
  this.composer.stopComposerRangeSelection();
  this.composer.changeComposerCursorSelection(start, end);
  this.composer.replaceComposerCursorSelection(proposal.text);
}

import { functionRegistry } from "@odoo/o-spreadsheet-engine/functions/function_registry";
functionRegistry.getAll().forEach((x) => createAutocompleteArgumentsProvider(x.name, x.args));
