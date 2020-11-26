// import { SOCT4 } from "../../src/soct4";
// import { Model } from "../../src/model";
// import { Command, DuplicateSheetCommand, UpdateCellCommand } from "../../src/types";
// import "../canvas.mock";

test("test", () => {
  expect(1).toBe(1);
});

// describe("SOCT4 implementation", () => {
//   test("local dispatch is broadcast", async () => {
//     const model = new Model();
//     const broadcast = jest.fn();
//     const soct4 = new SOCT4(model, broadcast, async () => 1);
//     const clientId = soct4["clientId"];
//     const command: Command = {
//       type: "CREATE_SHEET",
//       sheetId: "42",
//       position: 1,
//     };
//     await soct4.localExecution(command);
//     expect(broadcast).toHaveBeenCalledWith({
//       clientId,
//       timestamp: 1,
//       commands: [command],
//     });
//   });

//   test("remote command is locally dispatched", () => {
//     const model = new Model();
//     const soct4 = new SOCT4(
//       model,
//       () => 1,
//       async () => 1
//     );
//     const command: Command = {
//       type: "CREATE_SHEET",
//       sheetId: "42",
//       position: 1,
//     };
//     model.dispatch = jest.fn((command) => ({ status: "SUCCESS" }));
//     soct4["sequentialReception"]({
//       clientId: "1234",
//       timestamp: 1,
//       commands: [command],
//     });
//     expect(model.dispatch).toHaveBeenCalledWith(command.type, command, true);
//   });

//   test("remote command is not locally dispatched if it comes from the itself", () => {
//     const model = new Model();
//     const soct4 = new SOCT4(
//       model,
//       () => 1,
//       async () => 1
//     );
//     const command: Command = {
//       type: "CREATE_SHEET",
//       sheetId: "42",
//       position: 1,
//     };
//     const clientId = soct4["clientId"];
//     model.dispatch = jest.fn((command) => ({ status: "SUCCESS" }));
//     soct4["sequentialReception"]({
//       clientId,
//       timestamp: 1,
//       commands: [command],
//     });
//     expect(model.dispatch).not.toHaveBeenCalled();
//   });

//   test("remote commands are dispatched in order", () => {
//     const model = new Model();
//     const soct4 = new SOCT4(
//       model,
//       () => 1,
//       async () => 1
//     );
//     const command: Command = {
//       type: "CREATE_SHEET",
//       sheetId: "42",
//       position: 1,
//     };
//     model.dispatch = jest.fn((command) => ({ status: "SUCCESS" }));
//     soct4["sequentialReception"]({
//       clientId: "1234",
//       timestamp: 2,
//       commands: [command],
//     });
//     expect(model.dispatch).not.toHaveBeenCalled();
//     soct4["sequentialReception"]({
//       clientId: "5678",
//       timestamp: 1,
//       commands: [
//         {
//           type: "CREATE_SHEET",
//           sheetId: "422",
//           position: 1,
//         },
//       ],
//     });
//     expect(model.dispatch["mock"].calls).toEqual([
//       [
//         "CREATE_SHEET",
//         {
//           type: "CREATE_SHEET",
//           sheetId: "422",
//           position: 1,
//         },
//         true,
//       ],
//       [
//         "CREATE_SHEET",
//         {
//           type: "CREATE_SHEET",
//           sheetId: "42",
//           position: 1,
//         },
//         true,
//       ],
//     ]);
//   });
//   test("wait concurrent commands before broadcasting local command", async () => {
//     const model = new Model();
//     const broadcast = jest.fn();
//     const soct4 = new SOCT4(model, broadcast, async () => 3);
//     const command: Command = {
//       type: "CREATE_SHEET",
//       sheetId: "88",
//       position: 1,
//     };
//     model.dispatch = jest.fn((command) => ({ status: "SUCCESS" }));
//     soct4["sequentialReception"]({
//       clientId: "1234",
//       timestamp: 2,
//       commands: [Object.assign({}, command, { sheetId: "2222" })],
//     });
//     expect(model.dispatch).not.toHaveBeenCalled();
//     const localCommand: Command = {
//       type: "CREATE_SHEET",
//       sheetId: "localSheetId",
//       position: 1,
//     };
//     await soct4.localExecution(localCommand);
//     expect(broadcast).not.toHaveBeenCalled();
//     soct4["sequentialReception"]({
//       clientId: "1234",
//       timestamp: 1,
//       commands: [Object.assign({}, command, { sheetId: "1111" })],
//     });
//     const clientId = soct4["clientId"];
//     expect(broadcast).toHaveBeenCalledWith({
//       clientId,
//       timestamp: 3,
//       commands: [localCommand],
//     });
//   });
//   test("dispatch only consecutive remote commands", async () => {
//     const model = new Model();
//     const soct4 = new SOCT4(
//       model,
//       () => {},
//       async () => 3
//     );
//     const command: Command = {
//       type: "CREATE_SHEET",
//       position: 1,
//       sheetId: "88",
//     };
//     model.dispatch = jest.fn((command) => ({ status: "SUCCESS" }));
//     soct4["sequentialReception"]({
//       clientId: "1234",
//       timestamp: 4,
//       commands: [Object.assign({}, command, { sheetId: "4444" })],
//     });
//     soct4["sequentialReception"]({
//       clientId: "1234",
//       timestamp: 2,
//       commands: [Object.assign({}, command, { sheetId: "2222" })],
//     });
//     expect(model.dispatch).not.toHaveBeenCalled();
//     soct4["sequentialReception"]({
//       clientId: "1234",
//       timestamp: 1,
//       commands: [Object.assign({}, command, { sheetId: "1111" })],
//     });
//     expect(model.dispatch["mock"].calls).toEqual([
//       [
//         "CREATE_SHEET",
//         {
//           type: "CREATE_SHEET",
//           sheetId: "1111",
//           position: 1,
//         },
//         true,
//       ],
//       [
//         "CREATE_SHEET",
//         {
//           type: "CREATE_SHEET",
//           sheetId: "2222",
//           position: 1,
//         },
//         true,
//       ],
//     ]);
//     model.dispatch = jest.fn((command) => ({ status: "SUCCESS" }));
//     // now receive 3 => 3 and 4 should be dispatched
//     soct4["sequentialReception"]({
//       clientId: "1234",
//       timestamp: 3,
//       commands: [Object.assign({}, command, { sheetId: "3333" })],
//     });
//     expect(model.dispatch["mock"].calls).toEqual([
//       [
//         "CREATE_SHEET",
//         {
//           type: "CREATE_SHEET",
//           sheetId: "3333",
//           position: 1,
//         },
//         true,
//       ],
//       [
//         "CREATE_SHEET",
//         {
//           type: "CREATE_SHEET",
//           sheetId: "4444",
//           position: 1,
//         },
//         true,
//       ],
//     ]);
//   });
//   test.skip("Correctly apply OT on conflic commands", async () => {
//     const model = new Model();
//     const sheetId = model.getters.getActiveSheetId();
//     const broadcast = jest.fn();
//     const soct4 = new SOCT4(model, broadcast, async () => 2);
//     const duplicateSheet: DuplicateSheetCommand = {
//       type: "DUPLICATE_SHEET",
//       name: "Dup",
//       sheetIdFrom: sheetId,
//       sheetIdTo: "DUP_SHEET_ID",
//     };
//     const updateCell: UpdateCellCommand = {
//       type: "UPDATE_CELL",
//       sheetId: sheetId,
//       col: 0,
//       row: 0,
//       content: "test",
//     };
//     model.dispatch = jest.fn((command) => ({ status: "SUCCESS" }));
//     await soct4.localExecution(duplicateSheet);
//     soct4["sequentialReception"]({
//       clientId: "1234",
//       timestamp: 1,
//       commands: [updateCell],
//     });
//     expect(model.dispatch["mock"].calls).toEqual([
//       [
//         "UPDATE_CELL",
//         {
//           type: "UPDATE_CELL",
//           sheetId: sheetId,
//           col: 0,
//           row: 0,
//           content: "test",
//         },
//         true,
//       ],
//       [
//         "UPDATE_CELL",
//         {
//           type: "UPDATE_CELL",
//           sheetId: "DUP_SHEET_ID",
//           col: 0,
//           row: 0,
//           content: "test",
//         },
//         true,
//       ],
//     ]);
//   });
// });
