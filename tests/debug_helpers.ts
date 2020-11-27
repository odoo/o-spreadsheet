import { Model } from "../src";
import { UID } from "../src/types";

interface Layer {
  previous?: Layer;
  branchingInstructionId?: UID;
  next?: Layer;
  instructions: Instruction[];
}

interface Data {
  _commands?: any[];
}

interface Instruction {
  data: Data;
  id: UID;
  isOriginal: boolean;
}

export function getDebugInfo(layerToPrint: Layer) {
  let firstLayer: Layer | undefined = layerToPrint;
  while (firstLayer?.previous) {
    firstLayer = firstLayer?.previous;
  }
  let id = 0;
  const instructionsIds: Record<UID, Instruction> = {};
  const allStrings: string[] = [];

  function printLayer(layer: Layer, level = 0) {
    const stringArray: string[] = [];
    for (let i = 0; i < level - 1; i++) {
      stringArray.push("".padEnd(10));
    }
    if (level > 0) {
      stringArray.push(">".padEnd(10));
    }
    for (let instruction of layer.instructions) {
      const idToShow = `${instruction.id.toString().substring(0, 4)}(${id})`;
      stringArray.push(idToShow.padEnd(10));
      instructionsIds[id++] = {
        data: instruction.data,
        id: instruction.id,
        isOriginal: instruction.isOriginal,
      };
    }
    allStrings.push(stringArray.join(""));
  }
  let level = 0;
  let layer: Layer | undefined = firstLayer;
  while (layer) {
    printLayer(layer, level);
    level += layer.instructions.findIndex((i) => layer?.branchingInstructionId === i.id) + 1;
    layer = layer.next;
  }
  allStrings.push("");
  allStrings.push("Instructions:");
  for (let [id, instruction] of Object.entries(instructionsIds)) {
    const data = instruction.data._commands
      ? JSON.stringify(instruction.data._commands)
      : JSON.stringify(instruction.data);
    allStrings.push(`${id}: ${data} : ${instruction.isOriginal ? "original" : "transformed"}`);
  }
  return allStrings.join("\n");
}

/**
 * Display the layers of the revisions of the given model
 */
export function printDebugModel(model: Model) {
  // @ts-ignore
  console.log(getDebugInfo(model["session"]["revisions"]["HEAD_LAYER"]));
}
