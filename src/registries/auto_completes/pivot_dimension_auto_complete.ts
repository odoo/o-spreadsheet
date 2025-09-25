import { PIVOT_TOKEN_COLOR } from "../../constants";
import { getCanonicalSymbolName } from "../../helpers";
import { PivotRuntimeDefinition } from "../../helpers/pivot/pivot_runtime_definition";
import { PivotMeasure } from "../../types";
import { AutoCompleteProviderDefinition } from "./auto_complete_registry";

export function createMeasureAutoComplete(
  pivot: PivotRuntimeDefinition,
  forComputedMeasure: PivotMeasure
): AutoCompleteProviderDefinition {
  return {
    sequence: 0,
    autoSelectFirstProposal: true,
    getProposals(tokenAtCursor) {
      const measureProposals = pivot.measures
        .filter((m) => m !== forComputedMeasure)
        .map((measure) => {
          const text = getCanonicalSymbolName(measure.id);
          return {
            text: text,
            description: measure.displayName,
            htmlContent: [{ value: text, color: PIVOT_TOKEN_COLOR }],
            fuzzySearchKey: measure.displayName + text + measure.fieldName,
          };
        });
      const dimensionsProposals = pivot.rows.concat(pivot.columns).map((dimension) => {
        const text = getCanonicalSymbolName(dimension.nameWithGranularity);
        return {
          text: text,
          description: dimension.displayName,
          htmlContent: [{ value: text, color: PIVOT_TOKEN_COLOR }],
          fuzzySearchKey: dimension.displayName + text + dimension.fieldName,
        };
      });
      return measureProposals.concat(dimensionsProposals);
    },
    selectProposal(tokenAtCursor, value) {
      let start = tokenAtCursor.end;
      if (tokenAtCursor.type === "SYMBOL") {
        start = tokenAtCursor.start;
      }
      const end = tokenAtCursor.end;
      this.composer.changeComposerCursorSelection(start, end);
      this.composer.replaceComposerCursorSelection(value);
    },
  };
}
