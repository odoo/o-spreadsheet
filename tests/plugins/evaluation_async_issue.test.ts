import { Model } from "../../src";
import { StateUpdateMessage } from "../../src/types/collaborative/transport_service";
import { getCellContent } from "../test_helpers/getters_helpers";
import { nextTick } from "../test_helpers/helpers";

test("loading a save with extra commands moving cells that depends on async failed", async () => {
  jest.useFakeTimers();

  const data = {
    version: 7,
    sheets: [
      {
        name: "Sheet1",
        colNumber: 26,
        rowNumber: 120,
        cols: { 1: {}, 3: {} },
        rows: {},
        cells: {
          A1: { content: "=wait(10)" },
          C12: { content: "=A1+A1" },
        },
        conditionalFormats: [
          {
            id: "1",
            ranges: ["C12:C12"],
            rule: {
              values: ["10"],
              operator: "Equal",
              type: "CellIsRule",
              style: { fillColor: "#FFA500" },
            },
          },
        ],
      },
    ],
  };

  const stateUpdateMessages: StateUpdateMessage[] = [
    {
      type: "REMOTE_REVISION",
      version: 1,
      serverRevisionId: "START_REVISION",
      nextRevisionId: "d8135fad-3f59-47fb-a529-775031e8efc3",
      clientId: "784b2823-440c-4f54-affb-7c3ea542b70b",
      commands: [
        { type: "CLEAR_CELL", col: 2, row: 11, sheetId: "Sheet1" },
        {
          type: "CLEAR_FORMATTING",
          sheetId: "Sheet1",
          target: [{ left: 2, right: 2, top: 11, bottom: 11 }],
        },
        {
          type: "UPDATE_CELL",
          col: 10,
          row: 12,
          sheetId: "Sheet1",
          content: "=A1+A1",
          style: null,
        },
        {
          type: "ADD_CONDITIONAL_FORMAT",
          cf: {
            id: "1",
            rule: {
              values: ["42"],
              operator: "Equal",
              type: "CellIsRule",
              style: { fillColor: "#FFA500" },
            },
          },
          target: [
            { top: 0, bottom: 10, left: 2, right: 2 },
            {
              top: 12,
              bottom: 99,
              left: 2,
              right: 2,
            },
            { top: 12, bottom: 12, left: 10, right: 10 },
          ],
          sheetId: "Sheet1",
        },
      ],
    },
  ];

  const model = new Model(data, {}, stateUpdateMessages);

  jest.advanceTimersByTime(100);
  await nextTick();
  jest.advanceTimersByTime(100); // removing this --> K13 = LOADING...

  expect(getCellContent(model, "A1")).toBe("10");
  expect(getCellContent(model, "K13")).toBe("20");
});
