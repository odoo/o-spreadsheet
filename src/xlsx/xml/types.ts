export interface ElementSchema {
  readonly name: string;
  readonly namespace?: NameSpace;
  readonly type?: XMLType;
  readonly attributes?: readonly AttributeSchema[];
  readonly children?: ChildrenSchema;
}

interface AttributeSchema {
  readonly name: string;
  readonly type?: XMLType;
  readonly namespace?: NameSpace;
}

type SequenceSchema = readonly SequenceElementSchema[];

type ChildrenSchema = SequenceSchema | undefined;

export interface SequenceElementSchema extends ElementSchema {
  /**
   * @default "required"
   */
  readonly quantifier?: "required" | "many" | "optional";
}

export type XMLType = "string" | "number" | "boolean" | "date" | "time";

export interface Attribute {
  name: string;
  type: XMLType;
}
export interface NameSpace {
  prefix?: string;
  uri?: string | null;
}
