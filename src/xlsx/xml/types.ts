export interface ElementSchema {
  readonly name: string;
  readonly namespace?: NameSpace;
  readonly type?: XMLType;
  readonly attributes?: Readonly<AttributeSchema[]>;
  readonly children?: ChildrenSchema;
}

interface AttributeSchema {
  readonly name: string;
  readonly type?: XMLType;
  readonly namespace?: NameSpace;
}

type SequenceSchema = SequenceElementSchema[];

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
