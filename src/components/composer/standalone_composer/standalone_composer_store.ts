import { Token, rangeTokenize } from "../../../formulas";
import { EnrichedToken } from "../../../formulas/composer_tokenizer";
import { setXcToFixedReferenceType } from "../../../helpers/reference_type";
import { AutoCompleteProviderDefinition } from "../../../registries";
import { Get } from "../../../store_engine";
import { Color, UID, UnboundedZone, Zone } from "../../../types";
import { AbstractComposerStore } from "../composer/abstract_composer_store";

export interface StandaloneComposerArgs {
  onConfirm: (content: string) => void;
  content: string;
  /**
   * the sheet id to which unqualified references (A1 vs Sheet1!A1)
   * will be resolved.
   */
  defaultStatic?: boolean;
  defaultRangeSheetId: UID;
  contextualAutocomplete?: AutoCompleteProviderDefinition;
  getContextualColoredSymbolToken?: (token: Token) => Color;
}

export class StandaloneComposerStore extends AbstractComposerStore {
  constructor(get: Get, private args: () => StandaloneComposerArgs) {
    super(get);
    this._currentContent = this.getComposerContent();
  }

  protected getAutoCompleteProviders(): AutoCompleteProviderDefinition[] {
    const providersDefinitions = super.getAutoCompleteProviders();
    const contextualAutocomplete = this.args().contextualAutocomplete;
    if (contextualAutocomplete) {
      providersDefinitions.push(contextualAutocomplete);
    }
    return providersDefinitions;
  }

  /**
   * Replace the current reference selected by the new one.
   * */
  protected getZoneReference(zone: Zone | UnboundedZone): string {
    const res = super.getZoneReference(zone);
    if (this.args().defaultStatic) {
      return setXcToFixedReferenceType(res, "colrow");
    }
    return res;
  }

  protected getComposerContent(): string {
    if (this.editionMode === "inactive") {
      // References in the content might not be linked to the current active sheet
      // We here force the sheet name prefix for all references that are not in
      // the current active sheet
      const defaultRangeSheetId = this.args().defaultRangeSheetId;
      return rangeTokenize(this.args().content)
        .map((token) => {
          if (token.type === "REFERENCE") {
            const range = this.getters.getRangeFromSheetXC(defaultRangeSheetId, token.value);
            return this.getters.getRangeString(range, this.getters.getActiveSheetId());
          }
          return token.value;
        })
        .join("");
    }
    return this._currentContent;
  }

  stopEdition() {
    this._stopEdition();
  }

  protected confirmEdition(content: string) {
    this.args().onConfirm(content);
  }

  protected getTokenColor(token: EnrichedToken): string {
    if (token.type === "SYMBOL") {
      const matchedColor = this.args().getContextualColoredSymbolToken?.(token);
      if (matchedColor) {
        return matchedColor;
      }
    }
    return super.getTokenColor(token);
  }
}
