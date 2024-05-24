import { createEmptyWorkbookData } from "../src/migrations/data";
import { HeadlessModel } from "./headless_model";

export declare const PLOP = "Plop...";

onmessage = function (e: MessageEvent) {
  console.log("Worker: Message received from main script", e.data);
  postMessage(`I have received ${e.data.commands.map((x) => x.type)}`);
};

const o = createEmptyWorkbookData();
o.sheets[0].name = "12";

// export const model = new HeadlessModel (createEmptyWorkbookData());
export const model = new HeadlessModel();
