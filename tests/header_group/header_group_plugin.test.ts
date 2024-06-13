import { CommandResult, Model } from "../../src";
import { UID } from "../../src/types";
import { Dimension, HeaderIndex } from "../../src/types/misc";
import {
  addColumns,
  addRows,
  deleteColumns,
  deleteHeaders,
  deleteRows,
  duplicateSheet,
  foldAllHeaderGroups,
  foldHeaderGroup,
  foldHeaderGroupsInZone,
  groupColumns,
  groupHeaders,
  groupRows,
  redo,
  undo,
  unfoldAllHeaderGroups,
  unfoldHeaderGroup,
  unfoldHeaderGroupsInZone,
  ungroupHeaders,
} from "../test_helpers/commands_helpers";

function getSortedGroups(model: Model, sheetId: UID, dimension: Dimension) {
  return model.getters
    .getHeaderGroups(sheetId, dimension)
    .sort((a, b) => a.end - b.end)
    .sort((a, b) => a.start - b.start);
}

describe("Header grouping plugin", () => {
  let model: Model;
  let sheetId: UID;

  beforeEach(() => {
    model = Model.BuildSync();
    sheetId = model.getters.getActiveSheetId();
  });

  describe.each(["COL", "ROW"] as const)("allowDispatch results for %s", (dimension) => {
    test("Cannot group invalid header indexes", () => {
      let result = groupHeaders(model, dimension, -1, 0);
      expect(result).toBeCancelledBecause(CommandResult.InvalidHeaderGroupStartEnd);

      const numberHeaders = model.getters.getNumberHeaders(sheetId, dimension);
      result = groupHeaders(model, dimension, 0, numberHeaders + 1);
      expect(result).toBeCancelledBecause(CommandResult.InvalidHeaderGroupStartEnd);

      result = groupHeaders(model, dimension, 5, 0);
      expect(result).toBeCancelledBecause(CommandResult.InvalidHeaderGroupStartEnd);
    });

    test("Cannot create a duplicate group", () => {
      groupHeaders(model, dimension, 0, 2);

      const result = groupHeaders(model, dimension, 0, 2);
      expect(result).toBeCancelledBecause(CommandResult.HeaderGroupAlreadyExists);
    });

    test("Cannot ungroup with invalid header indexes", () => {
      let result = ungroupHeaders(model, dimension, -1, 0);
      expect(result).toBeCancelledBecause(CommandResult.InvalidHeaderGroupStartEnd);

      const numberHeaders = model.getters.getNumberHeaders(sheetId, dimension);
      result = ungroupHeaders(model, dimension, 0, numberHeaders + 1);
      expect(result).toBeCancelledBecause(CommandResult.InvalidHeaderGroupStartEnd);

      result = ungroupHeaders(model, dimension, 5, 0);
      expect(result).toBeCancelledBecause(CommandResult.InvalidHeaderGroupStartEnd);
    });

    test("Cannot remove group with invalid header indexes", () => {
      let result = model.dispatch("UNGROUP_HEADERS", { sheetId, dimension, start: -1, end: 5 });
      expect(result).toBeCancelledBecause(CommandResult.InvalidHeaderGroupStartEnd);

      const numberHeaders = model.getters.getNumberHeaders(sheetId, dimension);
      result = model.dispatch("UNGROUP_HEADERS", {
        sheetId,
        dimension,
        start: 0,
        end: numberHeaders + 1,
      });
      expect(result).toBeCancelledBecause(CommandResult.InvalidHeaderGroupStartEnd);

      result = model.dispatch("UNGROUP_HEADERS", { sheetId, dimension, start: 5, end: 0 });
      expect(result).toBeCancelledBecause(CommandResult.InvalidHeaderGroupStartEnd);
    });

    test("Cannot toggle unknown group", () => {
      const cmdParams = { sheetId, dimension, start: 0, end: 1 };
      let result = model.dispatch("UNFOLD_HEADER_GROUP", cmdParams);
      expect(result).toBeCancelledBecause(CommandResult.UnknownHeaderGroup);

      result = model.dispatch("FOLD_HEADER_GROUP", cmdParams);
      expect(result).toBeCancelledBecause(CommandResult.UnknownHeaderGroup);
    });

    test("Cannot hide all the headers", () => {
      const numberOFHeaders = model.getters.getNumberHeaders(sheetId, dimension);
      groupHeaders(model, dimension, 0, numberOFHeaders - 1);

      const result = foldHeaderGroup(model, dimension, 0, numberOFHeaders - 1);
      expect(result).toBeCancelledBecause(CommandResult.NotEnoughElements);
    });

    test("Cannot toggle headers of invalid zone", () => {
      const result = foldHeaderGroupsInZone(model, dimension, "ZZ999:ZZ999");
      expect(result).toBeCancelledBecause(CommandResult.TargetOutOfSheet);
    });
  });

  describe.each(["COL", "ROW"] as const)("tests for %s", (dimension) => {
    describe("Group headers", () => {
      test("Can group headers", () => {
        groupHeaders(model, dimension, 0, 2);
        expect(model.getters.getHeaderGroups(sheetId, dimension)).toEqual([{ start: 0, end: 2 }]);
      });

      test("Simple intersections are avoided when creating groups: test 1", () => {
        /**
         *           0 1 2 3 4 5                      0 1 2 3 4 5
         * Group 1:  ̅ ̅ ̅ ̅ ̅ ̅ ̅ ̅ ̅|       ==> becomes ==>  ̅ ̅ ̅ ̅ ̅ ̅ ̅ ̅ ̅ ̅ ̅|
         * Group 2:     ̅ ̅ ̅ ̅ ̅ ̅ ̅ ̅|                        ̅ ̅ ̅ ̅ ̅ ̅ ̅|
         */
        groupHeaders(model, dimension, 0, 4);
        groupHeaders(model, dimension, 1, 5);
        expect(getSortedGroups(model, sheetId, dimension)).toMatchObject([
          { start: 0, end: 5 },
          { start: 1, end: 4 },
        ]);
      });

      test("Simple intersections are avoided when creating groups: test 2", () => {
        /**
         *             0 1 2 3 4 5                        0 1 2 3 4 5
         * Groups   :       ̅ ̅ ̅ ̅ ̅ ̅|       ==> becomes ==>  ̅ ̅ ̅ ̅ ̅ ̅ ̅ ̅ ̅ ̅ ̅|
         * New group:   ̅ ̅ ̅ ̅ ̅ ̅ ̅ ̅|                              ̅ ̅ ̅ ̅ ̅|
         */
        groupHeaders(model, dimension, 2, 5);
        groupHeaders(model, dimension, 0, 4);
        expect(getSortedGroups(model, sheetId, dimension)).toMatchObject([
          { start: 0, end: 5 },
          { start: 2, end: 4 },
        ]);
      });

      test("Intersections with multiple groups", () => {
        /**
         *             0 1 2 3 4 5 6 7                    0 1 2 3 4 5 6 7
         * Groups   :  ̅ ̅ ̅ ̅ ̅|   ̅ ̅ ̅ ̅ ̅|     ==> becomes ==>  ̅ ̅ ̅ ̅ ̅ ̅ ̅ ̅ ̅ ̅ ̅ ̅ ̅|
         * New group:    ̅ ̅ ̅ ̅ ̅ ̅ ̅ ̅ ̅|                          ̅ ̅ ̅|   ̅ ̅ ̅|
         */
        groupHeaders(model, dimension, 0, 2);
        groupHeaders(model, dimension, 4, 6);
        groupHeaders(model, dimension, 1, 5);

        expect(getSortedGroups(model, sheetId, dimension)).toMatchObject([
          { start: 0, end: 6 },
          { start: 1, end: 2 },
          { start: 4, end: 5 },
        ]);
      });

      test("Duplicated groups are removed", () => {
        groupHeaders(model, dimension, 0, 2);
        groupHeaders(model, dimension, 0, 3);
        ungroupHeaders(model, dimension, 3, 3);
        expect(model.getters.getHeaderGroups(sheetId, dimension)).toEqual([{ start: 0, end: 2 }]);
      });

      describe("Merge contiguous groups", () => {
        test("Adding a group right after another group merge them", () => {
          groupHeaders(model, dimension, 3, 5);
          groupHeaders(model, dimension, 6, 8);

          expect(model.getters.getHeaderGroups(sheetId, dimension)).toMatchObject([
            { start: 3, end: 8 },
          ]);
        });

        test("Adding a group right before another group merge them", () => {
          groupHeaders(model, dimension, 3, 5);
          groupHeaders(model, dimension, 0, 2);

          expect(model.getters.getHeaderGroups(sheetId, dimension)).toMatchObject([
            { start: 0, end: 5 },
          ]);
        });

        test("Adding a group between two groups merge the three of them", () => {
          groupHeaders(model, dimension, 3, 5);
          groupHeaders(model, dimension, 8, 9);
          groupHeaders(model, dimension, 6, 7);

          expect(model.getters.getHeaderGroups(sheetId, dimension)).toMatchObject([
            { start: 3, end: 9 },
          ]);
        });

        test("Deleting the headers between two groups merge them", () => {
          groupHeaders(model, dimension, 3, 5);
          groupHeaders(model, dimension, 8, 9);
          deleteHeaders(model, dimension, [6, 7]);

          expect(model.getters.getHeaderGroups(sheetId, dimension)).toMatchObject([
            { start: 3, end: 7 },
          ]);
        });

        test("Merge groups + intersections handling at the same time", () => {
          /**
           *             0 1 2 3 4 5 6 7                  0 1 2 3 4 5 6 7                        0 1 2 3 4 5 6 7
           * Groups   :  ̅ ̅ ̅ ̅ ̅|   ̅ ̅ ̅ ̅ ̅|     ==> merge ==>  ̅ ̅ ̅ ̅ ̅ ̅ ̅ ̅ ̅ ̅ ̅|      ==> intersection ==>  ̅ ̅ ̅ ̅ ̅ ̅ ̅ ̅ ̅ ̅ ̅ ̅ ̅|
           * New group:        ̅ ̅ ̅ ̅ ̅|                              ̅ ̅ ̅ ̅ ̅|                                  ̅ ̅ ̅|
           */
          groupHeaders(model, dimension, 0, 2);
          groupHeaders(model, dimension, 4, 6);
          groupHeaders(model, dimension, 3, 5);

          expect(getSortedGroups(model, sheetId, dimension)).toMatchObject([
            { start: 0, end: 6 },
            { start: 4, end: 5 },
          ]);
        });
      });

      test("Can undo/redo header grouping", () => {
        groupHeaders(model, dimension, 0, 2);
        groupHeaders(model, dimension, 1, 3);
        expect(getSortedGroups(model, sheetId, dimension)).toMatchObject([
          { start: 0, end: 3 },
          { start: 1, end: 2 },
        ]);

        undo(model);
        expect(getSortedGroups(model, sheetId, dimension)).toMatchObject([{ start: 0, end: 2 }]);

        undo(model);
        expect(getSortedGroups(model, sheetId, dimension)).toMatchObject([]);

        redo(model);
        expect(getSortedGroups(model, sheetId, dimension)).toMatchObject([{ start: 0, end: 2 }]);

        redo(model);
        expect(getSortedGroups(model, sheetId, dimension)).toMatchObject([
          { start: 0, end: 3 },
          { start: 1, end: 2 },
        ]);
      });
    });

    test("Group layers", () => {
      /**
       * The groups cannot be displayed as is in the UI because they can overlap, they need to be separated into
       * different layers.
       *
       * In the ASCII art below, the numbers are the different rows (0-indexed), and the
       * combinations of | and _ are the different groups.
       *
       * The layering rules are:
       * 1) There should be no groups intersecting in a layer
       * 2) The widest/highest groups should be on the left/top layer compared to the groups it intersects with
       * 3) The group should be on the let/top-most layer possible, barring intersections with other groups (see rules 1 and 2)
       *
       * Test case 1: simple group nesting   # Test case 2: groups go to the rightmost layer
       *                                     #
       * 0. | | |                            # 0. | | |
       * 1. | | |_                           # 1. | | |_
       * 2. | |                              # 2. | |_
       * 3. | |_                             # 3. |_
       * 4. |                                # 4.
       * 5. | |                              # 5. | |
       * 6. | |                              # 6. | |_
       * 7. | |_                             # 7. |_
       * 8. |_                               # 8.
       * 9.                                  # 9. |
       * 10.                                 # 10.|_
       */

      // Test case 1: simple group nesting
      groupHeaders(model, dimension, 0, 8);
      groupHeaders(model, dimension, 0, 3);
      groupHeaders(model, dimension, 0, 2);
      groupHeaders(model, dimension, 5, 7);
      // prettier-ignore
      expect(model.getters.getGroupsLayers(sheetId, dimension)).toMatchObject([
        [{ start: 0, end: 8 }],
        [{ start: 0, end: 3 },{ start: 5, end: 7 }],
        [{ start: 0, end: 2 } ],
      ]);

      // Test case 2: groups go to the rightmost layer
      model = Model.BuildSync();
      groupHeaders(model, dimension, 0, 1);
      groupHeaders(model, dimension, 0, 2);
      groupHeaders(model, dimension, 0, 3);
      groupHeaders(model, dimension, 5, 7);
      groupHeaders(model, dimension, 5, 6);
      groupHeaders(model, dimension, 9, 10);
      // prettier-ignore
      expect(model.getters.getGroupsLayers(sheetId, dimension)).toMatchObject([
          [{ start: 0, end: 3 }, { start: 5, end: 7 }, { start: 9, end: 10 }],
          [{ start: 0, end: 2 }, { start: 5, end: 6 }],
          [{ start: 0, end: 1 }],
      ]);
    });

    describe("ungroup range of headers", () => {
      test("ungroup all the headers of the group", () => {
        groupHeaders(model, dimension, 0, 2);
        expect(model.getters.getHeaderGroups(sheetId, dimension)).toHaveLength(1);
        ungroupHeaders(model, dimension, 0, 2);
        expect(model.getters.getHeaderGroups(sheetId, dimension)).toHaveLength(0);
      });

      test("ungroup headers at the start of the group", () => {
        groupHeaders(model, dimension, 0, 2);
        ungroupHeaders(model, dimension, 0, 0);
        expect(model.getters.getHeaderGroups(sheetId, dimension)).toMatchObject([
          { start: 1, end: 2 },
        ]);
      });

      test("ungroup headers at the end of the group", () => {
        groupHeaders(model, dimension, 0, 2);
        ungroupHeaders(model, dimension, 2, 2);
        expect(model.getters.getHeaderGroups(sheetId, dimension)).toMatchObject([
          { start: 0, end: 1 },
        ]);
      });

      test("ungroup headers in the middle of the group", () => {
        groupHeaders(model, dimension, 0, 2);
        ungroupHeaders(model, dimension, 1, 1);
        expect(model.getters.getHeaderGroups(sheetId, dimension)).toMatchObject([
          { start: 0, end: 0 },
          { start: 2, end: 2 },
        ]);
      });

      test("ungrouping headers only remove them from the lowest groups in the layers", () => {
        groupHeaders(model, dimension, 0, 5);
        groupHeaders(model, dimension, 0, 2);

        ungroupHeaders(model, dimension, 2, 2);
        expect(model.getters.getHeaderGroups(sheetId, dimension)).toMatchObject([
          { start: 0, end: 5 },
          { start: 0, end: 1 },
        ]);
      });

      test("Ungroup headers across multiple groups", () => {
        groupHeaders(model, dimension, 0, 2);
        groupHeaders(model, dimension, 4, 6);
        groupHeaders(model, dimension, 0, 8);

        ungroupHeaders(model, dimension, 1, 4);
        expect(getSortedGroups(model, sheetId, dimension)).toMatchObject([
          { start: 0, end: 0 },
          { start: 0, end: 2 },
          { start: 4, end: 8 },
          { start: 5, end: 6 },
        ]);
      });

      test("Can undo/redo header un-grouping", () => {
        groupHeaders(model, dimension, 0, 2);
        groupHeaders(model, dimension, 0, 5);
        ungroupHeaders(model, dimension, 2, 3);
        expect(getSortedGroups(model, sheetId, dimension)).toMatchObject([
          { start: 0, end: 1 },
          { start: 0, end: 2 },
          { start: 4, end: 5 },
        ]);

        undo(model);
        expect(getSortedGroups(model, sheetId, dimension)).toMatchObject([
          { start: 0, end: 2 },
          { start: 0, end: 5 },
        ]);

        redo(model);
        expect(getSortedGroups(model, sheetId, dimension)).toMatchObject([
          { start: 0, end: 1 },
          { start: 0, end: 2 },
          { start: 4, end: 5 },
        ]);
      });
    });

    describe("Remove specific group", () => {
      test("Remove a row/column group", () => {
        groupHeaders(model, dimension, 0, 2);
        expect(model.getters.getHeaderGroup(sheetId, dimension, 0, 2)).toBeTruthy();

        ungroupHeaders(model, dimension, 0, 2);
        expect(model.getters.getHeaderGroup(sheetId, dimension, 0, 2)).toBeFalsy();
      });

      test("Can undo/redo header group removing", () => {
        groupHeaders(model, dimension, 0, 2);
        ungroupHeaders(model, dimension, 0, 2);
        expect(model.getters.getHeaderGroup(sheetId, dimension, 0, 2)).toBeFalsy();

        undo(model);
        expect(model.getters.getHeaderGroup(sheetId, dimension, 0, 2)).toBeTruthy();

        redo(model);
        expect(model.getters.getHeaderGroup(sheetId, dimension, 0, 2)).toBeFalsy();
      });
    });

    test("Groups are duplicated on sheet duplication", () => {
      groupHeaders(model, dimension, 0, 2);
      duplicateSheet(model, sheetId, "sheet2");
      expect(model.getters.getHeaderGroups("sheet2", dimension)).toEqual([{ start: 0, end: 2 }]);
    });
  });

  describe.each(["COL", "ROW"] as const)("Group folding/unfolding", (dimension) => {
    function isHeaderFolded(index: HeaderIndex) {
      return dimension === "COL"
        ? model.getters.isColFolded(sheetId, index)
        : model.getters.isRowFolded(sheetId, index);
    }

    test("Can toggle a group", () => {
      groupHeaders(model, dimension, 0, 1);

      foldHeaderGroup(model, dimension, 0, 1);
      expect(model.getters.isGroupFolded(sheetId, dimension, 0, 1)).toBe(true);
      expect(isHeaderFolded(0)).toBe(true);
      expect(model.getters.isHeaderHidden(sheetId, dimension, 0)).toBe(true);
      expect(isHeaderFolded(1)).toBe(true);
      expect(model.getters.isHeaderHidden(sheetId, dimension, 0)).toBe(true);

      unfoldHeaderGroup(model, dimension, 0, 1);
      expect(model.getters.isGroupFolded(sheetId, dimension, 0, 1)).toBe(false);
      expect(isHeaderFolded(0)).toBe(false);
      expect(model.getters.isHeaderHidden(sheetId, dimension, 0)).toBe(false);
      expect(isHeaderFolded(1)).toBe(false);
      expect(model.getters.isHeaderHidden(sheetId, dimension, 0)).toBe(false);
    });

    test("Groups starting at the same index and inside the group are folded alongside it", () => {
      groupHeaders(model, dimension, 0, 9);
      groupHeaders(model, dimension, 0, 5);
      groupHeaders(model, dimension, 0, 3);

      foldHeaderGroup(model, dimension, 0, 5);
      expect(model.getters.isGroupFolded(sheetId, dimension, 0, 9)).toBe(false);
      expect(model.getters.isGroupFolded(sheetId, dimension, 0, 5)).toBe(true);
      expect(model.getters.isGroupFolded(sheetId, dimension, 0, 3)).toBe(true);
    });

    test("Groups starting at the same index and containing the group are unfolded alongside it", () => {
      groupHeaders(model, dimension, 0, 9);
      groupHeaders(model, dimension, 0, 5);
      groupHeaders(model, dimension, 0, 3);

      foldHeaderGroup(model, dimension, 0, 9);
      expect(model.getters.isGroupFolded(sheetId, dimension, 0, 9)).toBe(true);
      expect(model.getters.isGroupFolded(sheetId, dimension, 0, 5)).toBe(true);
      expect(model.getters.isGroupFolded(sheetId, dimension, 0, 3)).toBe(true);

      unfoldHeaderGroup(model, dimension, 0, 5);
      expect(model.getters.isGroupFolded(sheetId, dimension, 0, 9)).toBe(false);
      expect(model.getters.isGroupFolded(sheetId, dimension, 0, 5)).toBe(false);
      expect(model.getters.isGroupFolded(sheetId, dimension, 0, 3)).toBe(true);
    });

    test("Can fold/unfold all groups", () => {
      groupHeaders(model, dimension, 0, 1);
      groupHeaders(model, dimension, 3, 4);

      foldAllHeaderGroups(model, dimension);
      expect(model.getters.isGroupFolded(sheetId, dimension, 0, 1)).toBe(true);
      expect(model.getters.isGroupFolded(sheetId, dimension, 3, 4)).toBe(true);

      unfoldAllHeaderGroups(model, dimension);
      expect(model.getters.isGroupFolded(sheetId, dimension, 0, 1)).toBe(false);
      expect(model.getters.isGroupFolded(sheetId, dimension, 3, 4)).toBe(false);
    });

    test("Can fold/unfold all of the groups in a zone", () => {
      groupHeaders(model, dimension, 0, 1);
      groupHeaders(model, dimension, 3, 4);
      groupHeaders(model, dimension, 6, 8);

      foldHeaderGroupsInZone(model, dimension, "A1:D4");
      expect(model.getters.isGroupFolded(sheetId, dimension, 0, 1)).toBe(true);
      expect(model.getters.isGroupFolded(sheetId, dimension, 3, 4)).toBe(true);
      expect(model.getters.isGroupFolded(sheetId, dimension, 6, 8)).toBe(false);

      unfoldHeaderGroupsInZone(model, dimension, "A1:D4");
      expect(model.getters.isGroupFolded(sheetId, dimension, 0, 1)).toBe(false);
      expect(model.getters.isGroupFolded(sheetId, dimension, 3, 4)).toBe(false);
      expect(model.getters.isGroupFolded(sheetId, dimension, 6, 8)).toBe(false);
    });

    test("Nested groups: groups are folded/unfolded one at a time", () => {
      groupHeaders(model, dimension, 1, 5);
      groupHeaders(model, dimension, 1, 2);

      foldHeaderGroupsInZone(model, dimension, "A1:A1");
      expect(model.getters.isGroupFolded(sheetId, dimension, 1, 5)).toBe(false);
      expect(model.getters.isGroupFolded(sheetId, dimension, 1, 2)).toBe(true);

      foldHeaderGroupsInZone(model, dimension, "A1:A1");
      expect(model.getters.isGroupFolded(sheetId, dimension, 1, 5)).toBe(true);
      expect(model.getters.isGroupFolded(sheetId, dimension, 1, 2)).toBe(true);

      unfoldHeaderGroupsInZone(model, dimension, "A1:A1");
      expect(model.getters.isGroupFolded(sheetId, dimension, 1, 5)).toBe(false);
      expect(model.getters.isGroupFolded(sheetId, dimension, 1, 2)).toBe(true);

      unfoldHeaderGroupsInZone(model, dimension, "A1:A1");
      expect(model.getters.isGroupFolded(sheetId, dimension, 1, 5)).toBe(false);
      expect(model.getters.isGroupFolded(sheetId, dimension, 1, 2)).toBe(false);
    });
  });

  describe("Grid manipulation", () => {
    describe("Add columns", () => {
      test("Before column group", () => {
        groupColumns(model, "B", "D");
        addColumns(model, "before", "A", 2);
        expect(model.getters.getHeaderGroups(sheetId, "COL")).toMatchObject([{ start: 3, end: 5 }]);
      });

      test("Inside column group", () => {
        groupColumns(model, "B", "D");
        addColumns(model, "after", "B", 2);
        expect(model.getters.getHeaderGroups(sheetId, "COL")).toMatchObject([{ start: 1, end: 5 }]);
      });

      test("After column group", () => {
        groupColumns(model, "B", "D");
        addColumns(model, "after", "D", 2);
        expect(model.getters.getHeaderGroups(sheetId, "COL")).toMatchObject([{ start: 1, end: 3 }]);
      });
    });

    describe("Add rows", () => {
      test("Before row group", () => {
        groupRows(model, 1, 3);
        addRows(model, "before", 0, 2);
        expect(model.getters.getHeaderGroups(sheetId, "ROW")).toMatchObject([{ start: 3, end: 5 }]);
      });

      test("Inside row group", () => {
        groupRows(model, 1, 3);
        addRows(model, "after", 1, 2);
        expect(model.getters.getHeaderGroups(sheetId, "ROW")).toMatchObject([{ start: 1, end: 5 }]);
      });

      test("After row group", () => {
        groupRows(model, 1, 3);
        addRows(model, "after", 3, 2);
        expect(model.getters.getHeaderGroups(sheetId, "ROW")).toMatchObject([{ start: 1, end: 3 }]);
      });
    });

    describe("Delete columns", () => {
      test("Before column group", () => {
        groupColumns(model, "B", "D");
        deleteColumns(model, ["A"]);
        expect(model.getters.getHeaderGroups(sheetId, "COL")).toMatchObject([{ start: 0, end: 2 }]);
      });

      test("Some columns of the column group", () => {
        groupColumns(model, "B", "D");
        deleteColumns(model, ["B", "D"]);
        expect(model.getters.getHeaderGroups(sheetId, "COL")).toMatchObject([{ start: 1, end: 1 }]);
      });

      test("All columns of the column group", () => {
        groupColumns(model, "B", "D");
        deleteColumns(model, ["B", "C", "D"]);
        expect(model.getters.getHeaderGroups(sheetId, "COL")).toEqual([]);
      });

      test("After the column group", () => {
        groupColumns(model, "B", "D");
        deleteColumns(model, ["E"]);
        expect(model.getters.getHeaderGroups(sheetId, "COL")).toMatchObject([{ start: 1, end: 3 }]);
      });
    });

    describe("Delete rows", () => {
      test("Before the row group", () => {
        groupRows(model, 1, 3);
        deleteRows(model, [0]);
        expect(model.getters.getHeaderGroups(sheetId, "ROW")).toMatchObject([{ start: 0, end: 2 }]);
      });

      test("Some rows of the row group", () => {
        groupRows(model, 1, 3);
        deleteRows(model, [1, 3]);
        expect(model.getters.getHeaderGroups(sheetId, "ROW")).toMatchObject([{ start: 1, end: 1 }]);
      });

      test("All rows of the row group", () => {
        groupRows(model, 1, 3);
        deleteRows(model, [1, 2, 3]);
        expect(model.getters.getHeaderGroups(sheetId, "ROW")).toEqual([]);
      });

      test("After the row group", () => {
        groupRows(model, 1, 3);
        deleteRows(model, [4]);
        expect(model.getters.getHeaderGroups(sheetId, "ROW")).toMatchObject([{ start: 1, end: 3 }]);
      });
    });
  });

  test("Can export/import header groups", () => {
    groupColumns(model, "A", "C");
    groupRows(model, 0, 2);
    foldHeaderGroup(model, "COL", 0, 2);

    const exported = model.exportData();
    expect(exported.sheets[0].headerGroups).toEqual({
      COL: [{ start: 0, end: 2, isFolded: true }],
      ROW: [{ start: 0, end: 2 }],
    });

    const newModel = Model.BuildSync(exported);
    expect(newModel.getters.getHeaderGroups(sheetId, "COL")).toMatchObject([
      { start: 0, end: 2, isFolded: true },
    ]);
    expect(newModel.getters.getHeaderGroups(sheetId, "ROW")).toMatchObject([{ start: 0, end: 2 }]);
  });
});
