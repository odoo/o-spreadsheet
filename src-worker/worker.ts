import { Revision } from "../src";

export declare const PLOP = "Plop...";

onmessage = function (e: MessageEvent<Revision>) {
  console.log("Worker: Message received from main script", e.data);
  postMessage(`I have received ${e.data.commands.map((x) => x.type)}`);
};
