import { HtmlContent } from "../../components/composer/composer/composer";
import { EnrichedToken } from "../../formulas/composer_tokenizer";
import { CellPosition, Getters } from "../../types";
import { Registry } from "../registry";

export interface AutoCompleteProposal {
  /**
   * Text to auto complete.
   */
  text: string;
  description?: string;
  /**
   * Version of the text but displayed using html to highlight part of it.
   */
  htmlContent?: HtmlContent[];
  /**
   * Key to use for fuzzy search.
   */
  fuzzySearchKey?: string;
  alwaysExpanded?: boolean;
}

export interface AutoCompleteProvider {
  proposals: AutoCompleteProposal[];
  selectProposal(text: string): void;
  autoSelectFirstProposal: boolean;
}

interface ComposerStoreInterface {
  currentEditedCell?: CellPosition;
  changeComposerCursorSelection(start: number, end: number): void;
  replaceComposerCursorSelection(text: string): void;
  setCurrentContent(content: string): void;
  stopEdition(): void;
  currentContent: string;
  currentTokens: EnrichedToken[];
}

/**
 * We declare the providers in the registry as an object (rather than a class)
 * to allow a type-safe way to declare the provider.
 * We still want to be able to use `this` for the getters and dispatch for simplicity.
 * Binding happens at runtime in the edition plugin.
 */
export interface AutoCompleteProviderDefinition {
  sequence?: number;
  autoSelectFirstProposal?: boolean;
  maxDisplayedProposals?: number;
  getProposals(
    this: { composer: ComposerStoreInterface; getters: Getters },
    tokenAtCursor: EnrichedToken,
    content: string
  ): AutoCompleteProposal[] | undefined;
  selectProposal(
    this: { composer: ComposerStoreInterface },
    tokenAtCursor: EnrichedToken,
    text: string
  ): void;
}

export const autoCompleteProviders = new Registry<AutoCompleteProviderDefinition>();
