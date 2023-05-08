export interface ElementSchema {
  name: string;
  namespace?: NameSpace;
  type?: XMLType;
  attributes?: Array<{ name: string }>;
  children?: ChildrenSchema;
}

type SequenceSchema = SequenceElementSchema[];

type ChildrenSchema = SequenceSchema;

export interface SequenceElementSchema extends ElementSchema {
  /**
   * "required" by default
   */
  quantifier?: "required" | "many" | "optional";
}

type XMLType = "string" | "number" | "boolean" | "date" | "time";

export interface Attribute {
  name: string;
  type: XMLType;
}
export interface NameSpace {
  prefix?: string;
  uri?: string | null;
}
