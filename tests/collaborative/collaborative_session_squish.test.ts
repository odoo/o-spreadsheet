import { Model } from "../../src";
import { toCartesian } from "../../src/helpers";
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
          target: [
            {
              bottom: 4,
              left: 0,
              right: 0,
              top: 1,
            },
          ],
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
              target: [{ bottom: 4, left: 0, right: 0, top: 1 }],
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
          target: [{ bottom: 4, left: 0, right: 0, top: 2 }],
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
          target: [{ bottom: 4, left: 0, right: 0, top: 2 }],
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
          target: [{ bottom: 4, left: 0, right: 0, top: 1 }],
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
          target: [{ bottom: 4, left: 0, right: 0, top: 1 }],
          type: "SET_BORDERS_ON_TARGET",
        },
      ],
      nextRevisionId: expect.any(String),
      serverRevisionId: "START_REVISION",
      type: "REMOTE_REVISION",
      version: 1,
    });
  });

  test("squish does not change the order of commands", () => {});
  test("squish should stop if a serie of update_cell is interrupted by a different command", () => {});

  test("squish should only merge consecutive cells", () => {});

  test("squish should restart on a different column", () => {});

  test("squish a block of update_cell can sort the commands by sheet/col/row", () => {});

  test("does not squish if any update cell position appear more than once in a block of update_cell", () => {});

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
