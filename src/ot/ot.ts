import { OTRegistry } from "../registries/ot_registry";
import { Event, MultiuserCommand } from "../types";

export const registry = new OTRegistry();

export function transform(
  toTransform: MultiuserCommand,
  executed: MultiuserCommand
): MultiuserCommand {
  const events: Event[] = [];
  for (let eventToTransform of toTransform.events) {
    for (let eventExecuted of executed.events) {
      const ot = registry.getTransformation(eventToTransform.type, eventExecuted.type);
      events.concat(ot ? ot(eventToTransform, eventExecuted) : [eventToTransform]);
    }
  }
  return { type: "MULTIUSER", events };
}
