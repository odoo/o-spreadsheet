export interface SPTableColumn {
  fields: string[];
  values: string[];
  width: number;
  offset: number;
}

export interface SPTableRow {
  fields: string[];
  values: string[];
  indent: number;
}

export interface SPTableData {
  cols: SPTableColumn[][];
  rows: SPTableRow[];
  measures: string[];
  rowTitle: string;
}

export interface SPTableCell {
  isHeader: boolean;
  domain?: string[];
  content?: string;
  style?: Object;
  measure?: string;
}
