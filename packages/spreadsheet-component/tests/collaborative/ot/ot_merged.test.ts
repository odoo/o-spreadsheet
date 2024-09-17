import { transform } from "../../../src/collaborative/ot/ot";
import { toZone } from "../../../src/helpers";
import { AddMergeCommand } from "../../../src/types";
import { OT_TESTS_SINGLE_CELL_COMMANDS, TEST_COMMANDS } from "../../test_helpers/constants";
import { target } from "../../test_helpers/helpers";

describe("OT with ADD_MERGE", () => {
  const sheetId = "Sheet1";
  const addMerge: AddMergeCommand = {
    ...TEST_COMMANDS.ADD_MERGE,
    target: target("B2:C3"),
    sheetId,
  };

  describe.each(OT_TESTS_SINGLE_CELL_COMMANDS)("single cell commands", (cmd) => {
    test(`${cmd.type} inside the merge`, () => {
      const command = { ...cmd, sheetId, col: 2, row: 2 };
      const result = transform(command, addMerge);
      expect(result).toBeUndefined();
    });
    test(`${cmd.type} = the top-left of the merge`, () => {
      const command = { ...cmd, sheetId, col: 1, row: 1 };
      const result = transform(command, addMerge);
      expect(result).toEqual(command);
    });
    test(`${cmd.type} outside the merge`, () => {
      const command = { ...cmd, sheetId, col: 10, row: 10 };
      const result = transform(command, addMerge);
      expect(result).toEqual(command);
    });

    test(`${cmd.type} in another sheet`, () => {
      const command = { ...cmd, col: 2, row: 1, sheetId: "42" };
      const result = transform(command, addMerge);
      expect(result).toEqual(command);
    });
  });

  describe.each([
    TEST_COMMANDS.DELETE_CONTENT,
    TEST_COMMANDS.SET_FORMATTING,
    TEST_COMMANDS.CLEAR_FORMATTING,
  ])("target commands", (cmd) => {
    test(`${cmd.type} outside merge`, () => {
      const command = { ...cmd, sheetId, target: [toZone("E1:F2")] };
      const result = transform(command, addMerge);
      expect(result).toEqual(command);
    });
  });

  describe.each([TEST_COMMANDS.ADD_MERGE, TEST_COMMANDS.REMOVE_MERGE])(
    `ADD_MERGE & AddMerge | RemoveMerge`,
    (cmd) => {
      test("two distinct merges", () => {
        const command = { ...cmd, sheetId, target: target("E1:F2") };
        const result = transform(command, addMerge);
        expect(result).toEqual(command);
      });
      test("two overlapping merges", () => {
        const command = { ...cmd, sheetId, target: target("C3:D5") };
        const result = transform(command, addMerge);
        expect(result).toBeUndefined();
      });
      test("two overlapping merges in different sheets", () => {
        const command = { ...cmd, target: target("C3:D5"), sheetId: "another sheet" };
        const result = transform(command, addMerge);
        expect(result).toEqual(command);
      });
    }
  );
});
