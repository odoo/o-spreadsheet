import { CommandSquisher } from "@odoo/o-spreadsheet-engine/collaborative/commandSquisher";
import { SquishedCoreCommand } from "@odoo/o-spreadsheet-engine/types/collaborative/transport_service";
import { CoreCommand, Model } from "../../src";
import { toCartesian, toZone } from "../../src/helpers";
import { MockTransportService } from "../__mocks__/transport_service";
import { getCellContent } from "../test_helpers";
import { setCellContent, setSelection } from "../test_helpers/commands_helpers";

/**
 * Autofill from a zone to a cell
 */
//TODO VSC: copied from autofill.test.ts, should be moved to test_helpers on both files
function autofill(model: Model, from: string, to: string) {
  setSelection(model, [from]);
  model.dispatch("AUTOFILL_SELECT", toCartesian(to));
  model.dispatch("AUTOFILL");
}

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
          type: "UPDATE_CELL_SQUISH",
        },
        {
          border: {},
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

  test("receiving an UPDATE_CELL_SQUISH message should unsquish", () => {
    const model = new Model(
      { sheets: [{ id: "sheet1", name: "Sheet 1", cells: { A1: "Hello" } }] },
      { transportService: new MockTransportService(), client: { id: "alice", name: "Alice" } },
      [
        {
          clientId: "alice",
          commands: [
            {
              border: {},
              sheetId: "sheet1",
              target: [toZone("A2:A5")],
              type: "SET_BORDERS_ON_TARGET",
            },
            {
              targetRange: "A2:A5",
              sheetId: "sheet1",
              content: "Hello",
              format: "",
              style: null,
              type: "UPDATE_CELL_SQUISH",
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

  test("squish should respect differences in format", () => {
    const transport = new MockTransportService();
    const model = new Model(
      {
        sheets: [
          {
            id: "Sheet1",
            name: "Sheet1",
            cells: { "A1:A2": "Hello" },
            formats: { A1: 1, A2: 2 },
          },
        ],
        formats: { "1": "#,##0.00", "2": "[$$]#,##0.00" },
        revisionId: "START_REVISION",
      },
      { transportService: transport, client: { id: "alice", name: "Alice" } }
    );
    const spy = jest.spyOn(transport, "sendMessage");

    autofill(model, "A1:A2", "A5");

    expect(spy).toHaveBeenCalledWith({
      clientId: "alice",
      commands: [
        {
          col: 0,
          row: 2,
          sheetId: "Sheet1",
          content: "Hello",
          format: "#,##0.00",
          style: null,
          type: "UPDATE_CELL",
        },
        {
          col: 0,
          row: 3,
          sheetId: "Sheet1",
          content: "Hello",
          format: "[$$]#,##0.00",
          style: null,
          type: "UPDATE_CELL",
        },
        {
          col: 0,
          row: 4,
          sheetId: "Sheet1",
          content: "Hello",
          format: "#,##0.00",
          style: null,
          type: "UPDATE_CELL",
        },
        {
          border: {},
          sheetId: "Sheet1",
          target: [toZone("A3:A5")],
          type: "SET_BORDERS_ON_TARGET",
        },
      ],
      nextRevisionId: expect.any(String),
      serverRevisionId: "START_REVISION",
      type: "REMOTE_REVISION",
      version: 1,
    });
  });

  test("squish should respect differences in style", () => {
    const transport = new MockTransportService();
    const model = new Model(
      {
        sheets: [
          {
            id: "Sheet1",
            name: "Sheet1",
            cells: { A1: "Hello", A2: "Hello" },
            styles: { A1: 1, A2: 2 },
          },
        ],
        styles: { "1": { bold: true }, "2": { italic: true } },
        revisionId: "START_REVISION",
      },
      { transportService: transport, client: { id: "alice", name: "Alice" } }
    );
    const spy = jest.spyOn(transport, "sendMessage");

    autofill(model, "A1:A2", "A5");

    expect(spy).toHaveBeenCalledWith({
      clientId: "alice",
      commands: [
        {
          col: 0,
          row: 2,
          sheetId: "Sheet1",
          content: "Hello",
          format: "",
          style: { bold: true },
          type: "UPDATE_CELL",
        },
        {
          col: 0,
          row: 3,
          sheetId: "Sheet1",
          content: "Hello",
          format: "",
          style: { italic: true },
          type: "UPDATE_CELL",
        },
        {
          col: 0,
          row: 4,
          sheetId: "Sheet1",
          content: "Hello",
          format: "",
          style: { bold: true },
          type: "UPDATE_CELL",
        },
        {
          border: {},
          sheetId: "Sheet1",
          target: [toZone("A3:A5")],
          type: "SET_BORDERS_ON_TARGET",
        },
      ],
      nextRevisionId: expect.any(String),
      serverRevisionId: "START_REVISION",
      type: "REMOTE_REVISION",
      version: 1,
    });
  });

  test("squish consecutive formulas with the same normalized formula", () => {
    const transport = new MockTransportService();
    const model = new Model(
      {
        sheets: [
          {
            id: "Sheet1",
            name: "Sheet1",
            cells: { A1: "=SUM(B1)" },
          },
        ],
        revisionId: "START_REVISION",
      },
      { transportService: transport, client: { id: "alice", name: "Alice" } }
    );
    const spy = jest.spyOn(transport, "sendMessage");

    autofill(model, "A1", "A5");

    expect(spy).toHaveBeenCalledWith({
      clientId: "alice",
      commands: [
        {
          col: 0,
          row: 1,
          sheetId: "Sheet1",
          content: "=SUM(B2)",
          format: "",
          style: null,
          type: "UPDATE_CELL",
        },
        {
          targetRange: "A3:A5",
          sheetId: "Sheet1",
          content: { R: "+R1" },
          format: "",
          style: null,
          type: "UPDATE_CELL_SQUISH",
        },
        {
          border: {},
          sheetId: "Sheet1",
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

  test("squish consecutive numbers", () => {
    const transport = new MockTransportService();
    const model = new Model(
      {
        sheets: [
          {
            id: "Sheet1",
            name: "Sheet1",
            cells: { A1: "1", A2: "2" },
          },
        ],
        revisionId: "START_REVISION",
      },
      { transportService: transport, client: { id: "alice", name: "Alice" } }
    );
    const spy = jest.spyOn(transport, "sendMessage");

    autofill(model, "A1:A2", "A5");

    expect(spy).toHaveBeenCalledWith({
      clientId: "alice",
      commands: [
        {
          col: 0,
          row: 2,
          sheetId: "Sheet1",
          content: "3",
          format: "",
          style: null,
          type: "UPDATE_CELL",
        },
        {
          targetRange: "A4:A5",
          sheetId: "Sheet1",
          content: { N: "+1" },
          format: "",
          style: null,
          type: "UPDATE_CELL_SQUISH",
        },
        {
          border: {},
          sheetId: "Sheet1",
          target: [toZone("A3:A5")],
          type: "SET_BORDERS_ON_TARGET",
        },
      ],
      nextRevisionId: expect.any(String),
      serverRevisionId: "START_REVISION",
      type: "REMOTE_REVISION",
      version: 1,
    });
  });
});

describe("commands", () => {
  test("squish does not change the order of commands and should stop if a serie of update_cell is interrupted by a different command", () => {
    const commands: readonly CoreCommand[] = [
      { sheetId: "Sheet1", col: 0, row: 1, content: "hello", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 0, row: 0, content: "hello", type: "UPDATE_CELL" },
      {
        sheetId: "Sheet1",
        target: [{ left: 0, right: 0, top: 1, bottom: 1 }],
        style: { bold: true },
        type: "SET_FORMATTING",
      },
      { sheetId: "Sheet1", col: 0, row: 2, content: "hello", type: "UPDATE_CELL" },
      {
        sheetId: "Sheet1",
        target: [{ left: 0, right: 0, top: 3, bottom: 3 }],
        style: { bold: true },
        type: "SET_FORMATTING",
      },
      { sheetId: "Sheet1", col: 0, row: 3, content: "hello", type: "UPDATE_CELL" },
    ];
    const result = [
      { sheetId: "Sheet1", targetRange: "A1:A2", content: "hello", type: "UPDATE_CELL_SQUISH" },
      {
        sheetId: "Sheet1",
        target: [{ left: 0, right: 0, top: 1, bottom: 1 }],
        style: { bold: true },
        type: "SET_FORMATTING",
      },
      { sheetId: "Sheet1", col: 0, row: 2, content: "hello", type: "UPDATE_CELL" },
      {
        sheetId: "Sheet1",
        target: [{ left: 0, right: 0, top: 3, bottom: 3 }],
        style: { bold: true },
        type: "SET_FORMATTING",
      },
      { sheetId: "Sheet1", col: 0, row: 3, content: "hello", type: "UPDATE_CELL" },
    ];
    const model = new Model();
    expect(new CommandSquisher(model.getters).squish(commands)).toStrictEqual(result);
  });
  test("squish should only merge consecutive cells", () => {
    const commands: readonly CoreCommand[] = [
      { sheetId: "Sheet1", col: 0, row: 0, content: "hello", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 0, row: 1, content: "hello", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 0, row: 3, content: "hello", type: "UPDATE_CELL" },
    ];
    const result = [
      { sheetId: "Sheet1", targetRange: "A1:A2", content: "hello", type: "UPDATE_CELL_SQUISH" },
      { sheetId: "Sheet1", col: 0, row: 3, content: "hello", type: "UPDATE_CELL" },
    ];
    const model = new Model();
    expect(new CommandSquisher(model.getters).squish(commands)).toStrictEqual(result);
  });

  test("squish should restart on a different column", () => {
    const commands: readonly CoreCommand[] = [
      { sheetId: "Sheet1", col: 0, row: 0, content: "hello", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 0, row: 1, content: "hello", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 1, row: 0, content: "hello", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 1, row: 1, content: "hello", type: "UPDATE_CELL" },
    ];
    const result = [
      { sheetId: "Sheet1", targetRange: "A1:A2", content: "hello", type: "UPDATE_CELL_SQUISH" },
      { sheetId: "Sheet1", targetRange: "B1:B2", content: "hello", type: "UPDATE_CELL_SQUISH" },
    ];
    const model = new Model();
    expect(new CommandSquisher(model.getters).squish(commands)).toStrictEqual(result);
  });

  test("squish should restart on a different column and sort by column", () => {
    const commands: readonly CoreCommand[] = [
      { sheetId: "Sheet1", col: 1, row: 0, content: "hello", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 1, row: 1, content: "hello", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 0, row: 0, content: "hello", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 0, row: 1, content: "hello", type: "UPDATE_CELL" },
    ];
    const result = [
      { sheetId: "Sheet1", targetRange: "A1:A2", content: "hello", type: "UPDATE_CELL_SQUISH" },
      { sheetId: "Sheet1", targetRange: "B1:B2", content: "hello", type: "UPDATE_CELL_SQUISH" },
    ];
    const model = new Model();
    expect(new CommandSquisher(model.getters).squish(commands)).toStrictEqual(result);
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
    const result = [
      { sheetId: "Sheet1", col: 0, row: 0, content: "=1", type: "UPDATE_CELL" },
      {
        sheetId: "Sheet1",
        targetRange: "A2:A3",
        content: { N: "+1" },
        type: "UPDATE_CELL_SQUISH",
      },
      {
        sheetId: "Sheet1",
        targetRange: "B1:B3",
        content: { N: "+1" },
        type: "UPDATE_CELL_SQUISH",
      },
    ];
    const model = new Model();
    expect(new CommandSquisher(model.getters).squish(commands)).toStrictEqual(result);
  });

  test("commands in incorrect order cannot be unsquish", () => {
    const commands: readonly CoreCommand[] | (CoreCommand | SquishedCoreCommand)[] = [
      {
        sheetId: "Sheet1",
        targetRange: "B1:B3",
        content: { N: "+1" },
        type: "UPDATE_CELL_SQUISH",
      },
      { sheetId: "Sheet1", col: 0, row: 0, content: "=1", type: "UPDATE_CELL" },
      {
        sheetId: "Sheet1",
        targetRange: "A2:A3",
        content: { N: "+1" },
        type: "UPDATE_CELL_SQUISH",
      },
    ];
    const model = new Model();
    () => expect(new CommandSquisher(model.getters).unsquish(commands)).toThrow();
  });

  test("squish a block of update_cell can sort the commands by sheet", () => {
    const commands: readonly CoreCommand[] = [
      { sheetId: "Sheet1", col: 0, row: 0, content: "1", type: "UPDATE_CELL" },
      { sheetId: "Sheet2", col: 0, row: 0, content: "4", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 0, row: 1, content: "2", type: "UPDATE_CELL" },
      { sheetId: "Sheet2", col: 0, row: 1, content: "5", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", col: 0, row: 2, content: "3", type: "UPDATE_CELL" },
      { sheetId: "Sheet2", col: 0, row: 2, content: "6", type: "UPDATE_CELL" },
    ];
    const result = [
      { sheetId: "Sheet1", col: 0, row: 0, content: "1", type: "UPDATE_CELL" },
      { sheetId: "Sheet1", targetRange: "A2:A3", content: { N: "+1" }, type: "UPDATE_CELL_SQUISH" },
      { sheetId: "Sheet2", col: 0, row: 0, content: "4", type: "UPDATE_CELL" },
      { sheetId: "Sheet2", targetRange: "A2:A3", content: { N: "+1" }, type: "UPDATE_CELL_SQUISH" },
    ];
    const model = new Model();
    expect(new CommandSquisher(model.getters).squish(commands)).toStrictEqual(result);
  });

  test("does not squish if any update cell position appear more than once in a block of update_cell", () => {
    //idem
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
/*
  { "sheetId": "sheet1", "target":"A7:A9", "content": {R: "+1"}, "format": "", "style": null, "type": "UPDATE_CELL", }
  { "sheetId": "sheet1", "target":"A6", "content": "=sum(b6)", "format": "", "style": null, "type": "UPDATE_CELL", }
*/
