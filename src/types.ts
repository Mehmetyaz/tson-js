/**
 * TSON value types
 */
export type TSONValue =
  | string
  | number
  | boolean
  | null
  | TSONObject
  | TSONArray;

/**
 * TSON object type
 */
export interface TSONObject {
  [key: string]: TSONValue;
}

/**
 * TSON array type
 */
export type TSONArray = TSONValue[];

/**
 * TSON named object with type information
 */
export interface NamedTSONObject {
  name: string;
  value: TSONObject;
}

/**
 * TSON named array with type information
 */
export interface NamedTSONArray {
  name: string;
  value: TSONArray;
}

/**
 * Parsing options
 */
export interface ParseOptions {
  /**
   * Whether to preserve comments in the output
   * @default false
   */
  preserveComments?: boolean;
}

/**
 * Token types for the lexer
 */
export enum TokenType {
  NAME, // name   0
  OPEN_BRACKET, // [    1
  CLOSE_BRACKET, // ]    2
  OPEN_BRACE, // {      3
  CLOSE_BRACE, // }      4
  COMMA, // ,          5
  STRING, // "string"   6
  NUMBER, // 123        7
  BOOLEAN, // true       8
  NULL, // null         9
  COMMENT_LINE, // // comment 10
  COMMENT_BLOCK, // /* comment */ 11
  WHITESPACE, // " "        12
  EOF, // end of file     13
  EQUALS, // =            14
  HASH, // #              15
  AMPERSAND, // &          16
  LESS_THAN, // <          17
  GREATER_THAN, // >          18
  QUESTION, // ?          19
}

/**
 * Token interface
 */
export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
}
