// import { CoreModel } from "../src/core_model";

export declare const PLOP = "Plop...";

onmessage = function (e: MessageEvent) {
  console.log("Worker: Message received from main script", e.data);
  postMessage(`I have received ${e.data.commands.map((x) => x.type)}`);
};

// const coreModel = new CoreModel();
