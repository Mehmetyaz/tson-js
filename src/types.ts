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
  NAME,
  OPEN_PAREN,
  CLOSE_PAREN,
  OPEN_BRACKET,
  CLOSE_BRACKET,
  OPEN_BRACE,
  CLOSE_BRACE,
  COMMA,
  STRING,
  NUMBER,
  BOOLEAN,
  NULL,
  COMMENT_LINE,
  COMMENT_BLOCK,
  WHITESPACE,
  EOF,
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
