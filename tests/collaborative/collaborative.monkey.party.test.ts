import seedrandom from "seedrandom";
import { Model } from "../../src";
import { deepCopy, range } from "../../src/helpers";
import { Command } from "../../src/types";
import { redo, undo } from "../test_helpers/commands_helpers";
import { printDebugModel } from "../test_helpers/debug_helpers";
import { MockTransportService } from "../__mocks__/transport_service";
import { setupCollaborativeEnv } from "./collaborative_helpers";

const revisions = [
  {
    type: "REMOTE_REVISION",
    commands: [
      {
        type: "ADD_COLUMNS_ROWS",
        sheetId: "Sheet1",
        position: "before",
        dimension: "COL",
        base: 0,
        quantity: 1,
      },
    ],
  },
  {
    type: "REMOTE_REVISION",
    commands: [{ type: "UPDATE_CELL", sheetId: "Sheet1", col: 2, row: 4, content: "coucou" }],
  },
  {
    type: "REMOTE_REVISION",
    commands: [],
  },
  {
    type: "REMOTE_REVISION",
    commands: [{ type: "UPDATE_CELL", sheetId: "Sheet1", col: 2, row: 6, content: "=C4" }],
  },
  {
    type: "REMOTE_REVISION",
    commands: [{ type: "UPDATE_CELL", sheetId: "Sheet1", col: 2, row: 3, content: "1" }],
  },
  {
    type: "REMOTE_REVISION",
    commands: [
      {
        type: "ADD_COLUMNS_ROWS",
        sheetId: "Sheet1",
        position: "before",
        dimension: "COL",
        base: 1,
        quantity: 1,
      },
    ],
  },
  {
    type: "REMOTE_REVISION",
    commands: [
      {
        type: "UPDATE_CELL",
        sheetId: "Sheet1",
        col: 3,
        row: 7,
        style: null,
        content: "=D5",
        format: "",
      },
      { type: "SET_BORDER", border: undefined, sheetId: "Sheet1", col: 3, row: 7 },
      {
        type: "UPDATE_CELL",
        sheetId: "Sheet1",
        col: 3,
        row: 8,
        style: null,
        content: "=D6",
        format: "",
      },
      { type: "SET_BORDER", border: undefined, sheetId: "Sheet1", col: 3, row: 8 },
      {
        type: "UPDATE_CELL",
        sheetId: "Sheet1",
        col: 3,
        row: 9,
        style: null,
        content: "=D7",
        format: "",
      },
      { type: "SET_BORDER", border: undefined, sheetId: "Sheet1", col: 3, row: 9 },
      {
        type: "UPDATE_CELL",
        sheetId: "Sheet1",
        col: 3,
        row: 10,
        style: null,
        content: "=D8",
        format: "",
      },
      { type: "SET_BORDER", border: undefined, sheetId: "Sheet1", col: 3, row: 10 },
      {
        type: "UPDATE_CELL",
        sheetId: "Sheet1",
        col: 3,
        row: 11,
        style: null,
        content: "=D9",
        format: "",
      },
      { type: "SET_BORDER", border: undefined, sheetId: "Sheet1", col: 3, row: 11 },
      {
        type: "UPDATE_CELL",
        sheetId: "Sheet1",
        col: 3,
        row: 12,
        style: null,
        content: "=D10",
        format: "",
      },
      { type: "SET_BORDER", border: undefined, sheetId: "Sheet1", col: 3, row: 12 },
      {
        type: "UPDATE_CELL",
        sheetId: "Sheet1",
        col: 3,
        row: 13,
        style: null,
        content: "=D11",
        format: "",
      },
      { type: "SET_BORDER", border: undefined, sheetId: "Sheet1", col: 3, row: 13 },
      {
        type: "UPDATE_CELL",
        sheetId: "Sheet1",
        col: 3,
        row: 14,
        style: null,
        content: "=D12",
        format: "",
      },
      { type: "SET_BORDER", border: undefined, sheetId: "Sheet1", col: 3, row: 14 },
      {
        type: "UPDATE_CELL",
        sheetId: "Sheet1",
        col: 3,
        row: 15,
        style: null,
        content: "=D13",
        format: "",
      },
      { type: "SET_BORDER", border: undefined, sheetId: "Sheet1", col: 3, row: 15 },
      {
        type: "UPDATE_CELL",
        sheetId: "Sheet1",
        col: 3,
        row: 16,
        style: null,
        content: "=D14",
        format: "",
      },
      { type: "SET_BORDER", border: undefined, sheetId: "Sheet1", col: 3, row: 16 },
      {
        type: "UPDATE_CELL",
        sheetId: "Sheet1",
        col: 3,
        row: 17,
        style: null,
        content: "=D15",
        format: "",
      },
      { type: "SET_BORDER", border: undefined, sheetId: "Sheet1", col: 3, row: 17 },
      {
        type: "UPDATE_CELL",
        sheetId: "Sheet1",
        col: 3,
        row: 18,
        style: null,
        content: "=D16",
        format: "",
      },
      { type: "SET_BORDER", border: undefined, sheetId: "Sheet1", col: 3, row: 18 },
      {
        type: "UPDATE_CELL",
        sheetId: "Sheet1",
        col: 3,
        row: 19,
        style: null,
        content: "=D17",
        format: "",
      },
      { type: "SET_BORDER", border: undefined, sheetId: "Sheet1", col: 3, row: 19 },
      {
        type: "UPDATE_CELL",
        sheetId: "Sheet1",
        col: 3,
        row: 20,
        style: null,
        content: "=D18",
        format: "",
      },
      { type: "SET_BORDER", border: undefined, sheetId: "Sheet1", col: 3, row: 20 },
      {
        type: "UPDATE_CELL",
        sheetId: "Sheet1",
        col: 3,
        row: 21,
        style: null,
        content: "=D19",
        format: "",
      },
      { type: "SET_BORDER", border: undefined, sheetId: "Sheet1", col: 3, row: 21 },
      {
        type: "UPDATE_CELL",
        sheetId: "Sheet1",
        col: 3,
        row: 22,
        style: null,
        content: "=D20",
        format: "",
      },
      { type: "SET_BORDER", border: undefined, sheetId: "Sheet1", col: 3, row: 22 },
      {
        type: "UPDATE_CELL",
        sheetId: "Sheet1",
        col: 3,
        row: 23,
        style: null,
        content: "=D21",
        format: "",
      },
      { type: "SET_BORDER", border: undefined, sheetId: "Sheet1", col: 3, row: 23 },
      {
        type: "UPDATE_CELL",
        sheetId: "Sheet1",
        col: 3,
        row: 24,
        style: null,
        content: "=D22",
        format: "",
      },
      { type: "SET_BORDER", border: undefined, sheetId: "Sheet1", col: 3, row: 24 },
      {
        type: "UPDATE_CELL",
        sheetId: "Sheet1",
        col: 3,
        row: 25,
        style: null,
        content: "=D23",
        format: "",
      },
      { type: "SET_BORDER", border: undefined, sheetId: "Sheet1", col: 3, row: 25 },
      {
        type: "UPDATE_CELL",
        sheetId: "Sheet1",
        col: 3,
        row: 26,
        style: null,
        content: "=D24",
        format: "",
      },
      { type: "SET_BORDER", border: undefined, sheetId: "Sheet1", col: 3, row: 26 },
    ],
  },
  {
    type: "REVISION_UNDONE",
    undoneRevisionId: "6912f214-8ca0-4e46-9a91-a7bb19e9b15c",
  },
  {
    type: "REMOTE_REVISION",
    commands: [{ type: "UPDATE_CELL", sheetId: "Sheet1", col: 0, row: 12, content: "A" }],
  },
  {
    type: "REMOTE_REVISION",
    commands: [{ type: "UPDATE_CELL", sheetId: "Sheet1", col: 0, row: 13, content: "B" }],
  },
  {
    type: "REMOTE_REVISION",
    commands: [{ type: "UPDATE_CELL", sheetId: "Sheet1", col: 0, row: 14, content: "C" }],
  },
  {
    type: "REMOTE_REVISION",
    commands: [{ type: "UPDATE_CELL", sheetId: "Sheet1", col: 0, row: 15, content: "D" }],
  },
  {
    type: "REMOTE_REVISION",
    commands: [{ type: "UPDATE_CELL", sheetId: "Sheet1", col: 0, row: 16, content: "E" }],
  },
  {
    type: "REMOTE_REVISION",
    commands: [{ type: "UPDATE_CELL", sheetId: "Sheet1", col: 0, row: 17, content: "F" }],
  },
  {
    type: "REMOTE_REVISION",
    commands: [{ type: "UPDATE_CELL", sheetId: "Sheet1", col: 1, row: 12, content: "=1" }],
  },
  {
    type: "REMOTE_REVISION",
    commands: [{ type: "UPDATE_CELL", sheetId: "Sheet1", col: 1, row: 13, content: "=2" }],
  },
  {
    type: "REMOTE_REVISION",
    commands: [{ type: "UPDATE_CELL", sheetId: "Sheet1", col: 1, row: 14, content: "=6" }],
  },
  {
    type: "REVISION_UNDONE",
    undoneRevisionId: "bf068fa1-3c94-4f41-a063-ba2f5f5ec84a",
  },
  {
    type: "REVISION_UNDONE",
    undoneRevisionId: "287c77b7-5826-4c4b-a801-66f0e0d7758b",
  },
  {
    type: "REMOTE_REVISION",
    commands: [{ type: "UPDATE_CELL", sheetId: "Sheet1", col: 1, row: 13, content: "10" }],
  },
  {
    type: "REMOTE_REVISION",
    commands: [{ type: "UPDATE_CELL", sheetId: "Sheet1", col: 1, row: 14, content: "12" }],
  },
  {
    type: "REMOTE_REVISION",
    commands: [{ type: "UPDATE_CELL", sheetId: "Sheet1", col: 1, row: 15, content: "=15" }],
  },
  {
    type: "REMOTE_REVISION",
    commands: [{ type: "UPDATE_CELL", sheetId: "Sheet1", col: 1, row: 16, content: "=78" }],
  },
  {
    type: "REMOTE_REVISION",
    commands: [{ type: "UPDATE_CELL", sheetId: "Sheet1", col: 1, row: 17, content: "=56" }],
  },
  {
    type: "REVISION_UNDONE",
    undoneRevisionId: "89c30518-9f4f-4b32-9c9b-26af5b70ff97",
  },
  {
    type: "REVISION_UNDONE",
    undoneRevisionId: "1b024023-7dd1-40f1-b3d5-f963c5cedd63",
  },
  {
    type: "REVISION_REDONE",
    redoneRevisionId: "1b024023-7dd1-40f1-b3d5-f963c5cedd63",
  },
  {
    type: "REVISION_REDONE",
    redoneRevisionId: "89c30518-9f4f-4b32-9c9b-26af5b70ff97",
  },
  {
    type: "REMOTE_REVISION",
    commands: [
      {
        type: "SET_FORMATTING",
        sheetId: "Sheet1",
        target: [{ left: 1, right: 1, top: 12, bottom: 17 }],
        format: "#,##0.00",
      },
    ],
  },
  {
    type: "REMOTE_REVISION",
    commands: [
      {
        type: "SET_FORMATTING",
        sheetId: "Sheet1",
        target: [{ left: 0, right: 0, top: 12, bottom: 17 }],
        style: { textColor: "#f6b26b" },
      },
    ],
  },
  {
    type: "REMOTE_REVISION",
    commands: [
      {
        type: "SET_FORMATTING",
        sheetId: "Sheet1",
        target: [{ left: 0, right: 0, top: 12, bottom: 17 }],
        style: { bold: true },
      },
    ],
  },
  {
    type: "REMOTE_REVISION",
    commands: [
      {
        type: "SET_FORMATTING",
        sheetId: "Sheet1",
        target: [{ left: 0, right: 0, top: 12, bottom: 17 }],
        style: { italic: true },
      },
    ],
  },
  {
    type: "REMOTE_REVISION",
    commands: [
      {
        type: "SET_FORMATTING",
        sheetId: "Sheet1",
        target: [{ left: 0, right: 0, top: 12, bottom: 17 }],
        style: { strikethrough: true },
      },
    ],
  },
  {
    type: "REMOTE_REVISION",
    commands: [
      {
        type: "CREATE_CHART",
        sheetId: "Sheet1",
        id: "b00124b9-cf35-4c6e-afbc-a09c9de075d3",
        position: { x: 192, y: 276 },
        definition: {
          title: "",
          dataSets: ["B13:B18"],
          labelRange: "A14:A18",
          type: "bar",
          stackedBar: false,
          dataSetsHaveTitle: false,
          background: "#FFFFFF",
          verticalAxisPosition: "left",
          legendPosition: "top",
        },
      },
    ],
  },
  {
    type: "REMOTE_REVISION",
    commands: [
      {
        type: "UPDATE_FIGURE",
        sheetId: "Sheet1",
        id: "b00124b9-cf35-4c6e-afbc-a09c9de075d3",
        x: 427,
        y: 194,
      },
    ],
  },
  {
    type: "REMOTE_REVISION",
    commands: [
      {
        type: "UPDATE_CHART",
        id: "b00124b9-cf35-4c6e-afbc-a09c9de075d3",
        definition: { type: "line" },
      },
    ],
  },
  {
    type: "REMOTE_REVISION",
    commands: [
      {
        type: "ADD_CONDITIONAL_FORMAT",
        cf: {
          rule: {
            type: "CellIsRule",
            operator: "IsNotEmpty",
            values: [],
            style: { fillColor: "#b6d7a8" },
          },
          id: "22d6b2d6-f454-4dfa-817c-a68abbd3defe",
        },
        target: [{ top: 12, bottom: 17, left: 1, right: 1 }],
        sheetId: "Sheet1",
      },
    ],
  },
  {
    type: "REVISION_UNDONE",
    undoneRevisionId: "00af0687-0b82-4f4d-9629-b59230032819",
  },
  {
    type: "REMOTE_REVISION",
    commands: [
      {
        type: "DUPLICATE_SHEET",
        sheetId: "Sheet1",
        sheetIdTo: "a96f8252-31fd-4bcb-a80e-79e4f8073f2d",
      },
    ],
  },
  {
    type: "REMOTE_REVISION",
    commands: [
      {
        type: "ADD_CONDITIONAL_FORMAT",
        cf: {
          rule: {
            type: "IconSetRule",
            icons: { upper: "arrowGood", middle: "arrowNeutral", lower: "arrowBad" },
            upperInflectionPoint: { type: "percentage", value: "66", operator: "gt" },
            lowerInflectionPoint: { type: "percentage", value: "33", operator: "gt" },
          },
          id: "531aaf3c-fefa-4fa9-9270-2d0cf0880e80",
        },
        target: [{ top: 12, bottom: 17, left: 1, right: 1 }],
        sheetId: "Sheet1",
      },
    ],
  },
  {
    type: "REMOTE_REVISION",
    commands: [
      {
        type: "UPDATE_FIGURE",
        sheetId: "a96f8252-31fd-4bcb-a80e-79e4f8073f2d",
        id: "dee94c25-f246-40f8-84d2-ebe0c1046a47",
        x: 516,
        y: 107,
      },
    ],
  },
  {
    type: "REMOTE_REVISION",
    commands: [
      {
        type: "ADD_COLUMNS_ROWS",
        sheetId: "a96f8252-31fd-4bcb-a80e-79e4f8073f2d",
        position: "after",
        dimension: "COL",
        base: 0,
        quantity: 1,
      },
    ],
  },
  {
    type: "REMOTE_REVISION",
    commands: [
      {
        type: "ADD_COLUMNS_ROWS",
        sheetId: "a96f8252-31fd-4bcb-a80e-79e4f8073f2d",
        position: "before",
        dimension: "COL",
        base: 0,
        quantity: 1,
      },
    ],
  },
  {
    type: "REMOTE_REVISION",
    commands: [
      {
        type: "ADD_COLUMNS_ROWS",
        sheetId: "a96f8252-31fd-4bcb-a80e-79e4f8073f2d",
        position: "before",
        base: 3,
        quantity: 4,
        dimension: "ROW",
      },
    ],
  },
  {
    type: "REMOTE_REVISION",
    commands: [
      {
        type: "RESIZE_COLUMNS_ROWS",
        dimension: "ROW",
        sheetId: "a96f8252-31fd-4bcb-a80e-79e4f8073f2d",
        elements: [1],
        size: 122,
      },
    ],
  },
  {
    type: "REMOTE_REVISION",
    commands: [
      {
        type: "REMOVE_COLUMNS_ROWS",
        sheetId: "Sheet1",
        dimension: "ROW",
        elements: [6, 5, 4, 3, 2],
      },
    ],
  },
  {
    type: "REMOTE_REVISION",
    commands: [
      { type: "SET_BORDER", border: undefined, sheetId: "Sheet1", col: 6, row: 1 },
      {
        type: "UPDATE_CELL",
        col: 6,
        row: 1,
        sheetId: "Sheet1",
        content: "A",
        style: { textColor: "#f6b26b", bold: true, italic: true, strikethrough: true },
      },
      { type: "SET_BORDER", border: undefined, sheetId: "Sheet1", col: 7, row: 1 },
      {
        type: "UPDATE_CELL",
        col: 7,
        row: 1,
        sheetId: "Sheet1",
        content: "=1",
        style: null,
        format: "#,##0.00",
      },
      {
        type: "ADD_CONDITIONAL_FORMAT",
        cf: {
          id: "531aaf3c-fefa-4fa9-9270-2d0cf0880e80",
          rule: {
            type: "IconSetRule",
            icons: { upper: "arrowGood", middle: "arrowNeutral", lower: "arrowBad" },
            upperInflectionPoint: { type: "percentage", value: "66", operator: "gt" },
            lowerInflectionPoint: { type: "percentage", value: "33", operator: "gt" },
          },
        },
        target: [
          { top: 7, bottom: 12, left: 1, right: 1 },
          { top: 1, bottom: 1, left: 7, right: 7 },
        ],
        sheetId: "Sheet1",
      },
      { type: "SET_BORDER", border: undefined, sheetId: "Sheet1", col: 6, row: 2 },
      {
        type: "UPDATE_CELL",
        col: 6,
        row: 2,
        sheetId: "Sheet1",
        content: "B",
        style: { textColor: "#f6b26b", bold: true, italic: true, strikethrough: true },
      },
      { type: "SET_BORDER", border: undefined, sheetId: "Sheet1", col: 7, row: 2 },
      {
        type: "UPDATE_CELL",
        col: 7,
        row: 2,
        sheetId: "Sheet1",
        content: "10",
        style: null,
        format: "#,##0.00",
      },
      {
        type: "ADD_CONDITIONAL_FORMAT",
        cf: {
          id: "531aaf3c-fefa-4fa9-9270-2d0cf0880e80",
          rule: {
            type: "IconSetRule",
            icons: { upper: "arrowGood", middle: "arrowNeutral", lower: "arrowBad" },
            upperInflectionPoint: { type: "percentage", value: "66", operator: "gt" },
            lowerInflectionPoint: { type: "percentage", value: "33", operator: "gt" },
          },
        },
        target: [
          { top: 7, bottom: 12, left: 1, right: 1 },
          { top: 1, bottom: 2, left: 7, right: 7 },
        ],
        sheetId: "Sheet1",
      },
      { type: "SET_BORDER", border: undefined, sheetId: "Sheet1", col: 6, row: 3 },
      {
        type: "UPDATE_CELL",
        col: 6,
        row: 3,
        sheetId: "Sheet1",
        content: "C",
        style: { textColor: "#f6b26b", bold: true, italic: true, strikethrough: true },
      },
      { type: "SET_BORDER", border: undefined, sheetId: "Sheet1", col: 7, row: 3 },
      {
        type: "UPDATE_CELL",
        col: 7,
        row: 3,
        sheetId: "Sheet1",
        content: "12",
        style: null,
        format: "#,##0.00",
      },
      {
        type: "ADD_CONDITIONAL_FORMAT",
        cf: {
          id: "531aaf3c-fefa-4fa9-9270-2d0cf0880e80",
          rule: {
            type: "IconSetRule",
            icons: { upper: "arrowGood", middle: "arrowNeutral", lower: "arrowBad" },
            upperInflectionPoint: { type: "percentage", value: "66", operator: "gt" },
            lowerInflectionPoint: { type: "percentage", value: "33", operator: "gt" },
          },
        },
        target: [
          { top: 7, bottom: 12, left: 1, right: 1 },
          { top: 1, bottom: 3, left: 7, right: 7 },
        ],
        sheetId: "Sheet1",
      },
      { type: "SET_BORDER", border: undefined, sheetId: "Sheet1", col: 6, row: 4 },
      {
        type: "UPDATE_CELL",
        col: 6,
        row: 4,
        sheetId: "Sheet1",
        content: "D",
        style: { textColor: "#f6b26b", bold: true, italic: true, strikethrough: true },
      },
      { type: "SET_BORDER", border: undefined, sheetId: "Sheet1", col: 7, row: 4 },
      {
        type: "UPDATE_CELL",
        col: 7,
        row: 4,
        sheetId: "Sheet1",
        content: "=15",
        style: null,
        format: "#,##0.00",
      },
      {
        type: "ADD_CONDITIONAL_FORMAT",
        cf: {
          id: "531aaf3c-fefa-4fa9-9270-2d0cf0880e80",
          rule: {
            type: "IconSetRule",
            icons: { upper: "arrowGood", middle: "arrowNeutral", lower: "arrowBad" },
            upperInflectionPoint: { type: "percentage", value: "66", operator: "gt" },
            lowerInflectionPoint: { type: "percentage", value: "33", operator: "gt" },
          },
        },
        target: [
          { top: 7, bottom: 12, left: 1, right: 1 },
          { top: 1, bottom: 4, left: 7, right: 7 },
        ],
        sheetId: "Sheet1",
      },
      { type: "SET_BORDER", border: undefined, sheetId: "Sheet1", col: 6, row: 5 },
      {
        type: "UPDATE_CELL",
        col: 6,
        row: 5,
        sheetId: "Sheet1",
        content: "E",
        style: { textColor: "#f6b26b", bold: true, italic: true, strikethrough: true },
      },
      { type: "SET_BORDER", border: undefined, sheetId: "Sheet1", col: 7, row: 5 },
      {
        type: "UPDATE_CELL",
        col: 7,
        row: 5,
        sheetId: "Sheet1",
        content: "=78",
        style: null,
        format: "#,##0.00",
      },
      {
        type: "ADD_CONDITIONAL_FORMAT",
        cf: {
          id: "531aaf3c-fefa-4fa9-9270-2d0cf0880e80",
          rule: {
            type: "IconSetRule",
            icons: { upper: "arrowGood", middle: "arrowNeutral", lower: "arrowBad" },
            upperInflectionPoint: { type: "percentage", value: "66", operator: "gt" },
            lowerInflectionPoint: { type: "percentage", value: "33", operator: "gt" },
          },
        },
        target: [
          { top: 7, bottom: 12, left: 1, right: 1 },
          { top: 1, bottom: 5, left: 7, right: 7 },
        ],
        sheetId: "Sheet1",
      },
      { type: "SET_BORDER", border: undefined, sheetId: "Sheet1", col: 6, row: 6 },
      {
        type: "UPDATE_CELL",
        col: 6,
        row: 6,
        sheetId: "Sheet1",
        content: "F",
        style: { textColor: "#f6b26b", bold: true, italic: true, strikethrough: true },
      },
      { type: "SET_BORDER", border: undefined, sheetId: "Sheet1", col: 7, row: 6 },
      {
        type: "UPDATE_CELL",
        col: 7,
        row: 6,
        sheetId: "Sheet1",
        content: "=56",
        style: null,
        format: "#,##0.00",
      },
      {
        type: "ADD_CONDITIONAL_FORMAT",
        cf: {
          id: "531aaf3c-fefa-4fa9-9270-2d0cf0880e80",
          rule: {
            type: "IconSetRule",
            icons: { upper: "arrowGood", middle: "arrowNeutral", lower: "arrowBad" },
            upperInflectionPoint: { type: "percentage", value: "66", operator: "gt" },
            lowerInflectionPoint: { type: "percentage", value: "33", operator: "gt" },
          },
        },
        target: [
          { top: 7, bottom: 12, left: 1, right: 1 },
          { top: 1, bottom: 6, left: 7, right: 7 },
        ],
        sheetId: "Sheet1",
      },
    ],
  },
  {
    type: "REMOTE_REVISION",
    commands: [
      {
        type: "UPDATE_FIGURE",
        sheetId: "Sheet1",
        id: "b00124b9-cf35-4c6e-afbc-a09c9de075d3",
        x: 429,
        y: 242,
      },
    ],
  },
  {
    type: "REMOTE_REVISION",
    commands: [
      { type: "ADD_MERGE", sheetId: "Sheet1", target: [{ left: 4, right: 5, top: 2, bottom: 6 }] },
    ],
  },
  {
    type: "REVISION_UNDONE",
    undoneRevisionId: "0e84658b-2d67-4951-bdbe-4f621d60dfde",
  },
  {
    type: "REMOTE_REVISION",
    commands: [
      {
        type: "ADD_COLUMNS_ROWS",
        sheetId: "Sheet1",
        position: "after",
        dimension: "COL",
        base: 4,
        quantity: 1,
      },
    ],
  },
  {
    type: "REMOTE_REVISION",
    commands: [
      {
        type: "ADD_COLUMNS_ROWS",
        sheetId: "Sheet1",
        position: "before",
        dimension: "COL",
        base: 4,
        quantity: 1,
      },
    ],
  },
];

const commands: Command[][] = revisions.map((revision) => {
  switch (revision.type) {
    case "REMOTE_REVISION":
      if (revision.commands === undefined) {
        console.log(revision);
      }
      return revision.commands as Command[];
    case "REVISION_UNDONE":
      return [{ type: "REQUEST_UNDO" }];
    case "REVISION_REDONE":
      return [{ type: "REQUEST_REDO" }];
    default:
      return [];
  }
});

type UserAction = { commands: Command[]; user: Model };

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  return arr
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);
}

function randomIntFromInterval(min: number, max: number) {
  // min and max included
  return Math.floor(Math.random() * (max - min + 1) + min);
}

function randomGroup(commands: UserAction[]): UserAction[][] {
  const result: any[] = [];
  while (commands.length) {
    const groupSize = randomIntFromInterval(1, 6);
    result.push(commands.splice(0, groupSize));
  }
  return result;
}

function assignUser(commands: Command[][], users: Model[]): UserAction[] {
  return commands.map((commands) => ({ commands, user: randomChoice(users) }));
}

describe("monkey party", () => {
  let network: MockTransportService;
  let alice: Model;
  let bob: Model;
  let charlie: Model;
  const now = Date.now();
  const seeds = range(0, 200).map((i) => (now + i).toString());
  seeds;
  let print = () => {
    printDebugModel(alice);
    printDebugModel(bob);
    printDebugModel(charlie);
  };
  print;

  beforeEach(() => {
    ({ network, alice, bob, charlie } = setupCollaborativeEnv());
  });

  let x: string[] = [];
  //1643365577223
  // 1643639531275 1643639531325
  // export cells 1643724900272
  // test.each(["1643724900272"])("monkey party with seed %s", (seed) => {
  test.each(seeds)("monkey party with seed %s", (seed) => {
    // test("monkey party with seed %s", () => {
    seedrandom(seed, { global: true });
    shuffle;
    const actions = assignUser(shuffle(commands), [alice, bob, charlie]);
    const commandGroups = randomGroup(actions);
    let count = 0;
    for (const commandGroup of commandGroups) {
      count++;
      x.push("network.concurrent(() => {");
      network.concurrent(() => {
        for (const { commands, user } of commandGroup) {
          if (Math.random() > 0.9) {
            const result = user.dispatch("REQUEST_UNDO");
            if (!result.isSuccessful) {
              // x.push(`undo(${user["config"].client.name.toLowerCase()}) // refused`);
            } else {
              x.push(`undo(${user["config"].client.name.toLowerCase()})`);
            }
          } else if (Math.random() > 0.9) {
            const result = user.dispatch("REQUEST_REDO");
            if (!result.isSuccessful) {
              // x.push(`redo(${user["config"].client.name.toLowerCase()}) // refused`);
            } else {
              x.push(`redo(${user["config"].client.name.toLowerCase()})`);
            }
          }
          for (const command of commands) {
            x.push(
              `${user["config"].client.name.toLowerCase()}.dispatch("${
                command.type
              }", ${JSON.stringify({ ...command, type: undefined })});`
            );
            user.dispatch(command.type, deepCopy(command));
          }
        }
        if (count === 12) {
          // console.log(x.join("\n"));
        }
      });
      x.push("});");
      // console.log(count);
      // printDebugModel(alice);
      // printDebugModel(bob);
      // if (count === 15) {
      // }
      // expect([alice, bob, charlie]).toHaveSynchronizedExportedData();
    }
    expect([alice, bob, charlie]).toHaveSynchronizedExportedData();
  });

  test("Tu dois foirer", () => {
    seedrandom("1643639531275", { global: true });
    network.concurrent(() => {
      charlie.dispatch("SET_BORDER", { border: undefined, sheetId: "Sheet1", col: 6, row: 6 });
      charlie.dispatch("UPDATE_CELL", {
        col: 6,
        row: 6,
        sheetId: "Sheet1",
        content: "F",
        style: { textColor: "#f6b26b", bold: true, italic: true, strikethrough: true },
      });
    });
    network.concurrent(() => {
      alice.dispatch("UPDATE_CELL", { sheetId: "Sheet1", col: 0, row: 12, content: "A" });
      redo(charlie); // refused
      charlie.dispatch("CREATE_CHART", {
        sheetId: "Sheet1",
        id: "b00124b9-cf35-4c6e-afbc-a09c9de075d3",
        position: { x: 192, y: 276 },
        definition: {
          title: "",
          dataSets: ["B13:B18"],
          labelRange: "A14:A18",
          type: "bar",
          stackedBar: false,
          dataSetsHaveTitle: false,
          background: "#FFFFFF",
          verticalAxisPosition: "left",
          legendPosition: "top",
        },
      });
      bob.dispatch("ADD_CONDITIONAL_FORMAT", {
        cf: {
          rule: {
            type: "CellIsRule",
            operator: "IsNotEmpty",
            values: [],
            style: { fillColor: "#b6d7a8" },
          },
          id: "22d6b2d6-f454-4dfa-817c-a68abbd3defe",
        },
        target: [{ top: 12, bottom: 17, left: 1, right: 1 }],
        sheetId: "Sheet1",
      });
      charlie.dispatch("UPDATE_CELL", {
        sheetId: "Sheet1",
        col: 3,
        row: 7,
        style: null,
        content: "=D5",
        format: "",
      });
      charlie.dispatch("SET_BORDER", { border: undefined, sheetId: "Sheet1", col: 3, row: 7 });
      charlie.dispatch("UPDATE_CELL", {
        sheetId: "Sheet1",
        col: 3,
        row: 8,
        style: null,
        content: "=D6",
        format: "",
      });
      charlie.dispatch("SET_BORDER", { border: undefined, sheetId: "Sheet1", col: 3, row: 8 });
      charlie.dispatch("UPDATE_CELL", {
        sheetId: "Sheet1",
        col: 3,
        row: 9,
        style: null,
        content: "=D7",
        format: "",
      });
      charlie.dispatch("SET_BORDER", { border: undefined, sheetId: "Sheet1", col: 3, row: 9 });
      charlie.dispatch("UPDATE_CELL", {
        sheetId: "Sheet1",
        col: 3,
        row: 10,
        style: null,
        content: "=D8",
        format: "",
      });
      charlie.dispatch("SET_BORDER", { border: undefined, sheetId: "Sheet1", col: 3, row: 10 });
      charlie.dispatch("UPDATE_CELL", {
        sheetId: "Sheet1",
        col: 3,
        row: 11,
        style: null,
        content: "=D9",
        format: "",
      });
      charlie.dispatch("SET_BORDER", { border: undefined, sheetId: "Sheet1", col: 3, row: 11 });
      charlie.dispatch("UPDATE_CELL", {
        sheetId: "Sheet1",
        col: 3,
        row: 12,
        style: null,
        content: "=D10",
        format: "",
      });
      charlie.dispatch("SET_BORDER", { border: undefined, sheetId: "Sheet1", col: 3, row: 12 });
      charlie.dispatch("UPDATE_CELL", {
        sheetId: "Sheet1",
        col: 3,
        row: 13,
        style: null,
        content: "=D11",
        format: "",
      });
      charlie.dispatch("SET_BORDER", { border: undefined, sheetId: "Sheet1", col: 3, row: 13 });
      charlie.dispatch("UPDATE_CELL", {
        sheetId: "Sheet1",
        col: 3,
        row: 14,
        style: null,
        content: "=D12",
        format: "",
      });
      charlie.dispatch("SET_BORDER", { border: undefined, sheetId: "Sheet1", col: 3, row: 14 });
      charlie.dispatch("UPDATE_CELL", {
        sheetId: "Sheet1",
        col: 3,
        row: 15,
        style: null,
        content: "=D13",
        format: "",
      });
      charlie.dispatch("SET_BORDER", { border: undefined, sheetId: "Sheet1", col: 3, row: 15 });
      charlie.dispatch("UPDATE_CELL", {
        sheetId: "Sheet1",
        col: 3,
        row: 16,
        style: null,
        content: "=D14",
        format: "",
      });
      charlie.dispatch("SET_BORDER", { border: undefined, sheetId: "Sheet1", col: 3, row: 16 });
      charlie.dispatch("UPDATE_CELL", {
        sheetId: "Sheet1",
        col: 3,
        row: 17,
        style: null,
        content: "=D15",
        format: "",
      });
      charlie.dispatch("SET_BORDER", { border: undefined, sheetId: "Sheet1", col: 3, row: 17 });
      charlie.dispatch("UPDATE_CELL", {
        sheetId: "Sheet1",
        col: 3,
        row: 18,
        style: null,
        content: "=D16",
        format: "",
      });
      charlie.dispatch("SET_BORDER", { border: undefined, sheetId: "Sheet1", col: 3, row: 18 });
      charlie.dispatch("UPDATE_CELL", {
        sheetId: "Sheet1",
        col: 3,
        row: 19,
        style: null,
        content: "=D17",
        format: "",
      });
      charlie.dispatch("SET_BORDER", { border: undefined, sheetId: "Sheet1", col: 3, row: 19 });
      charlie.dispatch("UPDATE_CELL", {
        sheetId: "Sheet1",
        col: 3,
        row: 20,
        style: null,
        content: "=D18",
        format: "",
      });
      charlie.dispatch("SET_BORDER", { border: undefined, sheetId: "Sheet1", col: 3, row: 20 });
      charlie.dispatch("UPDATE_CELL", {
        sheetId: "Sheet1",
        col: 3,
        row: 21,
        style: null,
        content: "=D19",
        format: "",
      });
      charlie.dispatch("SET_BORDER", { border: undefined, sheetId: "Sheet1", col: 3, row: 21 });
      charlie.dispatch("UPDATE_CELL", {
        sheetId: "Sheet1",
        col: 3,
        row: 22,
        style: null,
        content: "=D20",
        format: "",
      });
      charlie.dispatch("SET_BORDER", { border: undefined, sheetId: "Sheet1", col: 3, row: 22 });
      charlie.dispatch("UPDATE_CELL", {
        sheetId: "Sheet1",
        col: 3,
        row: 23,
        style: null,
        content: "=D21",
        format: "",
      });
      charlie.dispatch("SET_BORDER", { border: undefined, sheetId: "Sheet1", col: 3, row: 23 });
      charlie.dispatch("UPDATE_CELL", {
        sheetId: "Sheet1",
        col: 3,
        row: 24,
        style: null,
        content: "=D22",
        format: "",
      });
      charlie.dispatch("SET_BORDER", { border: undefined, sheetId: "Sheet1", col: 3, row: 24 });
      charlie.dispatch("UPDATE_CELL", {
        sheetId: "Sheet1",
        col: 3,
        row: 25,
        style: null,
        content: "=D23",
        format: "",
      });
      charlie.dispatch("SET_BORDER", { border: undefined, sheetId: "Sheet1", col: 3, row: 25 });
      charlie.dispatch("UPDATE_CELL", {
        sheetId: "Sheet1",
        col: 3,
        row: 26,
        style: null,
        content: "=D24",
        format: "",
      });
      charlie.dispatch("SET_BORDER", { border: undefined, sheetId: "Sheet1", col: 3, row: 26 });
      charlie.dispatch("SET_FORMATTING", {
        sheetId: "Sheet1",
        target: [{ left: 0, right: 0, top: 12, bottom: 17 }],
        style: { italic: true },
      });
      redo(charlie); // refused
      charlie.dispatch("REQUEST_UNDO", {});
    });
    network.concurrent(() => {
      alice.dispatch("UPDATE_CELL", { sheetId: "Sheet1", col: 1, row: 13, content: "=2" });
    });
    network.concurrent(() => {
      redo(bob); // refused
      bob.dispatch("RESIZE_COLUMNS_ROWS", {
        dimension: "ROW",
        sheetId: "a96f8252-31fd-4bcb-a80e-79e4f8073f2d",
        elements: [1],
        size: 122,
      });
    });
    network.concurrent(() => {
      alice.dispatch("UPDATE_FIGURE", {
        sheetId: "Sheet1",
        id: "b00124b9-cf35-4c6e-afbc-a09c9de075d3",
        x: 427,
        y: 194,
      });
      undo(charlie);
      charlie.dispatch("UPDATE_CHART", {
        id: "b00124b9-cf35-4c6e-afbc-a09c9de075d3",
        definition: { type: "line" },
      });
      charlie.dispatch("UPDATE_CELL", { sheetId: "Sheet1", col: 1, row: 13, content: "10" });
      alice.dispatch("UPDATE_CELL", { sheetId: "Sheet1", col: 1, row: 17, content: "=56" });
      alice.dispatch("UPDATE_CELL", { sheetId: "Sheet1", col: 0, row: 15, content: "D" });
      bob.dispatch("REQUEST_UNDO", {});
    });
    network.concurrent(() => {
      alice.dispatch("UPDATE_FIGURE", {
        sheetId: "Sheet1",
        id: "b00124b9-cf35-4c6e-afbc-a09c9de075d3",
        x: 429,
        y: 242,
      });
      bob.dispatch("REQUEST_UNDO", {});
      redo(charlie);
      charlie.dispatch("UPDATE_CELL", { sheetId: "Sheet1", col: 0, row: 16, content: "E" });
      charlie.dispatch("REQUEST_REDO", {});
    });
    network.concurrent(() => {
      bob.dispatch("UPDATE_CELL", { sheetId: "Sheet1", col: 0, row: 13, content: "B" });
      charlie.dispatch("UPDATE_CELL", { sheetId: "Sheet1", col: 1, row: 14, content: "12" });
      charlie.dispatch("ADD_MERGE", {
        sheetId: "Sheet1",
        target: [{ left: 4, right: 5, top: 2, bottom: 6 }],
      });
      charlie.dispatch("REQUEST_UNDO", {});
    });
    network.concurrent(() => {
      alice.dispatch("UPDATE_CELL", { sheetId: "Sheet1", col: 0, row: 17, content: "F" });
      undo(bob);
      bob.dispatch("ADD_COLUMNS_ROWS", {
        sheetId: "a96f8252-31fd-4bcb-a80e-79e4f8073f2d",
        position: "after",
        dimension: "COL",
        base: 0,
        quantity: 1,
      });
      charlie.dispatch("UPDATE_CELL", { sheetId: "Sheet1", col: 1, row: 16, content: "=78" });
      charlie.dispatch("UPDATE_FIGURE", {
        sheetId: "a96f8252-31fd-4bcb-a80e-79e4f8073f2d",
        id: "dee94c25-f246-40f8-84d2-ebe0c1046a47",
        x: 516,
        y: 107,
      });
      alice.dispatch("ADD_COLUMNS_ROWS", {
        sheetId: "Sheet1",
        position: "before",
        dimension: "COL",
        base: 4,
        quantity: 1,
      });
      undo(alice);
      alice.dispatch("REQUEST_UNDO", {});
    });
    network.concurrent(() => {
      charlie.dispatch("UPDATE_CELL", { sheetId: "Sheet1", col: 1, row: 14, content: "=6" });
      charlie.dispatch("SET_FORMATTING", {
        sheetId: "Sheet1",
        target: [{ left: 0, right: 0, top: 12, bottom: 17 }],
        style: { textColor: "#f6b26b" },
      });
      alice.dispatch("REQUEST_REDO", {});
      charlie.dispatch("ADD_COLUMNS_ROWS", {
        sheetId: "Sheet1",
        position: "after",
        dimension: "COL",
        base: 4,
        quantity: 1,
      });
    });
    network.concurrent(() => {
      alice.dispatch("UPDATE_CELL", { sheetId: "Sheet1", col: 2, row: 4, content: "coucou" });
    });
    network.concurrent(() => {
      bob.dispatch("ADD_COLUMNS_ROWS", {
        sheetId: "a96f8252-31fd-4bcb-a80e-79e4f8073f2d",
        position: "before",
        base: 3,
        quantity: 4,
        dimension: "ROW",
      });
      bob.dispatch("ADD_COLUMNS_ROWS", {
        sheetId: "Sheet1",
        position: "before",
        dimension: "COL",
        base: 0,
        quantity: 1,
      });
    });
    network.concurrent(() => {
      undo(bob);
      bob.dispatch("SET_FORMATTING", {
        sheetId: "Sheet1",
        target: [{ left: 0, right: 0, top: 12, bottom: 17 }],
        style: { bold: true },
      });
      alice.dispatch("REMOVE_COLUMNS_ROWS", {
        sheetId: "Sheet1",
        dimension: "ROW",
        elements: [6, 5, 4, 3, 2],
      });
      undo(charlie);
      alice.dispatch("DUPLICATE_SHEET", {
        sheetId: "Sheet1",
        sheetIdTo: "a96f8252-31fd-4bcb-a80e-79e4f8073f2d",
      });
      undo(charlie); // refused
      charlie.dispatch("ADD_COLUMNS_ROWS", {
        sheetId: "a96f8252-31fd-4bcb-a80e-79e4f8073f2d",
        position: "before",
        dimension: "COL",
        base: 0,
        quantity: 1,
      });
    });
    expect([alice, bob, charlie]).toHaveSynchronizedExportedData();
  });
});
