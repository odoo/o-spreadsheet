import { ClientDisconnectedError, CoreCommand, Model } from "../../src";
import { MockTransportService } from "../__mocks__/transport_service";
import { MockTransportServiceAsync } from "../__mocks__/transport_service_async";
import { getCellContent } from "../test_helpers";
import { nextTick } from "../test_helpers/helpers";
import { setupCollaborativeEnv } from "./collaborative_helpers";

describe("reconnection recovery", () => {
  let network: MockTransportService;
  let alice: Model;
  let bob: Model;

  beforeEach(() => {
    ({ network, alice, bob } = setupCollaborativeEnv(undefined, new MockTransportServiceAsync()));
  });

  test("disconnecting than reconnecting re-send all messages and swallows the error", async () => {
    const commandWhileOnline: CoreCommand = {
      type: "UPDATE_CELL",
      sheetId: alice.getters.getActiveSheetId(),
      col: 0,
      row: 0,
      content: "first command",
    };
    const commandWhileOFFLINE: CoreCommand = {
      type: "UPDATE_CELL",
      sheetId: alice.getters.getActiveSheetId(),
      col: 0,
      row: 1,
      content: "second command",
    };
    const commandWhileOFFLINE2: CoreCommand = {
      type: "UPDATE_CELL",
      sheetId: alice.getters.getActiveSheetId(),
      col: 0,
      row: 1,
      content: "third command",
    };

    const commandWhileBackOnline: CoreCommand = {
      type: "UPDATE_CELL",
      sheetId: alice.getters.getActiveSheetId(),
      col: 0,
      row: 2,
      content: "fourth command",
    };

    alice.dispatch("UPDATE_CELL", commandWhileOnline);
    await nextTick();

    const backupSendMessage = network.sendMessage;
    network.sendMessage = () => {
      return Promise.reject(new ClientDisconnectedError("network error"));
    };

    alice.dispatch("UPDATE_CELL", commandWhileOFFLINE);
    await nextTick();
    alice.dispatch("UPDATE_CELL", commandWhileOFFLINE2);
    await nextTick();

    network.sendMessage = backupSendMessage;
    alice.dispatch("UPDATE_CELL", commandWhileBackOnline);

    await nextTick();
    await nextTick();
    await nextTick();

    expect(getCellContent(alice, "A1")).toBe("first command");
    expect(getCellContent(alice, "A2")).toBe("third command");
    expect(getCellContent(alice, "A3")).toBe("fourth command");

    expect(getCellContent(bob, "A1")).toBe("first command");
    expect(getCellContent(bob, "A2")).toBe("third command");
    expect(getCellContent(bob, "A3")).toBe("fourth command");
  });
});
