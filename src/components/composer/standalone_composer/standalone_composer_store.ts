import { rangeTokenize } from "../../../formulas";
import { localizeContent } from "../../../helpers/locale";
import { AutoCompleteProviderDefinition } from "../../../registries";
import { Get } from "../../../store_engine";
import { UID } from "../../../types";
import { AbstractComposerStore } from "../composer/abstract_composer_store";

export interface StandaloneComposerArgs {
  onConfirm: (content: string) => void;
  content: string;
  /**
   * the sheet id to which unqualified references (A1 vs Sheet1!A1)
   * will be resolved.
   */
  defaultRangeSheetId: UID;
  contextualAutocomplete?: AutoCompleteProviderDefinition;
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

  protected getComposerContent(): string {
    let content = this._currentContent;
    if (this.editionMode === "inactive") {
      // References in the content might not be linked to the current active sheet
      // We here force the sheet name prefix for all references that are not in
      // the current active sheet
      const defaultRangeSheetId = this.args().defaultRangeSheetId;
      content = rangeTokenize(this.args().content)
        .map((token) => {
          if (token.type === "REFERENCE") {
            const range = this.getters.getRangeFromSheetXC(defaultRangeSheetId, token.value);
            return this.getters.getRangeString(range, this.getters.getActiveSheetId());
          }
          return token.value;
        })
        .join("");
    }

    return localizeContent(content, this.getters.getLocale());
  }

  stopEdition() {
    this._stopEdition();
  }

  protected confirmEdition(content: string) {
    this.args().onConfirm(content);
  }
}
