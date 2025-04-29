import { Parser } from "./parser";
import { TSONStringifier } from "./converter";
import { ParseOptions, TSONValue, TSONObject, TSONArray } from "./types";

/**
 * Parse TSON string to JavaScript value
 * @param input TSON string
 * @param options Parsing options
 * @returns Parsed JavaScript value
 */
function parse(input: string, options?: ParseOptions): TSONValue {
  const parser = new Parser(options);
  return parser.parse(input);
}

/**
 * Stringify JavaScript value to TSON string
 * @param value JavaScript value
 * @param pretty Whether to format the output TSON
 * @returns TSON string
 */
function stringify(value: TSONValue, pretty: boolean = false): string {
  return TSONStringifier.stringify(value, pretty);
}

export const TSON = {
  parse,
  stringify,
} as const;
