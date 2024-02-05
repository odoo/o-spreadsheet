import { getSearchRegex } from "../../helpers";
import { canonicalizeNumberContent } from "../../helpers/locale";
import { SearchOptions } from "../../types/find_and_replace";
import { CellPosition, Command } from "../../types/index";
import { UIPlugin } from "../ui_plugin";

/**
 * Find and Replace Plugin
 *
 * This plugin is used in combination with the find_and_replace sidePanel
 * It is used to 'highlight' cells that match an input string according to
 * the given searchOptions. The second part of this plugin makes it possible
 * (again with the find_and_replace sidePanel), to replace the values that match
 * the search with a new value.
 */

export class FindAndReplacePlugin extends UIPlugin {
  static layers = ["Search"] as const;
  static getters = [] as const;

  handle(cmd: Command) {
    switch (cmd.type) {
      case "REPLACE_SEARCH":
        for (const match of cmd.matches) {
          this.replaceMatch(match, cmd.searchString, cmd.replaceWith, cmd.searchOptions);
        }
        break;
    }
  }

  private replaceMatch(
    selectedMatch: CellPosition,
    searchString: string,
    replaceWith: string,
    searchOptions: SearchOptions
  ) {
    const cell = this.getters.getCell(selectedMatch);
    if (!cell?.content) {
      return;
    }

    if (cell?.isFormula && !searchOptions.searchFormulas) {
      return;
    }

    const searchRegex = getSearchRegex(searchString, searchOptions);
    const replaceRegex = new RegExp(searchRegex.source, searchRegex.flags + "g");
    const toReplace: string | null = this.getters.getCellText(
      selectedMatch,
      searchOptions.searchFormulas
    );
    const content = toReplace.replace(replaceRegex, replaceWith);
    const canonicalContent = canonicalizeNumberContent(content, this.getters.getLocale());
    this.dispatch("UPDATE_CELL", { ...selectedMatch, content: canonicalContent });
  }
}
