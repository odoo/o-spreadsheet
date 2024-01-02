import {
  deepCopy,
  getAddHeaderStartIndex,
  isConsecutive,
  moveHeaderIndexesOnHeaderAddition,
  moveHeaderIndexesOnHeaderDeletion,
  range,
} from "../../helpers";
import { CommandResult, CoreCommand, ExcelWorkbookData, UID, WorkbookData } from "../../types";
import { getSheetDataHeader } from "../../xlsx/helpers/misc";
import { Dimension, HeaderGroup, HeaderIndex, Zone } from "./../../types/misc";
import { CorePlugin } from "./../core_plugin";

interface State {
  groups: Record<UID, Record<Dimension, HeaderGroup[]>>;
}

export class HeaderGroupingPlugin extends CorePlugin<State> {
  static getters = [
    "getHeaderGroups",
    "getGroupsLayers",
    "getVisibleGroupLayers",
    "getHeaderGroup",
    "getHeaderGroupsInZone",
    "isGroupFolded",
    "isRowFolded",
    "isColFolded",
  ] as const;

  private readonly groups: Record<UID, Record<Dimension, HeaderGroup[]>> = {};

  allowDispatch(cmd: CoreCommand): CommandResult {
    switch (cmd.type) {
      case "GROUP_HEADERS": {
        const { start, end } = cmd;
        if (!this.getters.doesHeadersExist(cmd.sheetId, cmd.dimension, [start, end])) {
          return CommandResult.InvalidHeaderGroupStartEnd;
        }
        if (start > end) {
          return CommandResult.InvalidHeaderGroupStartEnd;
        }

        if (this.findGroupWithStartEnd(cmd.sheetId, cmd.dimension, start, end)) {
          return CommandResult.HeaderGroupAlreadyExists;
        }
        break;
      }
      case "UNGROUP_HEADERS": {
        const { start, end } = cmd;
        if (!this.getters.doesHeadersExist(cmd.sheetId, cmd.dimension, [start, end])) {
          return CommandResult.InvalidHeaderGroupStartEnd;
        }
        if (start > end) {
          return CommandResult.InvalidHeaderGroupStartEnd;
        }
        break;
      }
      case "UNFOLD_HEADER_GROUP":
      case "FOLD_HEADER_GROUP":
        const group = this.findGroupWithStartEnd(cmd.sheetId, cmd.dimension, cmd.start, cmd.end);
        if (!group) {
          return CommandResult.UnknownHeaderGroup;
        }

        const numberOfHeaders = this.getters.getNumberHeaders(cmd.sheetId, cmd.dimension);
        const willHideAllHeaders = range(0, numberOfHeaders).every(
          (i) =>
            (i >= group.start && i <= group.end) ||
            this.getters.isHeaderHiddenByUser(cmd.sheetId, cmd.dimension, i)
        );
        if (willHideAllHeaders) {
          return CommandResult.NotEnoughElements;
        }

        break;
    }
    return CommandResult.Success;
  }

  handle(cmd: CoreCommand) {
    switch (cmd.type) {
      case "CREATE_SHEET":
        this.history.update("groups", cmd.sheetId, { ROW: [], COL: [] });
        break;
      case "GROUP_HEADERS":
        this.groupHeaders(cmd.sheetId, cmd.dimension, cmd.start, cmd.end);
        break;
      case "UNGROUP_HEADERS": {
        this.unGroupHeaders(cmd.sheetId, cmd.dimension, cmd.start, cmd.end);
        break;
      }
      case "DUPLICATE_SHEET": {
        const groups = deepCopy(this.groups[cmd.sheetId]);
        this.history.update("groups", cmd.sheetIdTo, groups);
        break;
      }
      case "DELETE_SHEET": {
        const groups = { ...this.groups };
        delete groups[cmd.sheetId];
        this.history.update("groups", groups);
        break;
      }
      case "ADD_COLUMNS_ROWS":
        const addIndex = getAddHeaderStartIndex(cmd.position, cmd.base);
        this.moveGroupsOnHeaderInsertion(cmd.sheetId, cmd.dimension, addIndex, cmd.quantity);
        break;
      case "REMOVE_COLUMNS_ROWS":
        this.moveGroupsOnHeaderDeletion(cmd.sheetId, cmd.dimension, cmd.elements);
        break;
      case "UNFOLD_HEADER_GROUP": {
        const group = this.findGroupWithStartEnd(cmd.sheetId, cmd.dimension, cmd.start, cmd.end);
        if (group) {
          this.unfoldHeaderGroup(cmd.sheetId, cmd.dimension, group);
        }
        break;
      }
      case "FOLD_HEADER_GROUP": {
        const group = this.findGroupWithStartEnd(cmd.sheetId, cmd.dimension, cmd.start, cmd.end);
        if (group) {
          this.foldHeaderGroup(cmd.sheetId, cmd.dimension, group);
        }
        break;
      }
      case "UNFOLD_ALL_HEADER_GROUPS": {
        const groups = this.getters.getHeaderGroups(cmd.sheetId, cmd.dimension);
        for (const group of groups) {
          this.unfoldHeaderGroup(cmd.sheetId, cmd.dimension, group);
        }
        break;
      }
      case "FOLD_ALL_HEADER_GROUPS": {
        const groups = this.getters.getHeaderGroups(cmd.sheetId, cmd.dimension);
        for (const group of groups) {
          this.foldHeaderGroup(cmd.sheetId, cmd.dimension, group);
        }
        break;
      }
      case "FOLD_HEADER_GROUPS_IN_ZONE":
      case "UNFOLD_HEADER_GROUPS_IN_ZONE": {
        const action = cmd.type === "UNFOLD_HEADER_GROUPS_IN_ZONE" ? "unfold" : "fold";
        const layers = this.getGroupsLayers(cmd.sheetId, cmd.dimension);
        if (action === "fold") {
          layers.reverse();
        }
        const groups = layers.flat();
        const start = cmd.dimension === "ROW" ? cmd.zone.top : cmd.zone.left;
        const end = cmd.dimension === "ROW" ? cmd.zone.bottom : cmd.zone.right;

        const groupsToToggle = new Set<HeaderGroup>();
        for (let header = start; header <= end; header++) {
          const matchedGroups = groups.filter((g) => g.start - 1 <= header && header <= g.end); // -1 to include the group header
          for (const group of matchedGroups) {
            if ((action === "fold" && group.isFolded) || (action === "unfold" && !group.isFolded)) {
              continue;
            }
            groupsToToggle.add(group);
            break;
          }
        }

        for (const group of groupsToToggle) {
          if (action === "unfold") {
            this.unfoldHeaderGroup(cmd.sheetId, cmd.dimension, group);
          } else {
            this.foldHeaderGroup(cmd.sheetId, cmd.dimension, group);
          }
        }
        break;
      }
    }
  }

  getHeaderGroups(sheetId: UID, dim: Dimension): HeaderGroup[] {
    return this.groups[sheetId][dim];
  }

  getHeaderGroup(
    sheetId: UID,
    dim: Dimension,
    start: number,
    end: number
  ): HeaderGroup | undefined {
    return this.getHeaderGroups(sheetId, dim).find(
      (group) => group.start === start && group.end === end
    );
  }

  getHeaderGroupsInZone(sheetId: UID, dim: Dimension, zone: Zone): HeaderGroup[] {
    return this.getHeaderGroups(sheetId, dim).filter((group) => {
      const start = dim === "ROW" ? zone.top : zone.left;
      const end = dim === "ROW" ? zone.bottom : zone.right;
      return this.doGroupOverlap(group, start, end);
    });
  }

  /**
   * Get all the groups of a sheet in a dimension, and return an array of layers of those groups.
   *
   * The layering rules are:
   * 1) A group containing another group should be on a layer above the group it contains
   * 2) The widest/highest groups should be on the left/top layer compared to the groups it contains
   * 3) The group should be on the left/top-most layer possible, barring intersections with other groups (see rules 1 and 2)
   */
  getGroupsLayers(sheetId: UID, dimension: Dimension): HeaderGroup[][] {
    const groups = this.getHeaderGroups(sheetId, dimension);
    return this.bricksFallingAlgorithm(groups, 0, 0);
  }

  /**
   * Get all the groups of a sheet in a dimension, and return an array of layers of those groups,
   * excluding the groups that are totally hidden.
   */
  getVisibleGroupLayers(sheetId: UID, dimension: Dimension): HeaderGroup[][] {
    const layers: HeaderGroup[][] = this.getGroupsLayers(sheetId, dimension);

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

  isGroupFolded(sheetId: UID, dimension: Dimension, start: number, end: number): boolean {
    return this.getHeaderGroup(sheetId, dimension, start, end)?.isFolded || false;
  }

  isRowFolded(sheetId: UID, row: HeaderIndex) {
    const groups = this.getters.getHeaderGroups(sheetId, "ROW");
    return groups.some((group) => group.start <= row && row <= group.end && group.isFolded);
  }

  isColFolded(sheetId: UID, col: HeaderIndex) {
    const groups = this.getters.getHeaderGroups(sheetId, "COL");
    // might become a performance issue if there are a lot of groups (this is called by isColHidden).
    return groups.some((group) => group.start <= col && col <= group.end && group.isFolded);
  }

  private getGroupId(group: HeaderGroup) {
    return `${group.start}-${group.end}}`;
  }

  /**
   * To get layers of groups, and to add/remove headers from groups, we can see each header of a group as a brick. Each
   * brick falls down in the pile corresponding to its header, until it hits another brick, or the ground.
   *
   * With this abstraction, we can very simply group/ungroup headers from groups, and get the layers of groups.
   * - grouping headers is done by adding a brick to each header pile
   * - un-grouping headers is done by removing a brick from each header pile
   * - getting the layers of groups is done by simply letting the brick fall and checking the result
   *
   * Example:
   * We have 2 groups ([A=>E] and [C=>D]), and we want to group headers [C=>F]
   *
   * Headers :                 A B C D E F G          A B C D E F G            A B C D E F G
   * Headers to group: [C=>D]:     _ _         [C=>F]:    _ _ _ _
   *                               | |           ==>      | | | |       ==>                    ==> Result: 3 groups
   *                               | |                    ˅ ˅ | |                  _ _                - [C=>D]
   * Groups:                       ˅ ˅                    _ _ ˅ |                  _ _ _              - [C=>E]
   * Groups:                   _ _ _ _ _              _ _ _ _ _ ˅              _ _ _ _ _ _            - [A=>F]

   * @param groups
   * @param start start of the range where to add/remove headers
   * @param end end of the range where to add/remove headers
   * @param delta -1: remove headers, 1: add headers, 0: get layers (don't add/remove anything)
   */
  private bricksFallingAlgorithm(
    groups: HeaderGroup[],
    start: number,
    end: number,
    delta = 0
  ): HeaderGroup[][] {
    const isGroupFolded: Record<string, boolean | undefined> = {};
    for (const group of groups) {
      isGroupFolded[this.getGroupId(group)] = group.isFolded;
    }

    /** Number of bricks in each header pile */
    const brickPileSize: Record<number, number> = {};
    for (const group of groups) {
      for (let i = group.start; i <= group.end; i++) {
        brickPileSize[i] = brickPileSize[i] ? brickPileSize[i] + 1 : 1;
      }
    }

    for (let i = start; i <= end; i++) {
      brickPileSize[i] = brickPileSize[i] ? brickPileSize[i] + delta : delta;
    }

    const numberOfLayers = Math.max(...Object.values(brickPileSize), 0);
    const groupLayers: HeaderGroup[][] = Array.from({ length: numberOfLayers }, () => []);
    const maxHeader = Math.max(end, ...groups.map((group) => group.end));
    const minHeader = Math.min(start, ...groups.map((group) => group.start));

    for (let header = minHeader; header <= maxHeader; header++) {
      const pileSize = brickPileSize[header] || 0;
      for (let layer = 0; layer < pileSize; layer++) {
        const currentGroup = groupLayers[layer].at(-1);
        if (currentGroup && isConsecutive([currentGroup.end, header])) {
          currentGroup.end++;
        } else {
          const newGroup = { start: header, end: header };
          groupLayers[layer].push(newGroup);
        }
      }
    }

    for (const layer of groupLayers) {
      for (const group of layer) {
        group.isFolded = isGroupFolded[this.getGroupId(group)];
      }
    }
    return groupLayers;
  }

  private groupHeaders(sheetId: UID, dimension: Dimension, start: HeaderIndex, end: HeaderIndex) {
    const groups = this.getHeaderGroups(sheetId, dimension);
    const newGroups = this.bricksFallingAlgorithm(groups, start, end, +1).flat();
    this.history.update("groups", sheetId, dimension, this.removeDuplicateGroups(newGroups));
  }

  /**
   * Ungroup the given headers. The headers will be taken out of the group they are in. This might split a group into two
   * if the headers were in the middle of a group. If multiple groups contains a header, it will only be taken out of the
   * lowest group in the layering of the groups.
   */
  private unGroupHeaders(sheetId: UID, dimension: Dimension, start: HeaderIndex, end: HeaderIndex) {
    const groups = this.getHeaderGroups(sheetId, dimension);
    const newGroups = this.bricksFallingAlgorithm(groups, start, end, -1).flat();
    this.history.update("groups", sheetId, dimension, this.removeDuplicateGroups(newGroups));
  }

  private moveGroupsOnHeaderInsertion(sheetId: UID, dim: Dimension, index: number, count: number) {
    const groups = this.groups[sheetId][dim];
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      const [start, end] = moveHeaderIndexesOnHeaderAddition(index, count, [
        group.start,
        group.end,
      ]);
      if (start !== group.start || end !== group.end) {
        this.history.update("groups", sheetId, dim, i, { ...group, start, end });
      }
    }
  }

  private moveGroupsOnHeaderDeletion(
    sheetId: UID,
    dimension: Dimension,
    deletedElements: HeaderIndex[]
  ) {
    const groups = this.getHeaderGroups(sheetId, dimension);
    const newGroups: HeaderGroup[] = [];
    for (const group of groups) {
      const headersInGroup = range(group.start, group.end + 1);
      const headersAfterDeletion = moveHeaderIndexesOnHeaderDeletion(
        deletedElements,
        headersInGroup
      );
      if (headersAfterDeletion.length === 0) {
        continue;
      }
      newGroups.push({
        ...group,
        start: Math.min(...headersAfterDeletion),
        end: Math.max(...headersAfterDeletion),
      });
    }

    this.history.update(
      "groups",
      sheetId,
      dimension,
      this.bricksFallingAlgorithm(newGroups, 0, 0).flat()
    );
  }

  private doGroupOverlap(group: HeaderGroup, start: number, end: number): boolean {
    return group.start <= end && group.end >= start;
  }

  private removeDuplicateGroups(groups: HeaderGroup[]): HeaderGroup[] {
    const newGroups: Record<string, HeaderGroup> = {};
    for (const group of groups) {
      newGroups[this.getGroupId(group)] = group;
    }
    return Object.values(newGroups);
  }

  private findGroupWithStartEnd(
    sheetId: UID,
    dimension: Dimension,
    start: HeaderIndex,
    end: HeaderIndex
  ): HeaderGroup | undefined {
    return this.getHeaderGroups(sheetId, dimension).find(
      (group) => group.start === start && group.end === end
    );
  }

  /**
   * Fold the given group, and all the groups starting at the same index that are contained inside the given group.
   */
  private foldHeaderGroup(sheetId: UID, dim: Dimension, groupToFold: HeaderGroup) {
    const index = this.getGroupIndex(sheetId, dim, groupToFold.start, groupToFold.end);
    if (index === undefined) {
      return;
    }
    this.history.update("groups", sheetId, dim, index, "isFolded", true);

    const groups = this.getters.getHeaderGroups(sheetId, dim);
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      if (group.start === groupToFold.start && group.end <= groupToFold.end) {
        this.history.update("groups", sheetId, dim, i, "isFolded", true);
      }
    }
  }

  /**
   * Unfold the given group, and all the groups starting at the same index that contain the given group.
   */
  private unfoldHeaderGroup(sheetId: UID, dim: Dimension, groupToUnfold: HeaderGroup) {
    const index = this.getGroupIndex(sheetId, dim, groupToUnfold.start, groupToUnfold.end);
    if (index === undefined) {
      return;
    }
    this.history.update("groups", sheetId, dim, index, "isFolded", false);

    const groups = this.getters.getHeaderGroups(sheetId, dim);
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      if (group.start === groupToUnfold.start && group.end >= groupToUnfold.end) {
        this.history.update("groups", sheetId, dim, i, "isFolded", false);
      }
    }
  }

  private getGroupIndex(
    sheetId: UID,
    dimension: Dimension,
    start: number,
    end: number
  ): number | undefined {
    const index = this.groups[sheetId][dimension].findIndex(
      (group) => group.start === start && group.end === end
    );
    return index === -1 ? undefined : index;
  }

  import(data: WorkbookData) {
    for (const sheet of data.sheets) {
      this.groups[sheet.id] = { ROW: [], COL: [] };
      if (!sheet.headerGroups) {
        continue;
      }

      for (const dim of ["ROW", "COL"] as const) {
        for (const groupData of sheet.headerGroups[dim] || []) {
          this.groups[sheet.id][dim].push({ ...groupData });
        }
      }
    }
  }

  export(data: WorkbookData) {
    for (const sheet of data.sheets) {
      sheet.headerGroups = this.groups[sheet.id];
    }
  }

  exportForExcel(data: ExcelWorkbookData) {
    /**
     * Example of header groups in the XLSX file:
     *
     * 0. |        <row index="1" outlineLevel="1">
     * 1. | |      <row index="2" outlineLevel="2">
     * 2. | |      <row index="3" outlineLevel="2">
     * 3. | |_     <row index="4" outlineLevel="2">
     * 4. |_       <row index="5" outlineLevel="1" collapsed="0">
     * 5.          <row index="6" collapsed="0">
     *
     * The collapsed flag can be on the header before or after the group (or can be missing). Default is after.
     */
    for (const sheet of data.sheets) {
      for (const dim of ["ROW", "COL"] as const) {
        const layers = this.getGroupsLayers(sheet.id, dim);

        for (let layerIndex = 0; layerIndex < layers.length; layerIndex++) {
          const layer = layers[layerIndex];

          for (const group of layer) {
            for (let headerIndex = group.start; headerIndex <= group.end; headerIndex++) {
              const header = getSheetDataHeader(sheet, dim, headerIndex);
              header.outlineLevel = layerIndex + 1;
              if (group.isFolded) {
                header.isHidden = true;
              }
            }
            if (group.isFolded) {
              const header = getSheetDataHeader(sheet, dim, group.end + 1);
              header.collapsed = true;
            }
          }
        }
      }
    }
  }
}
