import { includesAll, range } from "../../helpers/misc";
import { Command, CommandResult } from "../../types/commands";
import { Dimension, HeaderGroup, HeaderIndex, UID } from "../../types/misc";
import { CorePlugin } from "../core_plugin";
import { HeaderGroupingPlugin } from "./header_grouping";
import { HeaderVisibilityPlugin } from "./header_visibility";

export class HeaderGlobalVisibilityPlugin extends CorePlugin<
  any,
  typeof HeaderGlobalVisibilityPlugin
> {
  static readonly dependencies = [HeaderGroupingPlugin, HeaderVisibilityPlugin] as const;
  static getters = [
    "checkElementsIncludeAllVisibleHeaders",
    "isHeaderHiddenByUser",
    "isRowHiddenByUser",
    "isColHiddenByUser",
    "getVisibleGroupLayers",
  ] as const;

  allowDispatch(cmd: Command) {
    switch (cmd.type) {
      case "REMOVE_COLUMNS_ROWS":
        if (!this.getters.tryGetSheet(cmd.sheetId)) {
          return CommandResult.InvalidSheetId;
        }
        if (this.checkElementsIncludeAllVisibleHeaders(cmd.sheetId, cmd.dimension, cmd.elements)) {
          return CommandResult.NotEnoughElements;
        }
        return CommandResult.Success;

      case "UNFOLD_HEADER_GROUP":
      case "FOLD_HEADER_GROUP":
        if (!this.getters.tryGetSheet(cmd.sheetId)) {
          return CommandResult.InvalidSheetId;
        }
        const group = this.findGroupWithStartEnd(cmd.sheetId, cmd.dimension, cmd.start, cmd.end);
        if (!group) {
          return CommandResult.UnknownHeaderGroup;
        }

        const numberOfHeaders = this.getters.getNumberHeaders(cmd.sheetId, cmd.dimension);
        const willHideAllHeaders = range(0, numberOfHeaders).every(
          (i) =>
            (i >= group.start && i <= group.end) ||
            this.isHeaderHiddenByUser(cmd.sheetId, cmd.dimension, i)
        );
        if (willHideAllHeaders) {
          return CommandResult.NotEnoughElements;
        }

        break;
    }
    return CommandResult.Success;
  }

  /**
   * Get all the groups of a sheet in a dimension, and return an array of layers of those groups,
   * excluding the groups that are totally hidden.
   */
  getVisibleGroupLayers(sheetId: UID, dimension: Dimension): HeaderGroup[][] {
    const layers: HeaderGroup[][] = this.getters.getGroupsLayers(sheetId, dimension);

    for (const layer of layers) {
      for (let k = layer.length - 1; k >= 0; k--) {
        const group = layer[k];
        if (group.start === 0) {
          continue;
        }
        const headersInGroup = range(group.start - 1, group.end + 1);
        if (headersInGroup.every((i) => this.getters.isHeaderHiddenByUser(sheetId, dimension, i))) {
          layer.splice(k, 1);
        }
      }
    }

    return layers.filter((layer) => layer.length > 0);
  }

  private findGroupWithStartEnd(
    sheetId: UID,
    dimension: Dimension,
    start: HeaderIndex,
    end: HeaderIndex
  ): HeaderGroup | undefined {
    return this.getters
      .getHeaderGroups(sheetId, dimension)
      .find((group) => group.start === start && group.end === end);
  }

  checkElementsIncludeAllVisibleHeaders(
    sheetId: UID,
    dimension: Dimension,
    elements: HeaderIndex[]
  ): boolean {
    const visibleHeaders = this.getAllVisibleHeaders(sheetId, dimension);
    return includesAll(elements, visibleHeaders);
  }

  isHeaderHiddenByUser(sheetId: UID, dimension: Dimension, index: HeaderIndex): boolean {
    return dimension === "COL"
      ? this.isColHiddenByUser(sheetId, index)
      : this.isRowHiddenByUser(sheetId, index);
  }

  isRowHiddenByUser(sheetId: UID, index: HeaderIndex): boolean {
    return (
      this.getters.isRowExplicitlyHidden(sheetId, index) || this.getters.isRowFolded(sheetId, index)
    );
  }

  isColHiddenByUser(sheetId: UID, index: HeaderIndex): boolean {
    return (
      this.getters.isColExplicitlyHidden(sheetId, index) || this.getters.isColFolded(sheetId, index)
    );
  }

  private getAllVisibleHeaders(sheetId: UID, dimension: Dimension): HeaderIndex[] {
    const headers: HeaderIndex[] = range(0, this.getters.getNumberHeaders(sheetId, dimension));

    const foldedHeaders: HeaderIndex[] = [];
    this.getters.getHeaderGroups(sheetId, dimension).forEach((group) => {
      if (group.isFolded) {
        foldedHeaders.push(...range(group.start, group.end + 1));
      }
    });

    return headers.filter((i) => {
      const isExplicitlyHidden =
        dimension === "COL"
          ? this.getters.isColExplicitlyHidden(sheetId, i)
          : this.getters.isRowExplicitlyHidden(sheetId, i);
      return !isExplicitlyHidden && !foldedHeaders.includes(i);
    });
  }
}
