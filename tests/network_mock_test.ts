import { MockNetwork } from "./__mocks__/network";
import { Message } from "../src/types/multi_user";

describe("Network Mock Test", () => {
  describe("Send messages", () => {
    let network: MockNetwork;
    const clientId1 = "42";
    const clientId2 = "24";
    let fnClient1;
    let fnClient2;
    beforeEach(() => {
      fnClient1 = jest.fn((message: Message) => {});
      fnClient2 = jest.fn((message: Message) => {});
      network = new MockNetwork();
      network.onNewMessage(clientId1, fnClient1);
      network.onNewMessage(clientId2, fnClient2);
    });

    test("Send a message from client 1, receive only in client 2", () => {
      const message: Message = {
        clientId: clientId1,
        updates: [{ path: ["A"], value: 4 }],
        stateVector: {},
      };
      network.sendMessage(message);
      expect(fnClient1).not.toHaveBeenCalled();
      expect(fnClient2).toHaveBeenCalledWith(message);
    });
  });

  describe("Concurrence", () => {
    let network: MockNetwork;
    const clientId1 = "42";
    const clientId2 = "24";
    let fnClient1;
    let fnClient2;

    beforeEach(() => {
      fnClient1 = jest.fn((message: Message) => {});
      fnClient2 = jest.fn((message: Message) => {});
      network = new MockNetwork();
      network.onNewMessage(clientId1, fnClient1);
      network.onNewMessage(clientId2, fnClient2);
    });

    test("Two concurrent non-conflicting messages are correctly received", () => {
      const message1: Message = {
        clientId: clientId1,
        updates: [{ path: ["A"], value: 4 }],
        stateVector: { [clientId1]: 1 },
      };
      const message2: Message = {
        clientId: clientId2,
        updates: [{ path: ["B"], value: 4 }],
        stateVector: { [clientId2]: 1 },
      };
      network.concurrent(() => {
        network.sendMessage(message1);
        network.sendMessage(message2);
      });
      expect(fnClient1).toHaveBeenCalledWith(message2);
      expect(fnClient2).toHaveBeenCalledWith(message1);
    });

    test("Two concurrent and conflicting messages are correctly received", () => {
      const message1: Message = {
        clientId: clientId1,
        updates: [{ path: ["A"], value: 4 }],
        stateVector: { [clientId1]: 1 },
      };
      const message2: Message = {
        clientId: clientId2,
        updates: [{ path: ["A"], value: 8 }],
        stateVector: { [clientId2]: 1 },
      };
      network.concurrent(() => {
        network.sendMessage(message1);
        network.sendMessage(message2);
      });
      expect(fnClient1).not.toHaveBeenCalled();
      expect(fnClient2).toHaveBeenCalledWith(message1);
    });

    test("Filter only conflicting updates ", () => {
      const message1: Message = {
        clientId: clientId1,
        updates: [{ path: ["A"], value: 4 }],
        stateVector: { [clientId1]: 1 },
      };
      const message2: Message = {
        clientId: clientId2,
        updates: [
          { path: ["A"], value: 8 },
          { path: ["B"], value: 8 },
        ],
        stateVector: { [clientId2]: 1 },
      };
      network.concurrent(() => {
        network.sendMessage(message1);
        network.sendMessage(message2);
      });
      expect(fnClient2).toHaveBeenCalledWith(message1);
      expect(fnClient1).toHaveBeenCalledWith({
        ...message2,
        updates: [{ path: ["B"], value: 8 }],
      });
    });
  });

  describe("Connect/disconnect", () => {
    let network: MockNetwork;
    const clientId = "42";
    beforeEach(() => {
      network = new MockNetwork();
      network.onNewMessage(clientId, () => {});
    });

    test("Can connect/disconnect a client", () => {
      network.disconnect(clientId);
      expect(network["disconnectedClients"]).toEqual({
        [clientId]: { missedMessages: [], messagesSent: [] },
      });
      network.reconnect(clientId);
      expect(network["disconnectedClients"]).toEqual({});
    });

    test("Retain sent messages when a client is disconnected", () => {
      network.disconnect(clientId);
      const message: Message = {
        clientId,
        updates: [{ path: ["A"], value: 4 }],
        stateVector: {},
      };
      network.sendMessage(message);
      expect(network["disconnectedClients"]).toEqual({
        [clientId]: { missedMessages: [], messagesSent: [message] },
      });
    });

    test("Receive all missed messages when reconnecting", () => {
      network = new MockNetwork();
      const fn = jest.fn((message: Message) => {});
      const clientIdConnected = "24";
      network.onNewMessage(clientId, fn);
      network.onNewMessage(clientIdConnected, () => {});
      network.disconnect(clientId);
      const message: Message = {
        clientId: clientIdConnected,
        updates: [{ path: ["A"], value: 4 }],
        stateVector: {},
      };
      network.sendMessage(message);
      expect(network["disconnectedClients"]).toEqual({
        [clientId]: { missedMessages: [message], messagesSent: [] },
      });
      network.reconnect(clientId);
      expect(fn).toHaveBeenCalledWith(message);
    });

    test("Send all messages when reconnecting", () => {
      const fn = jest.fn((message: Message) => {});
      const clientIdConnected = "24";
      network.onNewMessage(clientIdConnected, fn);
      network.disconnect(clientId);
      const message: Message = {
        clientId,
        updates: [{ path: ["A"], value: 4 }],
        stateVector: {},
      };
      network.sendMessage(message);
      expect(network["disconnectedClients"]).toEqual({
        [clientId]: { missedMessages: [], messagesSent: [message] },
      });
      network.reconnect(clientId);
      expect(fn).toHaveBeenCalledWith(message);
    });

    test("messages are retransmitted to disconnected clients without conflicting updates", () => {
      const fn = jest.fn(() => {});
      network.onNewMessage(clientId, fn);
      const messageClient2: Message = {
        clientId: "24",
        updates: [{ path: ["A"], value: 5 }],
        stateVector: { 24: 1 },
      };
      const messageClient3: Message = {
        clientId: "99",
        updates: [
          { path: ["A"], value: 5 },
          { path: ["B"], value: 8 },
        ],
        stateVector: { 24: 1 },
      };
      network.disconnect(clientId);
      network.concurrent(() => {
        network.sendMessage(messageClient2);
        network.sendMessage(messageClient3); // conflicting part with messageClient2 should be removed
      });
      network.reconnect(clientId);
      expect(fn).toHaveBeenCalledWith(messageClient2);
      expect(fn).toHaveBeenCalledWith({
        ...messageClient3,
        updates: [{ path: ["B"], value: 8 }],
      });
    });

    test("Send conflicting messages while disconnected", () => {
      const fn = jest.fn(() => {});
      const clientIdConnected = "24";
      network.onNewMessage(clientIdConnected, fn);
      network.disconnect(clientId);
      const messageConnected: Message = {
        clientId: clientIdConnected,
        updates: [{ path: ["A"], value: 5 }],
        stateVector: { [clientIdConnected]: 1 },
      };
      const messageDisonnected: Message = {
        clientId,
        updates: [{ path: ["A"], value: 6 }],
        stateVector: { [clientId]: 1 },
      };
      network.sendMessage(messageConnected);
      network.sendMessage(messageDisonnected);
      network.reconnect(clientId);
      expect(fn).not.toHaveBeenCalled();
    });
  });
});
