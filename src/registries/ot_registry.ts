import { Registry } from "../registry";
import { EventTypes, Event } from "../types";

//------------------------------------------------------------------------------
// Operation Transform Registry
//------------------------------------------------------------------------------

export type TransformationFunction = (toTransform: Event, executed: Event) => Event[];

export class OTRegistry extends Registry<Registry<TransformationFunction>> {
  addTransformation(toTransform: EventTypes, executed: EventTypes, fn: TransformationFunction) {
    if (!this.content[toTransform]) {
      this.content[toTransform] = new Registry<TransformationFunction>();
    }
    this.content[toTransform][executed] = fn;
    return this;
  }

  getTransformation(
    toTransform: EventTypes,
    executed: EventTypes
  ): TransformationFunction | undefined {
    return this.content[toTransform] && this.content[toTransform][executed];
  }
}
