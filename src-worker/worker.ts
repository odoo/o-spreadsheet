import { Revision } from "../src";
import { createEmptyWorkbookData } from "../src/migrations/data";
import { HeadlessModel } from "./headless_model";

export declare const PLOP = "Plop...";

onmessage = function (e: MessageEvent<Revision>) {
  console.log("Worker: Message received from main script", e.data);
  postMessage(`I have received ${e.data.commands.map((x) => x.type)}`);
};

export const model = new HeadlessModel(createEmptyWorkbookData());
