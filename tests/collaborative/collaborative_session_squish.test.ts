import { CoreCommand, Model, RemoteRevisionMessage } from "../../src";
import { CommandSquisher, SquishedCoreCommand } from "../../src/collaborative/command_squisher";
import { toZone } from "../../src/helpers";
import { RemoteRevisionsSquishedMessage } from "../../src/types/collaborative/transport_service";
import { MockTransportService } from "../__mocks__/transport_service";
import {
  addRows,
  autofill,
  deleteRows,
  getCellContent,
  getEvaluatedCell,
  undo,
} from "../test_helpers";
import {
  copy,
  paste,
  pasteFromOSClipboard,
  setCellContent,
  setCellStyle,
  setFormat,
} from "../test_helpers/commands_helpers";
import { setupCollaborativeEnv } from "./collaborative_helpers";

describe("Collaborative session", () => {
  test("Update_cell on same value and contiguous cells", () => {
    const transport = new MockTransportService();
    const model = new Model(
      { sheets: [{ id: "sheet1", name: "Sheet 1", cells: { A1: "Hello" } }] },
      { transportService: transport, client: { id: "alice", name: "Alice" } }
    );
    const spy = jest.spyOn(transport, "sendMessage");

    autofill(model, "A1", "A5");
    expect(spy).toHaveBeenCalledWith({
      clientId: "alice",
      commands: [
        {
          targetRange: "A2:A5",
          sheetId: "sheet1",
          content: "Hello",
          format: "",
          style: null,
          type: "SQUISHED_UPDATE_CELL",
        },
        {
          sheetId: "sheet1",
          target: [toZone("A2:A5")],
          type: "SET_BORDERS_ON_TARGET",
        },
      ],
      nextRevisionId: expect.any(String),
      serverRevisionId: "START_REVISION",
      type: "REMOTE_REVISION",
      version: 1,
    });
  });

  test("pasting OS clipboard text with a blank line does not corrupt cells for other clients", () => {
    const { alice, bob } = setupCollaborativeEnv();
    setFormat(alice, "A1:A100", "0.00%");

    const result = pasteFromOSClipboard(alice, "A1", { text: "=2\n=0\n\n=0\n=0" });
    expect(result.isSuccessful).toBe(true);

    for (const xc of ["A1", "A2", "A3", "A4", "A5"]) {
      expect(getCellContent(bob, xc)).toBe(getCellContent(alice, xc));
    }
  });

  test("pasting OS clipboard text with an inline format does not corrupt following plain values", () => {
    const { alice, bob } = setupCollaborativeEnv();

    const result = pasteFromOSClipboard(alice, "A1", { text: "100%\n2\n3" });
    expect(result.isSuccessful).toBe(true);

    expect(getCellContent(alice, "A1")).toBe("100%");
    expect(getCellContent(alice, "A2")).toBe("2");
    expect(getCellContent(alice, "A3")).toBe("3");
    for (const xc of ["A1", "A2", "A3"]) {
      expect(getCellContent(bob, xc)).toBe(getCellContent(alice, xc));
    }
  });

  test("copy/pasting a range with a blank-but-styled cell does not corrupt a formula chain", () => {
    const { alice, bob } = setupCollaborativeEnv();
    setCellContent(alice, "A1", "=2");
    setCellContent(alice, "A2", "=0");
    setCellStyle(alice, "A3", { bold: true }); // blank but styled
    setCellContent(alice, "A4", "=0");
    setCellContent(alice, "A5", "=0");

    copy(alice, "A1:A5");
    const result = paste(alice, "B1");
    expect(result.isSuccessful).toBe(true);

    for (const xc of ["B1", "B2", "B3", "B4", "B5"]) {
      expect(getCellContent(bob, xc)).toBe(getCellContent(alice, xc));
    }
  });

  test("internal copy/paste (not just OS-clipboard text) mixing percent and plain numbers does not corrupt values", () => {
    const { alice, bob } = setupCollaborativeEnv();
    setCellContent(alice, "A1", "100%");
    setCellContent(alice, "A2", "2");
    setCellContent(alice, "A3", "3");

    copy(alice, "A1:A3");
    const result = paste(alice, "B1");
    expect(result.isSuccessful).toBe(true);

    expect(getCellContent(alice, "B1")).toBe("100%");
    expect(getCellContent(alice, "B2")).toBe("2");
    expect(getCellContent(alice, "B3")).toBe("3");
    for (const xc of ["B1", "B2", "B3"]) {
      expect(getCellContent(bob, xc)).toBe(getCellContent(alice, xc));
    }
  });

  test("autofill across a blank source cell does not corrupt the surrounding formulas", () => {
    const { alice, bob } = setupCollaborativeEnv();
    setCellContent(alice, "A1", "=B1");
    // A2 left blank on purpose
    setCellContent(alice, "A3", "=B3");

    const result = autofill(alice, "A1:A3", "A9");
    expect(result.isSuccessful).toBe(true);

    for (const xc of ["A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8", "A9"]) {
      expect(getCellContent(bob, xc)).toBe(getCellContent(alice, xc));
    }
  });

  test("squish should respect implicit formats", () => {
    const commands: readonly CoreCommand[] = [
      { sheetId: "Sheet1", col: 0, row: 0, content: "100%", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 0, row: 1, content: "2", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 0, row: 2, content: "3", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 0, row: 3, content: "$4", type: "UPDATE_CELL" },
    ]; // mimics a paste from clipboard behavior, requires 3 commands to actually squish
    const result: (CoreCommand | SquishedCoreCommand)[] = [
      { sheetId: "Sheet1", col: 0, row: 0, content: "100%", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 0, row: 1, content: "2", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 0, row: 2, content: "3", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 0, row: 3, content: "$4", type: "UPDATE_CELL" },
    ];
    const model = new Model();
    const squishedCommands = new CommandSquisher(model.getters).squish(commands);
    expect(squishedCommands).toStrictEqual(result);
    expect(new CommandSquisher(model.getters).unsquish(squishedCommands)).toStrictEqual(commands);
    expect(new CommandSquisher(model.getters).unsquish(result)).toStrictEqual(commands);
  });

  test.skip("squish should respect implicit formats hidden behind an explicit format", () => {
    // plain text cells keep the format inlined in their content: "$1" is not
    // converted to the content "1" with a currency format
    const commands: readonly CoreCommand[] = [
      { sheetId: "Sheet1", col: 0, row: 0, content: "$1", format: "@", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 0, row: 1, content: "2", format: "@", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 0, row: 2, content: "3", format: "@", type: "UPDATE_CELL" },
    ];
    const model = new Model();
    const squishedCommands = new CommandSquisher(model.getters).squish(commands);
    expect(new CommandSquisher(model.getters).unsquish(squishedCommands)).toStrictEqual(commands);
  });

  test("squish contents sharing the same implicit format", () => {
    const commands: readonly CoreCommand[] = [
      { sheetId: "Sheet1", col: 0, row: 0, content: "$1", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 0, row: 1, content: "$2", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 0, row: 2, content: "$3", type: "UPDATE_CELL" },
    ];
    const result: (CoreCommand | SquishedCoreCommand)[] = [
      { sheetId: "Sheet1", col: 0, row: 0, content: "$1", type: "UPDATE_CELL" },
      {
        sheetId: "Sheet1",
        targetRange: "A2:A3",
        content: { N: "+1" },
        type: "SQUISHED_UPDATE_CELL",
      },
    ];
    const model = new Model();
    const squishedCommands = new CommandSquisher(model.getters).squish(commands);
    expect(squishedCommands).toStrictEqual(result);
    expect(new CommandSquisher(model.getters).unsquish(squishedCommands)).toStrictEqual(commands);
  });

  test("receiving an SQUISHED_UPDATE_CELL message should unsquish", () => {
    const model = new Model(
      { sheets: [{ id: "sheet1", name: "Sheet 1", cells: { A1: "Hello" } }] },
      { transportService: new MockTransportService(), client: { id: "alice", name: "Alice" } },
      [
        {
          clientId: "alice",
          commands: [
            {
              sheetId: "sheet1",
              target: [toZone("A2:A5")],
              type: "SET_BORDERS_ON_TARGET",
              border: undefined,
            },
            {
              targetRange: "A2:A5",
              sheetId: "sheet1",
              content: "Hello",
              format: "",
              style: null,
              type: "SQUISHED_UPDATE_CELL",
            },
          ],
          nextRevisionId: expect.any(String),
          serverRevisionId: "START_REVISION",
          type: "REMOTE_REVISION",
          version: 1,
        },
      ]
    );

    expect(getCellContent(model, "A1")).toBe("Hello");
    expect(getCellContent(model, "A2")).toBe("Hello");
    expect(getCellContent(model, "A3")).toBe("Hello");
    expect(getCellContent(model, "A4")).toBe("Hello");
    expect(getCellContent(model, "A5")).toBe("Hello");
  });

  test("loading previously squished date messages should unsquish them", () => {
    const model = new Model(
      {
        revisionId: "START_REVISION",
        sheets: [{ id: "sheet1", name: "Sheet 1", cells: { A1: "Date" } }],
      },
      { transportService: new MockTransportService(), client: { id: "alice", name: "Alice" } },
      [
        {
          clientId: "bob",
          commands: [
            {
              sheetId: "sheet1",
              col: 0,
              row: 1,
              content: "2026-01-02",
              type: "UPDATE_CELL",
            },
            {
              targetRange: "A3:A4",
              sheetId: "sheet1",
              content: { N: "+1" },
              type: "SQUISHED_UPDATE_CELL",
            },
          ],
          nextRevisionId: "1",
          serverRevisionId: "START_REVISION",
          type: "REMOTE_REVISION",
          version: 1,
        },
      ]
    );

    expect(getCellContent(model, "A1")).toBe("Date");
    expect(getCellContent(model, "A2")).toBe("2026-01-02");
    expect(getCellContent(model, "A3")).toBe("2026-01-03");
    expect(getCellContent(model, "A4")).toBe("2026-01-04");
  });
});

describe("commands", () => {
  test("squish should respect differences in format", () => {
    const commands: readonly CoreCommand[] = [
      {
        sheetId: "Sheet1",
        col: 0,
        row: 0,
        content: "Hello",
        format: "#,##0.00",
        type: "UPDATE_CELL",
      },
      {
        sheetId: "Sheet1",
        col: 0,
        row: 1,
        content: "Hello",
        format: "[$$]#,##0.00",
        type: "UPDATE_CELL",
      },
      {
        sheetId: "Sheet1",
        col: 0,
        row: 2,
        content: "Hello",
        format: "#,##0.00",
        type: "UPDATE_CELL",
      },
    ];
    const model = new Model();
    expect(new CommandSquisher(model.getters).squish(commands)).toStrictEqual(commands);
    expect(new CommandSquisher(model.getters).unsquish(commands)).toStrictEqual(commands);
  });

  test("squish should respect differences in style", () => {
    const commands: readonly CoreCommand[] = [
      {
        sheetId: "Sheet1",
        col: 0,
        row: 0,
        content: "Hello",
        style: { bold: true },
        type: "UPDATE_CELL",
      },
      {
        sheetId: "Sheet1",
        col: 0,
        row: 1,
        content: "Hello",
        style: { italic: true },
        type: "UPDATE_CELL",
      },
      {
        sheetId: "Sheet1",
        col: 0,
        row: 2,
        content: "Hello",
        style: { bold: true },
        type: "UPDATE_CELL",
      },
    ];
    const model = new Model();
    expect(new CommandSquisher(model.getters).squish(commands)).toStrictEqual(commands);
    expect(new CommandSquisher(model.getters).unsquish(commands)).toStrictEqual(commands);
  });

  test("squish consecutive formulas with the same normalized formula", () => {
    const commands: readonly CoreCommand[] = [
      { sheetId: "Sheet1", col: 0, row: 0, content: "=SUM(B1)", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 0, row: 1, content: "=SUM(B2)", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 0, row: 2, content: "=SUM(B3)", type: "UPDATE_CELL" },
    ];
    const result: (CoreCommand | SquishedCoreCommand)[] = [
      { sheetId: "Sheet1", col: 0, row: 0, content: "=SUM(B1)", type: "UPDATE_CELL" },
      {
        sheetId: "Sheet1",
        targetRange: "A2:A3",
        content: { R: "+R1" },
        type: "SQUISHED_UPDATE_CELL",
      },
    ];
    const model = new Model();
    expect(new CommandSquisher(model.getters).squish(commands)).toStrictEqual(result);
    expect(new CommandSquisher(model.getters).unsquish(result)).toStrictEqual(commands);
  });

  test("squish consecutive numbers", () => {
    const commands: readonly CoreCommand[] = [
      { sheetId: "Sheet1", col: 0, row: 0, content: "1", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 0, row: 1, content: "2", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 0, row: 2, content: "3", type: "UPDATE_CELL" },
    ];
    const result: (CoreCommand | SquishedCoreCommand)[] = [
      { sheetId: "Sheet1", col: 0, row: 0, content: "1", type: "UPDATE_CELL" },
      {
        sheetId: "Sheet1",
        targetRange: "A2:A3",
        content: { N: "+1" },
        type: "SQUISHED_UPDATE_CELL",
      },
    ];
    const model = new Model();
    expect(new CommandSquisher(model.getters).squish(commands)).toStrictEqual(result);
    expect(new CommandSquisher(model.getters).unsquish(result)).toStrictEqual(commands);
  });

  test("squish consecutive dates and keep raw literal commands", () => {
    const commands: readonly CoreCommand[] = [
      { sheetId: "Sheet1", col: 0, row: 0, content: "2026-01-02", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 0, row: 1, content: "2026-01-03", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 0, row: 2, content: "2026-01-04", type: "UPDATE_CELL" },
    ];
    const result: (CoreCommand | SquishedCoreCommand)[] = [
      { sheetId: "Sheet1", col: 0, row: 0, content: "2026-01-02", type: "UPDATE_CELL" },
      {
        sheetId: "Sheet1",
        targetRange: "A2:A3",
        content: { N: "+1" },
        type: "SQUISHED_UPDATE_CELL",
      },
    ];
    const model = new Model();
    expect(new CommandSquisher(model.getters).squish(commands)).toStrictEqual(result);
    expect(new CommandSquisher(model.getters).unsquish(result)).toStrictEqual(commands);
  });

  test("squish repeated formatted literals without losing the raw command content", () => {
    const commands: readonly CoreCommand[] = [
      { sheetId: "Sheet1", col: 0, row: 0, content: "$100", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 0, row: 1, content: "$100", type: "UPDATE_CELL" },
    ];
    const result: (CoreCommand | SquishedCoreCommand)[] = [
      {
        sheetId: "Sheet1",
        targetRange: "A1:A2",
        content: "$100",
        type: "SQUISHED_UPDATE_CELL",
      },
    ];
    const model = new Model();
    expect(new CommandSquisher(model.getters).squish(commands)).toStrictEqual(result);
    expect(new CommandSquisher(model.getters).unsquish(result)).toStrictEqual(commands);
  });

  test("squish consecutive formatted literals and rebuild offsets with formatting", () => {
    const commands: readonly CoreCommand[] = [
      { sheetId: "Sheet1", col: 0, row: 0, content: "$100", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 0, row: 1, content: "$101", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 0, row: 2, content: "$102", type: "UPDATE_CELL" },
    ];
    const result: (CoreCommand | SquishedCoreCommand)[] = [
      { sheetId: "Sheet1", col: 0, row: 0, content: "$100", type: "UPDATE_CELL" },
      {
        sheetId: "Sheet1",
        targetRange: "A2:A3",
        content: { N: "+1" },
        type: "SQUISHED_UPDATE_CELL",
      },
    ];
    const model = new Model();
    expect(new CommandSquisher(model.getters).squish(commands)).toStrictEqual(result);
    expect(new CommandSquisher(model.getters).unsquish(result)).toStrictEqual(commands);
  });

  test("squish does not change the order of commands across a block of update_cell and should restart if a series of update_cell is interrupted by a different command", () => {
    const commands: readonly CoreCommand[] = [
      { sheetId: "Sheet1", col: 0, row: 1, content: "hello", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 0, row: 0, content: "hello", type: "UPDATE_CELL" },
      {
        sheetId: "Sheet1",
        target: [{ left: 0, right: 0, top: 1, bottom: 1 }],
        style: { bold: true },
        type: "SET_FORMATTING",
      },
      { sheetId: "Sheet1", col: 0, row: 3, content: "hello", type: "UPDATE_CELL" },
      {
        sheetId: "Sheet1",
        target: [{ left: 0, right: 0, top: 3, bottom: 3 }],
        style: { bold: true },
        type: "SET_FORMATTING",
      },
      { sheetId: "Sheet1", col: 0, row: 2, content: "hello", type: "UPDATE_CELL" },
    ];
    const result: (CoreCommand | SquishedCoreCommand)[] = [
      { sheetId: "Sheet1", targetRange: "A1:A2", content: "hello", type: "SQUISHED_UPDATE_CELL" },
      {
        sheetId: "Sheet1",
        target: [{ left: 0, right: 0, top: 1, bottom: 1 }],
        style: { bold: true },
        type: "SET_FORMATTING",
      },
      { sheetId: "Sheet1", col: 0, row: 3, content: "hello", type: "UPDATE_CELL" },
      {
        sheetId: "Sheet1",
        target: [{ left: 0, right: 0, top: 3, bottom: 3 }],
        style: { bold: true },
        type: "SET_FORMATTING",
      },
      { sheetId: "Sheet1", col: 0, row: 2, content: "hello", type: "UPDATE_CELL" },
    ];
    const model = new Model();
    expect(new CommandSquisher(model.getters).squish(commands)).toStrictEqual(result);
    expect(new CommandSquisher(model.getters).unsquish(result)).toStrictEqual(
      expect.arrayContaining(commands as CoreCommand[])
    );
  });

  test("squish should only merge the commands of consecutive cells", () => {
    const commands: readonly CoreCommand[] = [
      { sheetId: "Sheet1", col: 0, row: 0, content: "hello", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 0, row: 1, content: "hello", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 0, row: 3, content: "hello", type: "UPDATE_CELL" },
    ];
    const result: (CoreCommand | SquishedCoreCommand)[] = [
      { sheetId: "Sheet1", targetRange: "A1:A2", content: "hello", type: "SQUISHED_UPDATE_CELL" },
      { sheetId: "Sheet1", col: 0, row: 3, content: "hello", type: "UPDATE_CELL" },
    ];
    const model = new Model();
    expect(new CommandSquisher(model.getters).squish(commands)).toStrictEqual(result);
    expect(new CommandSquisher(model.getters).unsquish(result)).toStrictEqual(commands);
  });

  test("squish string that looks like a formula should not compile or squish", () => {
    const commands: readonly CoreCommand[] = [
      // the content starts with '+' which looks like a formula but is actually a string
      { sheetId: "Sheet1", col: 0, row: 0, content: "+SUM(A1)", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 0, row: 1, content: "+SUM(A2)", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 0, row: 2, content: "+SUM(A3)", type: "UPDATE_CELL" },
    ];
    const model = new Model();
    expect(new CommandSquisher(model.getters).squish(commands)).toStrictEqual(commands);
    expect(new CommandSquisher(model.getters).unsquish(commands)).toStrictEqual(commands);
  });

  test("squish should restart on a different column", () => {
    const commands: readonly CoreCommand[] = [
      { sheetId: "Sheet1", col: 0, row: 0, content: "hello", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 0, row: 1, content: "hello", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 1, row: 0, content: "hello", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 1, row: 1, content: "hello", type: "UPDATE_CELL" },
    ];
    const result: (CoreCommand | SquishedCoreCommand)[] = [
      { sheetId: "Sheet1", targetRange: "A1:A2", content: "hello", type: "SQUISHED_UPDATE_CELL" },
      { sheetId: "Sheet1", targetRange: "B1:B2", content: "hello", type: "SQUISHED_UPDATE_CELL" },
    ];
    const model = new Model();
    expect(new CommandSquisher(model.getters).squish(commands)).toStrictEqual(result);
    expect(new CommandSquisher(model.getters).unsquish(result)).toStrictEqual(commands);
  });

  test("squish should restart on a different column and sort by column", () => {
    const commands: readonly CoreCommand[] = [
      { sheetId: "Sheet1", col: 1, row: 0, content: "hello", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 1, row: 1, content: "hello", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 0, row: 0, content: "hello", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 0, row: 1, content: "hello", type: "UPDATE_CELL" },
    ];
    const result: (CoreCommand | SquishedCoreCommand)[] = [
      { sheetId: "Sheet1", targetRange: "A1:A2", content: "hello", type: "SQUISHED_UPDATE_CELL" },
      { sheetId: "Sheet1", targetRange: "B1:B2", content: "hello", type: "SQUISHED_UPDATE_CELL" },
    ];
    const model = new Model();
    expect(new CommandSquisher(model.getters).squish(commands)).toStrictEqual(result);
    expect(new CommandSquisher(model.getters).unsquish(result)).toStrictEqual(
      expect.arrayContaining(commands as CoreCommand[])
    );
  });

  test("squish should restart on a different column with formulas", () => {
    const commands: readonly CoreCommand[] = [
      { sheetId: "Sheet1", col: 0, row: 0, content: "=1", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 0, row: 1, content: "=2", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 0, row: 2, content: "=3", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 1, row: 0, content: "=4", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 1, row: 1, content: "=5", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 1, row: 2, content: "=6", type: "UPDATE_CELL" },
    ];
    const result: (CoreCommand | SquishedCoreCommand)[] = [
      { sheetId: "Sheet1", col: 0, row: 0, content: "=1", type: "UPDATE_CELL" },
      {
        sheetId: "Sheet1",
        targetRange: "A2:A3",
        content: { N: "+1" },
        type: "SQUISHED_UPDATE_CELL",
      },
      {
        sheetId: "Sheet1",
        targetRange: "B1:B3",
        content: { N: "+1" },
        type: "SQUISHED_UPDATE_CELL",
      },
    ];
    const model = new Model();
    expect(new CommandSquisher(model.getters).squish(commands)).toStrictEqual(result);
    expect(new CommandSquisher(model.getters).unsquish(result)).toStrictEqual(commands);
  });

  test("commands in incorrect order cannot be unsquish and generate an error", () => {
    const commands: readonly CoreCommand[] | (CoreCommand | SquishedCoreCommand)[] = [
      {
        sheetId: "Sheet1",
        targetRange: "B1:B3",
        content: { N: "+1" },
        type: "SQUISHED_UPDATE_CELL",
      },
      { sheetId: "Sheet1", col: 0, row: 0, content: "=1", type: "UPDATE_CELL" },
      {
        sheetId: "Sheet1",
        targetRange: "A2:A3",
        content: { N: "+1" },
        type: "SQUISHED_UPDATE_CELL",
      },
    ];
    const model = new Model();
    expect(() => new CommandSquisher(model.getters).unsquish(commands)).toThrow();
  });

  test("squish a block of update_cell sorts the commands by sheet", () => {
    const commands: readonly CoreCommand[] = [
      { sheetId: "Sheet1", col: 0, row: 0, content: "1", type: "UPDATE_CELL" },
      { sheetId: "Sheet2", col: 0, row: 0, content: "4", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 0, row: 1, content: "2", type: "UPDATE_CELL" },
      { sheetId: "Sheet2", col: 0, row: 1, content: "5", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 0, row: 2, content: "3", type: "UPDATE_CELL" },
      { sheetId: "Sheet2", col: 0, row: 2, content: "6", type: "UPDATE_CELL" },
    ];
    const result: (CoreCommand | SquishedCoreCommand)[] = [
      { sheetId: "Sheet1", col: 0, row: 0, content: "1", type: "UPDATE_CELL" },
      {
        sheetId: "Sheet1",
        targetRange: "A2:A3",
        content: { N: "+1" },
        type: "SQUISHED_UPDATE_CELL",
      },
      { sheetId: "Sheet2", col: 0, row: 0, content: "4", type: "UPDATE_CELL" },
      {
        sheetId: "Sheet2",
        targetRange: "A2:A3",
        content: { N: "+1" },
        type: "SQUISHED_UPDATE_CELL",
      },
    ];
    const model = new Model();
    expect(new CommandSquisher(model.getters).squish(commands)).toStrictEqual(result);
    expect(new CommandSquisher(model.getters).unsquish(result)).toEqual(
      expect.arrayContaining(commands as CoreCommand[])
    );
  });

  test("does not squish if any update cell position appear more than once in a block of update_cell", () => {
    const commandsThatCannotBeSquished: readonly CoreCommand[] = [
      { sheetId: "Sheet1", col: 0, row: 0, content: "1", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 0, row: 1, content: "2", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 0, row: 2, content: "3", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 0, row: 2, style: { bold: true }, type: "UPDATE_CELL" },
    ];
    const model = new Model();
    expect(new CommandSquisher(model.getters).squish(commandsThatCannotBeSquished)).toStrictEqual(
      commandsThatCannotBeSquished
    );
    expect(new CommandSquisher(model.getters).unsquish(commandsThatCannotBeSquished)).toStrictEqual(
      commandsThatCannotBeSquished
    );
  });

  test("squish does not corrupt a formula chain interrupted by an empty cell", () => {
    const commands: readonly CoreCommand[] = [
      { sheetId: "Sheet1", col: 0, row: 0, content: "=2", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 0, row: 1, content: "=0", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 0, row: 2, content: "", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 0, row: 3, content: "=0", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 0, row: 4, content: "=0", type: "UPDATE_CELL" },
    ];
    const result: (CoreCommand | SquishedCoreCommand)[] = [
      { sheetId: "Sheet1", col: 0, row: 0, content: "=2", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 0, row: 1, content: "=0", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 0, row: 2, content: "", type: "UPDATE_CELL" },
      {
        sheetId: "Sheet1",
        targetRange: "A4:A5",
        content: "=0",
        type: "SQUISHED_UPDATE_CELL",
      },
    ];
    const model = new Model();
    expect(new CommandSquisher(model.getters).squish(commands)).toStrictEqual(result);
    expect(new CommandSquisher(model.getters).unsquish(result)).toStrictEqual(commands);
  });

  test("squish does not offset a number literal whose format differs from the base cell", () => {
    // Regression test: pasting "100%" followed by plain numbers "2" and "3" used to squish "2"
    // and "3" as a relative offset from "100%"'s underlying value (1), then reconstruct them
    // using the base cell's percent format on unsquish, turning "2"/"3" into "200%"/"300%".
    const commands: readonly CoreCommand[] = [
      { sheetId: "Sheet1", col: 0, row: 0, content: "100%", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 0, row: 1, content: "2", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 0, row: 2, content: "3", type: "UPDATE_CELL" },
    ];
    const model = new Model();
    expect(new CommandSquisher(model.getters).squish(commands)).toStrictEqual(commands);
    expect(new CommandSquisher(model.getters).unsquish(commands)).toStrictEqual(commands);
  });

  test("does not squish a single update_cell command", () => {
    const transport = new MockTransportService();
    const model = new Model(
      { sheets: [{ id: "sheet1", name: "Sheet 1", cells: {} }] },
      { transportService: transport, client: { id: "alice", name: "Alice" } }
    );
    const spy = jest.spyOn(transport, "sendMessage");

    setCellContent(model, "A1", "Hello", "sheet1");

    expect(spy).toHaveBeenCalledWith({
      clientId: "alice",
      commands: [
        {
          col: 0,
          row: 0,
          sheetId: "sheet1",
          content: "Hello",
          type: "UPDATE_CELL",
        },
      ],
      nextRevisionId: expect.any(String),
      serverRevisionId: "START_REVISION",
      type: "REMOTE_REVISION",
      version: 1,
    });
  });
});

describe("Collaborative session - clientId preservation", () => {
  /**
   * This test verifies that the clientId in a REMOTE_REVISION message sent by a client
   * always matches the original sender, even after the revision is OT-transformed and
   * rebased.
   *
   * The scenario exercises the `revision.commands.length === 0` branch in
   * `sendPendingMessage`: when bob's autofill commands target rows that alice concurrently
   * removes (via undo), OT-transformation drops those commands (empty array), triggering a
   * rebase.  The resent message MUST still carry `clientId: "bob"` so that bob's own session
   * recognizes the server echo as its own revision and does not re-apply it, which would
   * corrupt the shared state.
   */
  test("clientId is preserved in resent REMOTE_REVISION after OT-transformation to empty commands", () => {
    const { network, alice, bob } = setupCollaborativeEnv({
      sheets: [{ id: "sheet1", cells: { A1: { content: "hello" } } }],
    });

    // Alice adds 4 rows sequentially — all clients now have 5 rows (rows 0–4).
    addRows(alice, "after", 0, 4);

    // Capture every message that hits the transport from this point onward.
    const spy = jest.spyOn(network, "sendMessage");

    // Concurrent block:
    //   - Alice's REVISION_UNDONE is sent first and accepted by the server.
    //     This removes the 4 added rows from the shared state.
    //   - Bob's REMOTE_REVISION (autofill A1→A5, targeting rows 1–4) is sent
    //     second and rejected by the server because the serverRevisionId no
    //     longer matches.
    //
    // After the block the mock broadcasts Alice's undo to all listeners.
    // Bob's session processes it, OT-transforms his pending autofill revision
    // (rows 1–4 no longer exist → commands become []), and then rebases and
    // resends the revision.
    network.concurrent(() => {
      undo(alice); // accepted first — undoes addRows, deletes rows 1–4
      autofill(bob, "A1", "A5"); // targets the now-deleted rows 1–4
    });

    // Every REMOTE_REVISION sent by bob must carry clientId: "bob".
    // If the clientId were wrong (e.g. "empty" from the internal buildEmpty
    // placeholder), bob's session would fail to recognize the server echo as
    // its own revision and would re-apply it, duplicating the changes.
    const bobRevisions = spy.mock.calls
      .map(([msg]) => msg)
      .filter((msg) => msg.type === "REMOTE_REVISION" && msg.clientId === "bob");

    expect(bobRevisions.length).toBeGreaterThan(0);
    for (const msg of bobRevisions) {
      expect((msg as RemoteRevisionMessage).clientId).toBe("bob");
    }

    // Both clients must converge to the same exported state.
    expect([alice, bob]).toHaveSynchronizedExportedData();
  });

  test("clientId is preserved when a pending revision is resent after concurrent row deletion", () => {
    const { network, alice, bob } = setupCollaborativeEnv({
      sheets: [{ id: "sheet1", cells: { A1: { content: "1" }, A2: { content: "2" } } }],
    });

    const spy = jest.spyOn(network, "sendMessage");

    // Bob autofills concurrently while Alice deletes a row that overlaps with
    // Bob's autofill target.  Alice is accepted first, so Bob must resend his
    // revision after OT.  The resent message must still carry clientId: "bob".
    network.concurrent(() => {
      deleteRows(alice, [1]); // delete row 1 (A2); accepted first
      autofill(bob, "A1:A2", "A5"); // targets rows 2–4; gets OT-transformed
    });

    const bobRevisions = spy.mock.calls
      .map(([msg]) => msg)
      .filter((msg) => msg.type === "REMOTE_REVISION" && msg.clientId === "bob");

    expect(bobRevisions.length).toBeGreaterThan(0);
    for (const msg of bobRevisions) {
      expect((msg as RemoteRevisionMessage).clientId).toBe("bob");
    }

    expect([alice, bob]).toHaveSynchronizedExportedData();
  });
});

describe("Collaborative session", () => {
  test("a revision rebased after a concurrent row insertion is not flagged as a failed squish", () => {
    const { network, alice, bob } = setupCollaborativeEnv();
    const spy = jest.spyOn(network, "sendMessage");

    network.concurrent(() => {
      addRows(alice, "after", 0, 1);
      setCellContent(bob, "A5", "bobEdit");
    });

    const bobRevisions = spy.mock.calls
      .map(([msg]) => msg)
      .filter(
        (msg: RemoteRevisionsSquishedMessage) =>
          msg.type === "REMOTE_REVISION" && msg.clientId === "bob"
      );

    expect(bobRevisions.length).toBe(2);
    // The resent commands must reflect the transformed position (row 5)
    const resent = bobRevisions[bobRevisions.length - 1] as RemoteRevisionsSquishedMessage;
    expect(resent.commands).toContainEqual(
      expect.objectContaining({ type: "UPDATE_CELL", row: 5, content: "bobEdit" })
    );
    expect(resent.squishedFailed).toBeFalsy();

    expect([alice, bob]).toHaveSynchronizedExportedData();
  });

  test("revisions that do not result in squished commands are sent unmodified", () => {
    const { network, alice } = setupCollaborativeEnv();
    const spy = jest.spyOn(network, "sendMessage");
    setCellContent(alice, "A1", "=sum(b1:b2)");
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "REMOTE_REVISION",
        clientId: "alice",
        commands: [
          expect.objectContaining({ type: "UPDATE_CELL", row: 0, content: "=sum(b1:b2)" }),
        ], // stays lowercase b1
      })
    );
    expect((spy.mock.calls[0][0] as any).squishedFailed).toBeUndefined();
  });
});

describe("Collaborative session - copy/paste squish dates", () => {
  test("consecutive dates squish into an offset and the reconstructed day is exact", () => {
    const { alice, bob } = setupCollaborativeEnv();
    setCellContent(alice, "A1", "2026-01-16");
    setCellContent(alice, "A2", "2026-02-20"); // +35 days
    setCellContent(alice, "A3", "2026-03-27"); // +35 days again -> forces an actual offset merge

    copy(alice, "A1:A3");
    const result = paste(alice, "B1");
    expect(result.isSuccessful).toBe(true);

    for (const xc of ["B1", "B2", "B3"]) {
      expect(getEvaluatedCell(bob, xc).value).toBe(getEvaluatedCell(alice, xc).value);
      expect(getCellContent(bob, xc)).toBe(getCellContent(alice, xc));
    }
  });

  test("a day-omitting custom format (mm/yyyy) does not lose the day when offset-squished", () => {
    const { alice, bob } = setupCollaborativeEnv();
    setCellContent(alice, "A1", "2026-01-16");
    setCellContent(alice, "A2", "2026-02-20");
    setCellContent(alice, "A3", "2026-03-27");
    setFormat(alice, "A1:A3", "mm/yyyy");

    copy(alice, "A1:A3");
    const result = paste(alice, "B1");
    expect(result.isSuccessful).toBe(true);

    for (const xc of ["B1", "B2", "B3"]) {
      expect(getEvaluatedCell(bob, xc).value).toBe(getEvaluatedCell(alice, xc).value);
      expect(getCellContent(bob, xc)).toBe(getCellContent(alice, xc)); // both still show e.g. "01/2026"
    }
  });

  test("a date column with one differently-formatted date does not corrupt its neighbors", () => {
    const { alice, bob } = setupCollaborativeEnv();
    setCellContent(alice, "A1", "2026-01-01");
    setCellContent(alice, "A2", "2026-01-02");
    setCellContent(alice, "A3", "2026-01-03");
    setFormat(alice, "A3", "dddd d mmmm yyyy"); // custom format, different from A1/A2's default

    copy(alice, "A1:A3");
    const result = paste(alice, "B1");
    expect(result.isSuccessful).toBe(true);

    for (const xc of ["B1", "B2", "B3"]) {
      expect(getEvaluatedCell(bob, xc).value).toBe(getEvaluatedCell(alice, xc).value);
      expect(getCellContent(bob, xc)).toBe(getCellContent(alice, xc));
    }
  });

  test("a date next to a plain number with a coincidentally close value does not corrupt either", () => {
    const { alice, bob } = setupCollaborativeEnv();
    setCellContent(alice, "A1", "2026-01-01"); // serial 46023
    setCellContent(alice, "A2", "46024"); // plain number, no format, one more than the date's serial
    setCellContent(alice, "A3", "2026-01-03");

    copy(alice, "A1:A3");
    const result = paste(alice, "B1");
    expect(result.isSuccessful).toBe(true);

    for (const xc of ["B1", "B2", "B3"]) {
      expect(getEvaluatedCell(bob, xc).value).toBe(getEvaluatedCell(alice, xc).value);
      expect(getCellContent(bob, xc)).toBe(getCellContent(alice, xc));
    }
  });

  test("OS-clipboard paste of a date followed by unrelated plain numbers does not corrupt values", () => {
    // Unlike internal copy/paste, OS-clipboard text never carries an explicit format, so the
    // number-offset chain's format-mismatch guard (not the format comparison done when merging
    // wire commands) is the only thing preventing a date from being chained with an unrelated
    // number that happens to produce the same offset pattern.
    const { alice, bob } = setupCollaborativeEnv();
    const result = pasteFromOSClipboard(alice, "A1", { text: "2026-01-01\n2\n3" });
    expect(result.isSuccessful).toBe(true);

    for (const xc of ["A1", "A2", "A3"]) {
      expect(getEvaluatedCell(bob, xc).value).toBe(getEvaluatedCell(alice, xc).value);
      expect(getCellContent(bob, xc)).toBe(getCellContent(alice, xc));
    }
  });

  test("a datetime with a time-of-day component is never offset-squished", () => {
    // Only whole-number (day-granularity) literals are eligible for the number-offset chain;
    // a fractional serial (a date with a time component) always falls back to full content.
    const { alice, bob } = setupCollaborativeEnv();
    setCellContent(alice, "A1", "2026/01/01 10:00:00");
    setCellContent(alice, "A2", "2026/01/01 11:00:00");
    setCellContent(alice, "A3", "2026/01/01 12:00:00");

    copy(alice, "A1:A3");
    const result = paste(alice, "B1");
    expect(result.isSuccessful).toBe(true);

    for (const xc of ["B1", "B2", "B3"]) {
      expect(getEvaluatedCell(bob, xc).value).toBe(getEvaluatedCell(alice, xc).value);
      expect(getCellContent(bob, xc)).toBe(getCellContent(alice, xc));
    }
  });
});
