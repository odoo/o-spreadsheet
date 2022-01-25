import seedrandom from "seedrandom";
import { Model } from "../../src";
import { range } from "../../src/helpers";
import { Command } from "../../src/types";
import { MockTransportService } from "../__mocks__/transport_service";
import { setupCollaborativeEnv } from "./collaborative_helpers";

const revisions = [
  {
    type: "REMOTE_REVISION",
    version: 1,
    serverRevisionId: "START_REVISION",
    nextRevisionId: "fd221ace-cc71-4622-8a75-3cb04f442294",
    clientId: "af345cc8-3879-40ba-ad0d-28714ae95ac1",
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
    version: 1,
    serverRevisionId: "fd221ace-cc71-4622-8a75-3cb04f442294",
    nextRevisionId: "05986fed-0946-43d6-83ca-4b17ff00b37b",
    clientId: "8678545c-cbcc-451f-80b4-9187226e27e6",
    commands: [{ type: "UPDATE_CELL", sheetId: "Sheet1", col: 2, row: 4, content: "coucou" }],
  },
  {
    type: "REMOTE_REVISION",
    version: 1,
    serverRevisionId: "05986fed-0946-43d6-83ca-4b17ff00b37b",
    nextRevisionId: "11d9672e-df57-41ad-87ec-18a38bd829b7",
    clientId: "8678545c-cbcc-451f-80b4-9187226e27e6",
    commands: [{ type: "UPDATE_CELL", sheetId: "Sheet1", col: 2, row: 5, content: "=C5" }],
  },
  {
    type: "REMOTE_REVISION",
    version: 1,
    serverRevisionId: "11d9672e-df57-41ad-87ec-18a38bd829b7",
    nextRevisionId: "79ee077b-d027-48da-8b12-60fb8e822a15",
    clientId: "8678545c-cbcc-451f-80b4-9187226e27e6",
    commands: [{ type: "UPDATE_CELL", sheetId: "Sheet1", col: 2, row: 6, content: "=C4" }],
  },
  {
    type: "REMOTE_REVISION",
    version: 1,
    serverRevisionId: "79ee077b-d027-48da-8b12-60fb8e822a15",
    nextRevisionId: "6beaec25-7250-49af-af50-2f3e365ced24",
    clientId: "8678545c-cbcc-451f-80b4-9187226e27e6",
    commands: [{ type: "UPDATE_CELL", sheetId: "Sheet1", col: 2, row: 3, content: "1" }],
  },
  {
    type: "REMOTE_REVISION",
    version: 1,
    serverRevisionId: "6beaec25-7250-49af-af50-2f3e365ced24",
    nextRevisionId: "d6126169-082a-45b6-9376-f2bfaf55f156",
    clientId: "8678545c-cbcc-451f-80b4-9187226e27e6",
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
    version: 1,
    serverRevisionId: "d6126169-082a-45b6-9376-f2bfaf55f156",
    nextRevisionId: "6912f214-8ca0-4e46-9a91-a7bb19e9b15c",
    clientId: "8678545c-cbcc-451f-80b4-9187226e27e6",
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
      { type: "SET_BORDER", sheetId: "Sheet1", col: 3, row: 7 },
      {
        type: "UPDATE_CELL",
        sheetId: "Sheet1",
        col: 3,
        row: 8,
        style: null,
        content: "=D6",
        format: "",
      },
      { type: "SET_BORDER", sheetId: "Sheet1", col: 3, row: 8 },
      {
        type: "UPDATE_CELL",
        sheetId: "Sheet1",
        col: 3,
        row: 9,
        style: null,
        content: "=D7",
        format: "",
      },
      { type: "SET_BORDER", sheetId: "Sheet1", col: 3, row: 9 },
      {
        type: "UPDATE_CELL",
        sheetId: "Sheet1",
        col: 3,
        row: 10,
        style: null,
        content: "=D8",
        format: "",
      },
      { type: "SET_BORDER", sheetId: "Sheet1", col: 3, row: 10 },
      {
        type: "UPDATE_CELL",
        sheetId: "Sheet1",
        col: 3,
        row: 11,
        style: null,
        content: "=D9",
        format: "",
      },
      { type: "SET_BORDER", sheetId: "Sheet1", col: 3, row: 11 },
      {
        type: "UPDATE_CELL",
        sheetId: "Sheet1",
        col: 3,
        row: 12,
        style: null,
        content: "=D10",
        format: "",
      },
      { type: "SET_BORDER", sheetId: "Sheet1", col: 3, row: 12 },
      {
        type: "UPDATE_CELL",
        sheetId: "Sheet1",
        col: 3,
        row: 13,
        style: null,
        content: "=D11",
        format: "",
      },
      { type: "SET_BORDER", sheetId: "Sheet1", col: 3, row: 13 },
      {
        type: "UPDATE_CELL",
        sheetId: "Sheet1",
        col: 3,
        row: 14,
        style: null,
        content: "=D12",
        format: "",
      },
      { type: "SET_BORDER", sheetId: "Sheet1", col: 3, row: 14 },
      {
        type: "UPDATE_CELL",
        sheetId: "Sheet1",
        col: 3,
        row: 15,
        style: null,
        content: "=D13",
        format: "",
      },
      { type: "SET_BORDER", sheetId: "Sheet1", col: 3, row: 15 },
      {
        type: "UPDATE_CELL",
        sheetId: "Sheet1",
        col: 3,
        row: 16,
        style: null,
        content: "=D14",
        format: "",
      },
      { type: "SET_BORDER", sheetId: "Sheet1", col: 3, row: 16 },
      {
        type: "UPDATE_CELL",
        sheetId: "Sheet1",
        col: 3,
        row: 17,
        style: null,
        content: "=D15",
        format: "",
      },
      { type: "SET_BORDER", sheetId: "Sheet1", col: 3, row: 17 },
      {
        type: "UPDATE_CELL",
        sheetId: "Sheet1",
        col: 3,
        row: 18,
        style: null,
        content: "=D16",
        format: "",
      },
      { type: "SET_BORDER", sheetId: "Sheet1", col: 3, row: 18 },
      {
        type: "UPDATE_CELL",
        sheetId: "Sheet1",
        col: 3,
        row: 19,
        style: null,
        content: "=D17",
        format: "",
      },
      { type: "SET_BORDER", sheetId: "Sheet1", col: 3, row: 19 },
      {
        type: "UPDATE_CELL",
        sheetId: "Sheet1",
        col: 3,
        row: 20,
        style: null,
        content: "=D18",
        format: "",
      },
      { type: "SET_BORDER", sheetId: "Sheet1", col: 3, row: 20 },
      {
        type: "UPDATE_CELL",
        sheetId: "Sheet1",
        col: 3,
        row: 21,
        style: null,
        content: "=D19",
        format: "",
      },
      { type: "SET_BORDER", sheetId: "Sheet1", col: 3, row: 21 },
      {
        type: "UPDATE_CELL",
        sheetId: "Sheet1",
        col: 3,
        row: 22,
        style: null,
        content: "=D20",
        format: "",
      },
      { type: "SET_BORDER", sheetId: "Sheet1", col: 3, row: 22 },
      {
        type: "UPDATE_CELL",
        sheetId: "Sheet1",
        col: 3,
        row: 23,
        style: null,
        content: "=D21",
        format: "",
      },
      { type: "SET_BORDER", sheetId: "Sheet1", col: 3, row: 23 },
      {
        type: "UPDATE_CELL",
        sheetId: "Sheet1",
        col: 3,
        row: 24,
        style: null,
        content: "=D22",
        format: "",
      },
      { type: "SET_BORDER", sheetId: "Sheet1", col: 3, row: 24 },
      {
        type: "UPDATE_CELL",
        sheetId: "Sheet1",
        col: 3,
        row: 25,
        style: null,
        content: "=D23",
        format: "",
      },
      { type: "SET_BORDER", sheetId: "Sheet1", col: 3, row: 25 },
      {
        type: "UPDATE_CELL",
        sheetId: "Sheet1",
        col: 3,
        row: 26,
        style: null,
        content: "=D24",
        format: "",
      },
      { type: "SET_BORDER", sheetId: "Sheet1", col: 3, row: 26 },
    ],
  },
  {
    type: "REVISION_UNDONE",
    version: 1,
    serverRevisionId: "6912f214-8ca0-4e46-9a91-a7bb19e9b15c",
    nextRevisionId: "462326d3-b5c1-4bdd-b1a8-f52f5b788916",
    undoneRevisionId: "6912f214-8ca0-4e46-9a91-a7bb19e9b15c",
  },
  {
    type: "REMOTE_REVISION",
    version: 1,
    serverRevisionId: "462326d3-b5c1-4bdd-b1a8-f52f5b788916",
    nextRevisionId: "420e40fb-3145-423f-91b4-131729483c2f",
    clientId: "8678545c-cbcc-451f-80b4-9187226e27e6",
    commands: [{ type: "UPDATE_CELL", sheetId: "Sheet1", col: 0, row: 12, content: "A" }],
  },
  {
    type: "REMOTE_REVISION",
    version: 1,
    serverRevisionId: "420e40fb-3145-423f-91b4-131729483c2f",
    nextRevisionId: "815cce98-1e55-4c13-920b-3e14c0f5a039",
    clientId: "8678545c-cbcc-451f-80b4-9187226e27e6",
    commands: [{ type: "UPDATE_CELL", sheetId: "Sheet1", col: 0, row: 13, content: "B" }],
  },
  {
    type: "REMOTE_REVISION",
    version: 1,
    serverRevisionId: "815cce98-1e55-4c13-920b-3e14c0f5a039",
    nextRevisionId: "7d4564d9-6f73-4f11-b7fb-3289e31913b1",
    clientId: "8678545c-cbcc-451f-80b4-9187226e27e6",
    commands: [{ type: "UPDATE_CELL", sheetId: "Sheet1", col: 0, row: 14, content: "C" }],
  },
  {
    type: "REMOTE_REVISION",
    version: 1,
    serverRevisionId: "7d4564d9-6f73-4f11-b7fb-3289e31913b1",
    nextRevisionId: "16e34054-5125-496f-a16a-9880a40b4aca",
    clientId: "8678545c-cbcc-451f-80b4-9187226e27e6",
    commands: [{ type: "UPDATE_CELL", sheetId: "Sheet1", col: 0, row: 15, content: "D" }],
  },
  {
    type: "REMOTE_REVISION",
    version: 1,
    serverRevisionId: "16e34054-5125-496f-a16a-9880a40b4aca",
    nextRevisionId: "b1baf38c-bb81-4d57-a00d-80b5ba856a8b",
    clientId: "8678545c-cbcc-451f-80b4-9187226e27e6",
    commands: [{ type: "UPDATE_CELL", sheetId: "Sheet1", col: 0, row: 16, content: "E" }],
  },
  {
    type: "REMOTE_REVISION",
    version: 1,
    serverRevisionId: "b1baf38c-bb81-4d57-a00d-80b5ba856a8b",
    nextRevisionId: "73933c69-e800-45fd-91fc-0ab788b44215",
    clientId: "8678545c-cbcc-451f-80b4-9187226e27e6",
    commands: [{ type: "UPDATE_CELL", sheetId: "Sheet1", col: 0, row: 17, content: "F" }],
  },
  {
    type: "REMOTE_REVISION",
    version: 1,
    serverRevisionId: "73933c69-e800-45fd-91fc-0ab788b44215",
    nextRevisionId: "4ff001ee-1cdd-4709-ac8d-7e6cbe07f08b",
    clientId: "8678545c-cbcc-451f-80b4-9187226e27e6",
    commands: [{ type: "UPDATE_CELL", sheetId: "Sheet1", col: 1, row: 12, content: "=1" }],
  },
  {
    type: "REMOTE_REVISION",
    version: 1,
    serverRevisionId: "4ff001ee-1cdd-4709-ac8d-7e6cbe07f08b",
    nextRevisionId: "287c77b7-5826-4c4b-a801-66f0e0d7758b",
    clientId: "8678545c-cbcc-451f-80b4-9187226e27e6",
    commands: [{ type: "UPDATE_CELL", sheetId: "Sheet1", col: 1, row: 13, content: "=2" }],
  },
  {
    type: "REMOTE_REVISION",
    version: 1,
    serverRevisionId: "287c77b7-5826-4c4b-a801-66f0e0d7758b",
    nextRevisionId: "bf068fa1-3c94-4f41-a063-ba2f5f5ec84a",
    clientId: "8678545c-cbcc-451f-80b4-9187226e27e6",
    commands: [{ type: "UPDATE_CELL", sheetId: "Sheet1", col: 1, row: 14, content: "=6" }],
  },
  {
    type: "REVISION_UNDONE",
    version: 1,
    serverRevisionId: "bf068fa1-3c94-4f41-a063-ba2f5f5ec84a",
    nextRevisionId: "3f2269a3-563f-40a2-a2b0-447ad13a3bd9",
    undoneRevisionId: "bf068fa1-3c94-4f41-a063-ba2f5f5ec84a",
  },
  {
    type: "REVISION_UNDONE",
    version: 1,
    serverRevisionId: "3f2269a3-563f-40a2-a2b0-447ad13a3bd9",
    nextRevisionId: "b1c9ace9-6f9f-4761-a10e-d1750b4e45f7",
    undoneRevisionId: "287c77b7-5826-4c4b-a801-66f0e0d7758b",
  },
  {
    type: "REMOTE_REVISION",
    version: 1,
    serverRevisionId: "b1c9ace9-6f9f-4761-a10e-d1750b4e45f7",
    nextRevisionId: "6572010b-bf83-4687-89cf-ecc741e896a0",
    clientId: "8678545c-cbcc-451f-80b4-9187226e27e6",
    commands: [{ type: "UPDATE_CELL", sheetId: "Sheet1", col: 1, row: 13, content: "10" }],
  },
  {
    type: "REMOTE_REVISION",
    version: 1,
    serverRevisionId: "6572010b-bf83-4687-89cf-ecc741e896a0",
    nextRevisionId: "9ddd85e5-7813-4e95-b101-d9ae1b7be7a5",
    clientId: "8678545c-cbcc-451f-80b4-9187226e27e6",
    commands: [{ type: "UPDATE_CELL", sheetId: "Sheet1", col: 1, row: 14, content: "12" }],
  },
  {
    type: "REMOTE_REVISION",
    version: 1,
    serverRevisionId: "9ddd85e5-7813-4e95-b101-d9ae1b7be7a5",
    nextRevisionId: "6d7c1fa4-6eba-4beb-89eb-937acff86f7c",
    clientId: "8678545c-cbcc-451f-80b4-9187226e27e6",
    commands: [{ type: "UPDATE_CELL", sheetId: "Sheet1", col: 1, row: 15, content: "=15" }],
  },
  {
    type: "REMOTE_REVISION",
    version: 1,
    serverRevisionId: "6d7c1fa4-6eba-4beb-89eb-937acff86f7c",
    nextRevisionId: "1b024023-7dd1-40f1-b3d5-f963c5cedd63",
    clientId: "8678545c-cbcc-451f-80b4-9187226e27e6",
    commands: [{ type: "UPDATE_CELL", sheetId: "Sheet1", col: 1, row: 16, content: "=78" }],
  },
  {
    type: "REMOTE_REVISION",
    version: 1,
    serverRevisionId: "1b024023-7dd1-40f1-b3d5-f963c5cedd63",
    nextRevisionId: "89c30518-9f4f-4b32-9c9b-26af5b70ff97",
    clientId: "8678545c-cbcc-451f-80b4-9187226e27e6",
    commands: [{ type: "UPDATE_CELL", sheetId: "Sheet1", col: 1, row: 17, content: "=56" }],
  },
  {
    type: "REVISION_UNDONE",
    version: 1,
    serverRevisionId: "89c30518-9f4f-4b32-9c9b-26af5b70ff97",
    nextRevisionId: "af34b23b-5562-4a69-8d8a-c6bd4af18214",
    undoneRevisionId: "89c30518-9f4f-4b32-9c9b-26af5b70ff97",
  },
  {
    type: "REVISION_UNDONE",
    version: 1,
    serverRevisionId: "af34b23b-5562-4a69-8d8a-c6bd4af18214",
    nextRevisionId: "1cd87b9f-8ef2-4a45-995f-6f271d1ee52c",
    undoneRevisionId: "1b024023-7dd1-40f1-b3d5-f963c5cedd63",
  },
  {
    type: "REVISION_REDONE",
    version: 1,
    serverRevisionId: "1cd87b9f-8ef2-4a45-995f-6f271d1ee52c",
    nextRevisionId: "0ad59c18-c8b2-4a75-a720-192f54993cf4",
    redoneRevisionId: "1b024023-7dd1-40f1-b3d5-f963c5cedd63",
  },
  {
    type: "REVISION_REDONE",
    version: 1,
    serverRevisionId: "0ad59c18-c8b2-4a75-a720-192f54993cf4",
    nextRevisionId: "683f2c94-afd2-4912-b59a-7b95a9606472",
    redoneRevisionId: "89c30518-9f4f-4b32-9c9b-26af5b70ff97",
  },
  {
    type: "REMOTE_REVISION",
    version: 1,
    serverRevisionId: "683f2c94-afd2-4912-b59a-7b95a9606472",
    nextRevisionId: "2cf7cfe5-bd6f-4b39-9784-4bc1d61ee9f3",
    clientId: "8678545c-cbcc-451f-80b4-9187226e27e6",
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
    version: 1,
    serverRevisionId: "2cf7cfe5-bd6f-4b39-9784-4bc1d61ee9f3",
    nextRevisionId: "86d53c4f-ea18-49ef-a313-effd28531d6e",
    clientId: "8678545c-cbcc-451f-80b4-9187226e27e6",
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
    version: 1,
    serverRevisionId: "86d53c4f-ea18-49ef-a313-effd28531d6e",
    nextRevisionId: "f6c16cba-bf3c-4635-9bde-7ea6bd47bf13",
    clientId: "8678545c-cbcc-451f-80b4-9187226e27e6",
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
    version: 1,
    serverRevisionId: "f6c16cba-bf3c-4635-9bde-7ea6bd47bf13",
    nextRevisionId: "2c81d600-a4cc-439c-bff0-261fb2350d0a",
    clientId: "8678545c-cbcc-451f-80b4-9187226e27e6",
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
    version: 1,
    serverRevisionId: "2c81d600-a4cc-439c-bff0-261fb2350d0a",
    nextRevisionId: "74c0b4a8-0a8c-423c-932f-ffe858df42c1",
    clientId: "8678545c-cbcc-451f-80b4-9187226e27e6",
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
    version: 1,
    serverRevisionId: "74c0b4a8-0a8c-423c-932f-ffe858df42c1",
    nextRevisionId: "5f93f1d1-b498-4fda-8f52-65e56dedb292",
    clientId: "8678545c-cbcc-451f-80b4-9187226e27e6",
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
    version: 1,
    serverRevisionId: "5f93f1d1-b498-4fda-8f52-65e56dedb292",
    nextRevisionId: "c75c2ef9-fdd8-490a-8976-76fb009966ba",
    clientId: "8678545c-cbcc-451f-80b4-9187226e27e6",
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
    version: 1,
    serverRevisionId: "c75c2ef9-fdd8-490a-8976-76fb009966ba",
    nextRevisionId: "eddc661d-fe59-4c24-abe3-129f4e4e19f7",
    clientId: "8678545c-cbcc-451f-80b4-9187226e27e6",
    commands: [
      {
        type: "UPDATE_CHART",
        id: "b00124b9-cf35-4c6e-afbc-a09c9de075d3",
        sheetId: "Sheet1",
        definition: { type: "line" },
      },
    ],
  },
  {
    type: "REMOTE_REVISION",
    version: 1,
    serverRevisionId: "eddc661d-fe59-4c24-abe3-129f4e4e19f7",
    nextRevisionId: "00af0687-0b82-4f4d-9629-b59230032819",
    clientId: "8678545c-cbcc-451f-80b4-9187226e27e6",
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
    version: 1,
    serverRevisionId: "00af0687-0b82-4f4d-9629-b59230032819",
    nextRevisionId: "2ce76149-9857-417e-b665-f01e33be7256",
    undoneRevisionId: "00af0687-0b82-4f4d-9629-b59230032819",
  },
  {
    type: "REMOTE_REVISION",
    version: 1,
    serverRevisionId: "2ce76149-9857-417e-b665-f01e33be7256",
    nextRevisionId: "eac7e156-c8bb-459a-ad68-91d866ce5d1a",
    clientId: "8678545c-cbcc-451f-80b4-9187226e27e6",
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
    version: 1,
    serverRevisionId: "eac7e156-c8bb-459a-ad68-91d866ce5d1a",
    nextRevisionId: "1148d926-3d31-4da0-8656-f4e6773e725d",
    clientId: "8678545c-cbcc-451f-80b4-9187226e27e6",
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
    version: 1,
    serverRevisionId: "1148d926-3d31-4da0-8656-f4e6773e725d",
    nextRevisionId: "4f549a2e-76df-425a-9469-7f688ff55cf5",
    clientId: "8678545c-cbcc-451f-80b4-9187226e27e6",
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
    version: 1,
    serverRevisionId: "4f549a2e-76df-425a-9469-7f688ff55cf5",
    nextRevisionId: "e9814f1c-9bfc-4815-8beb-e71c5890f805",
    clientId: "8678545c-cbcc-451f-80b4-9187226e27e6",
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
    version: 1,
    serverRevisionId: "e9814f1c-9bfc-4815-8beb-e71c5890f805",
    nextRevisionId: "9784b701-d964-4a25-b947-79870acffcd6",
    clientId: "8678545c-cbcc-451f-80b4-9187226e27e6",
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
    version: 1,
    serverRevisionId: "9784b701-d964-4a25-b947-79870acffcd6",
    nextRevisionId: "1d34a32e-88cb-4a45-8350-a28e2853aa3d",
    clientId: "8678545c-cbcc-451f-80b4-9187226e27e6",
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
    version: 1,
    serverRevisionId: "1d34a32e-88cb-4a45-8350-a28e2853aa3d",
    nextRevisionId: "ec3b9045-327e-4888-87d6-41a5af68b966",
    clientId: "8678545c-cbcc-451f-80b4-9187226e27e6",
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
    version: 1,
    serverRevisionId: "ec3b9045-327e-4888-87d6-41a5af68b966",
    nextRevisionId: "ef4e87d6-c33f-41e3-90bb-89755a6b0e7b",
    clientId: "8678545c-cbcc-451f-80b4-9187226e27e6",
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
    version: 1,
    serverRevisionId: "ef4e87d6-c33f-41e3-90bb-89755a6b0e7b",
    nextRevisionId: "35c65bbe-f432-4fab-9787-0557cf4e1d2a",
    clientId: "8678545c-cbcc-451f-80b4-9187226e27e6",
    commands: [
      { type: "SET_BORDER", sheetId: "Sheet1", col: 6, row: 1 },
      {
        type: "UPDATE_CELL",
        col: 6,
        row: 1,
        sheetId: "Sheet1",
        content: "A",
        style: { textColor: "#f6b26b", bold: true, italic: true, strikethrough: true },
      },
      { type: "SET_BORDER", sheetId: "Sheet1", col: 7, row: 1 },
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
      { type: "SET_BORDER", sheetId: "Sheet1", col: 6, row: 2 },
      {
        type: "UPDATE_CELL",
        col: 6,
        row: 2,
        sheetId: "Sheet1",
        content: "B",
        style: { textColor: "#f6b26b", bold: true, italic: true, strikethrough: true },
      },
      { type: "SET_BORDER", sheetId: "Sheet1", col: 7, row: 2 },
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
      { type: "SET_BORDER", sheetId: "Sheet1", col: 6, row: 3 },
      {
        type: "UPDATE_CELL",
        col: 6,
        row: 3,
        sheetId: "Sheet1",
        content: "C",
        style: { textColor: "#f6b26b", bold: true, italic: true, strikethrough: true },
      },
      { type: "SET_BORDER", sheetId: "Sheet1", col: 7, row: 3 },
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
      { type: "SET_BORDER", sheetId: "Sheet1", col: 6, row: 4 },
      {
        type: "UPDATE_CELL",
        col: 6,
        row: 4,
        sheetId: "Sheet1",
        content: "D",
        style: { textColor: "#f6b26b", bold: true, italic: true, strikethrough: true },
      },
      { type: "SET_BORDER", sheetId: "Sheet1", col: 7, row: 4 },
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
      { type: "SET_BORDER", sheetId: "Sheet1", col: 6, row: 5 },
      {
        type: "UPDATE_CELL",
        col: 6,
        row: 5,
        sheetId: "Sheet1",
        content: "E",
        style: { textColor: "#f6b26b", bold: true, italic: true, strikethrough: true },
      },
      { type: "SET_BORDER", sheetId: "Sheet1", col: 7, row: 5 },
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
      { type: "SET_BORDER", sheetId: "Sheet1", col: 6, row: 6 },
      {
        type: "UPDATE_CELL",
        col: 6,
        row: 6,
        sheetId: "Sheet1",
        content: "F",
        style: { textColor: "#f6b26b", bold: true, italic: true, strikethrough: true },
      },
      { type: "SET_BORDER", sheetId: "Sheet1", col: 7, row: 6 },
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
    version: 1,
    serverRevisionId: "35c65bbe-f432-4fab-9787-0557cf4e1d2a",
    nextRevisionId: "c9d38834-7bfa-4f90-8606-e10b36dfb01b",
    clientId: "8678545c-cbcc-451f-80b4-9187226e27e6",
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
    version: 1,
    serverRevisionId: "c9d38834-7bfa-4f90-8606-e10b36dfb01b",
    nextRevisionId: "0e84658b-2d67-4951-bdbe-4f621d60dfde",
    clientId: "8678545c-cbcc-451f-80b4-9187226e27e6",
    commands: [
      { type: "ADD_MERGE", sheetId: "Sheet1", target: [{ left: 4, right: 5, top: 2, bottom: 6 }] },
    ],
  },
  {
    type: "REVISION_UNDONE",
    version: 1,
    serverRevisionId: "0e84658b-2d67-4951-bdbe-4f621d60dfde",
    nextRevisionId: "ed24cdcc-ea13-47ba-bc2e-eeb826c105e8",
    undoneRevisionId: "0e84658b-2d67-4951-bdbe-4f621d60dfde",
  },
  {
    type: "REMOTE_REVISION",
    version: 1,
    serverRevisionId: "ed24cdcc-ea13-47ba-bc2e-eeb826c105e8",
    nextRevisionId: "71f28a3a-d979-4785-a64f-817a86e0b2fa",
    clientId: "8678545c-cbcc-451f-80b4-9187226e27e6",
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
    version: 1,
    serverRevisionId: "71f28a3a-d979-4785-a64f-817a86e0b2fa",
    nextRevisionId: "1b12489c-35af-43fa-a22f-3728c4b0a4b2",
    clientId: "8678545c-cbcc-451f-80b4-9187226e27e6",
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
    const groupSize = randomIntFromInterval(1, 4);
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
  const seeds = range(0, 1).map((i) => (now + i).toString());
  seeds;

  beforeEach(() => {
    ({ network, alice, bob, charlie } = setupCollaborativeEnv());
  });

  // 1643123096815 1643123155749

  // test.each(["1643123096815"])("monkey party with seed %s", (seed) => {
  test("collaborative monkey party with seed", (seed) => {
    seedrandom("1643123096815", { global: true });
    shuffle;
    const actions = assignUser(commands, [alice, bob, charlie]);
    const commandGroups = randomGroup(actions);
    console.log(
      commandGroups.map((group) => {
        return group.map(({ commands, user }) => {
          return `${user.getters.getClient().name}
           ${commands.map((c) => c.type)}
        `;
        });
      })
    );
    for (const commandGroup of commandGroups) {
      network.concurrent(() => {
        for (const { commands, user } of commandGroup) {
          for (const command of commands) {
            user.dispatch(command.type, command);
          }
        }
      });
    }
    const firstSheetId = alice.getters.getSheets()[0].id;
    console.log(alice.getters.getFigures(firstSheetId));
    console.log(bob.getters.getFigures(firstSheetId));
    const sheetId = alice.getters.getSheets()[1].id;
    console.log(alice.getters.getFigures(sheetId));
    console.log(bob.getters.getFigures(sheetId));
    expect([alice, bob, charlie]).toHaveSynchronizedExportedData();
  });
});
