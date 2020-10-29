export type ClientId = string;

/*
 * A state vector[1] (sometime also called vector clock) is a data structure used to partially
 * order[2] updates in a distributed system.
 * A state vector of a system of N clients is an array/vector of N state versions, one per client.
 * e.g. a state vector V is defined by:
 * V = <C1, C2, ..., Cn> with Ci being the local state version of client i
 *
 * A local copy of the global state vector is kept in each client. Each client updates its copy
 * with the following rules
 * - each time a client is updated, it increments its own state version by one
 * - each time a client sends an update, it increments its own state version by one and then
 *   sends of copy of its own vector.
 * - each time a client receives an update, it increments its own state vector in the vector by one
 *   and updates each element in its vector by taking the maximum of the value in its own vector and
 *   the value in the vector in the received message (for every element).
 *
 * [1] https://en.wikipedia.org/wiki/Vector_clock
 * [2] https://en.wikipedia.org/wiki/Partially_ordered_set
 */
export type StateVector = Record<ClientId, number>;

/**
 * An update is defined by two elements:
 * 1) the path in the JSON state which is updated
 * 2) the value
 * e.g. In the following example, we apply an update U to an initial
 * state S. The udpated state is denoted by S'
 *    S = {
 *      B: 5,
 *      A: {
 *        C: 9
 *      }
 *    }
 *    U = { path: ["A", "C"], value: 100 }
 * Applying U on S gives:
 *    S' = {
 *      B: 5,
 *      A: {
 *        C: 100
 *      }
 *    }
 *
 * A path element can be a string (key in an object) or a number (index in an array).
 * If the path does not exists on the initial state, it is created on the fly.
 *
 */
export interface Update {
  path: (string | number)[];
  value: any;
}

export type HistoryUpdate = Update & {
  stateVector: StateVector;
};

export interface Message {
  updates: Update[];
  stateVector: StateVector;
  clientId: ClientId;
}

export type NewMessageCallback = (message: Message) => void;

export interface Network {
  onNewMessage: (clientId: ClientId, callback: NewMessageCallback) => void;
  sendMessage: (message: Message) => void;
}

export interface NetworkListener {
  clientId: ClientId;
  callback: NewMessageCallback;
}

export interface SynchronizedState {
  apply: (updates: Update[]) => void;
  onStateUpdated: (callback: (updates: Update[]) => void) => void;
}
