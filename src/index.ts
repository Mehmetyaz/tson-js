/**
 * Parse TSON string to JavaScript value
 * @param input TSON string
 * @param options Parsing options
 * @returns Parsed JavaScript value
 */
function parse(input: string): any {
  return new Parser(input).parse();
}

/**
 * Stringify JavaScript value to TSON string
 * @param value JavaScript value
 * @param pretty Whether to format the output TSON
 * @returns TSON string
 */
function stringify(value: any, pretty: boolean = false): string {
  return Stringifier.stringify(value, pretty);
}

export const TSON = {
  parse,
  stringify,
} as const;

interface Cursor {
  position: number;
  column: number;
  line: number;
}

function copyCursor(cursor: Cursor): Cursor {
  return {
    position: cursor.position,
    column: cursor.column,
    line: cursor.line,
  };
}

export class TSONParseError extends Error {
  constructor(message: string, cursor: Cursor, endCursor?: Cursor) {
    super(message);
    this.cursor = copyCursor(cursor);
    this.endCursor = endCursor ? copyCursor(endCursor) : undefined;
  }

  public cursor: Cursor;
  public endCursor?: Cursor;

  toString(): string {
    return `${this.message} at line ${this.cursor.line}, column ${this.cursor.column}`;
  }

  toJSON(): string {
    return JSON.stringify({
      message: this.message,
      cursor: this.cursor,
      endCursor: this.endCursor,
    });
  }
}

export class TSONParseErrors extends Error {
  constructor(public errors: TSONParseError[]) {
    super(errors.map((error) => error.toString()).join("\n"));
  }
}

// TODO: Implement the singlepass parser
class Parser {
  private _parsers: {
    [key: string]: (_cursor: Cursor) => any;
  } = {
    "{": this.parseObject,
    "[": this.parseArray,
    "<": this.parseArrayTypeSpecifier,
    '"': this.parseString,
    "#": this.parseInt,
    "=": this.parseFloat,
    "?": this.parseBoolean,
    "~": this.parseNull,
  };

  private _cursor: Cursor;
  private _input: string;
  private _errors: TSONParseError[] = [];

  constructor(input: string) {
    this._input = input;
    this._cursor = {
      position: 0,
      column: 1,
      line: 1,
    };
  }

  private skipWhitespace(): void {
    while (true) {
      const char = this.peek();
      if (
        char !== "," &&
        char !== " " &&
        char !== "\n" &&
        char !== "\r" &&
        char !== "\t"
      )
        break;
      this.advance();
    }
  }

  private addError(error: TSONParseError): void {
    this._errors.push(error);
  }

  throwIfErrors(): void {
    if (this._errors.length > 0) {
      throw new TSONParseErrors(this._errors);
    }
  }

  parse(): any {
    this.skipWhitespace();
    const result = this.parseNameOptionalValue();

    if (!result) {
      this.addError(
        new TSONParseError("Empty input", this._cursor, this._cursor)
      );
      this.throwIfErrors();
      return null;
    }
    if (result.name) {
      this.throwIfErrors();
      return {
        [result.name]: result.value,
      };
    }
    this.throwIfErrors();
    return result.value;
  }

  private parseNameRequiredValue(): {
    name: string;
    value: any | null;
  } {
    const name = this.parseName();
    if (name.length === 0) {
      this.addError(
        new TSONParseError("Name is required", this._cursor, this._cursor)
      );
      return { name: "", value: null };
    }
    const value = this.parseVal();
    return { name, value };
  }

  private parseNameOptionalValue(): {
    name?: string;
    value: any | null;
  } {
    const name = this.parseName();
    const value = this.parseVal();
    if (name.length > 0) {
      return { name, value };
    } else {
      return { name: undefined, value };
    }
  }

  private parseVal(): any {
    const startCursor = copyCursor(this._cursor);
    const char = this.peek();
    if (this._parsers[char]) {
      this.advance();
      return this._parsers[char].call(this, this._cursor);
    }

    this.addError(
      new TSONParseError(
        `Unexpected character: ${char}. Expected a ${Object.keys(
          this._parsers
        ).join(", ")}`,
        startCursor,
        this._cursor
      )
    );
    return null;
  }

  private parseNull(): null {
    this.advance();
    return null;
  }

  private parseObject(): any {
    const object: any = {};
    this.skipWhitespace();
    while (this.peek() !== "}" && !this.isAtEnd()) {
      const result = this.parseNameRequiredValue();
      object[result.name] = result.value;
      this.skipWhitespace();
    }
    this.advance(); // skip }
    return object;
  }

  private parseArray(): any {
    const array: any[] = [];
    this.skipWhitespace();
    while (this.peek() !== "]" && !this.isAtEnd()) {
      const result = this.parseNameOptionalValue();
      if (result.name) {
        array.push({ [result.name]: result.value });
      } else {
        array.push(result.value);
      }
      this.skipWhitespace();
    }
    this.advance(); // skip ]
    return array;
  }

  private parseArrayTypeSpecifier(): any[] {
    let type = this.advance();
    let closingSymbol = this.advance(); // skip >
    if (closingSymbol !== ">") {
      this.addError(
        new TSONParseError(
          `Unexpected character: ${closingSymbol}. Expected a >`,
          this._cursor,
          this._cursor
        )
      );
      return [];
    }
    let openingSymbol = this.advance(); // skip [
    if (openingSymbol !== "[") {
      this.addError(
        new TSONParseError(
          `Unexpected character: ${openingSymbol}. Expected a [`,
          this._cursor,
          this._cursor
        )
      );
      return [];
    }

    this.skipWhitespace();
    const arr: any[] = [];
    const parser = this._parsers[type];
    if (!parser) {
      this.addError(
        new TSONParseError(
          `Unexpected character: ${type}. Expected a ${Object.keys(
            this._parsers
          ).join(", ")}`,
          this._cursor,
          this._cursor
        )
      );
      return [];
    }
    while (this.peek() !== "]" && !this.isAtEnd()) {
      const override = this._parsers[this.peek()];
      if (override) {
        this.advance();
        const result = override.call(this, this._cursor);
        arr.push(result);
      } else {
        const result = parser.call(this, this._cursor);
        arr.push(result);
      }
      this.skipWhitespace();
    }
    this.advance(); // skip ]
    return arr;
  }

  private parseString(): string {
    const string: string[] = [];
    const startCursor = copyCursor(this._cursor);
    while (this.peek() !== '"' && !this.isAtEnd()) {
      if (this.peek() === "\n") {
        this.addError(
          new TSONParseError(
            `Unterminated string at line ${startCursor.line}, column ${startCursor.column}`,
            startCursor,
            this._cursor
          )
        );
        return "";
      }
      if (this.peek() === "\\" && this.peekNext() === '"') {
        string.push(this.advance());
        this.advance();
        continue;
      }
      string.push(this.advance());
    }
    this.advance();

    const escaped = string
      .join("")
      .replace(/\\/g, "\\")
      .replace(/\\"/g, '"') // double quote
      .replace(/\\n/g, "\n") // newline
      .replace(/\\r/g, "\r") // carriage return
      .replace(/\\t/g, "\t"); // tab

    return escaped;
  }

  private parseName(): string {
    const name: string[] = [];
    while (Parser.isNamePart(this.peek())) {
      name.push(this.advance());
    }
    return name.join("");
  }

  private static readonly NAME_START_REGEX = /^[a-zA-Z_$]$/;
  private static readonly NAME_PART_REGEX = /^[a-zA-Z0-9_.\-$]$/;

  private static isNameStart(char: string): boolean {
    return Parser.NAME_START_REGEX.test(char);
  }

  private static isNamePart(char: string): boolean {
    return Parser.NAME_PART_REGEX.test(char);
  }

  private isAtEnd(): boolean {
    return this._cursor.position >= this._input.length;
  }

  // Regex for characters that terminate a number
  private static readonly NUMBER_TERMINATOR_REGEX = /^[\s,\}\]\"\:;]$/;

  // Check if character is a number terminator
  private static isNumberTerminator(char: string): boolean {
    return this.NUMBER_TERMINATOR_REGEX.test(char);
  }

  private parseFloat(): number {
    let numberString = "";
    while (!Parser.isNumberTerminator(this.peek()) && !this.isAtEnd()) {
      numberString += this.advance();
    }
    return parseFloat(numberString);
  }

  private parseInt(): number {
    let numberString = "";
    while (!Parser.isNumberTerminator(this.peek()) && !this.isAtEnd()) {
      numberString += this.advance();
    }
    return parseInt(numberString, 10);
  }

  private advanceMultiple(count: number): string {
    let str = "";
    for (let i = 0; i < count; i++) {
      str += this.advance();
    }
    return str;
  }

  private parseBoolean(): boolean {
    const startCursor = copyCursor(this._cursor);
    const value = this.advance();
    if (value === "t") {
      const str = this.advanceMultiple(3); // "rue", "t" already consumed
      if (str === "rue") {
        return true;
      } else {
        this.addError(
          new TSONParseError(
            `Invalid boolean value: "${value}${str}". Expected "true" or "false".`,
            startCursor,
            this._cursor
          )
        );
        return false;
      }
    } else if (value === "f") {
      const str = this.advanceMultiple(4); // "alse", "f" already consumed
      if (str === "alse") {
        return false;
      } else {
        this.addError(
          new TSONParseError(
            `Invalid boolean value: "${value}${str}". Expected "true" or "false".`,
            startCursor,
            this._cursor
          )
        );
        return false;
      }
    }

    // consume to field terminator
    let invalidRes = "";
    while (!Parser.isNumberTerminator(this.peek()) && !this.isAtEnd()) {
      invalidRes += this.advance();
    }

    this.addError(
      new TSONParseError(
        `Invalid boolean value: "${value}${invalidRes}". Expected "true" or "false".`,
        startCursor,
        this._cursor
      )
    );
    return false;
  }

  private advance(): string {
    const char = this._input.charAt(this._cursor.position);
    this._cursor.position++;
    if (char === "\n") {
      this._cursor.line++;
      this._cursor.column = 1;
    } else {
      this._cursor.column++;
    }
    return char;
  }

  private peek(): string {
    if (this._cursor.position >= this._input.length) return "\0";
    return this._input.charAt(this._cursor.position);
  }

  private peekNext(): string {
    if (this._cursor.position + 1 >= this._input.length) return "\0";
    return this._input.charAt(this._cursor.position + 1);
  }
}

class Stringifier {
  /**
   * Convert TSON value to JSON-compatible JavaScript object
   * This ensures that all string values are properly quoted
   */
  // static toJSValue(value: TSONValue): any {
  //   if (value === null || value === undefined) {
  //     return value;
  //   }

  //   if (
  //     typeof value === "string" ||
  //     typeof value === "number" ||
  //     typeof value === "boolean"
  //   ) {
  //     return value;
  //   }

  //   if (Array.isArray(value)) {
  //     return value.map((item) => this.toJSValue(item));
  //   }

  //   if (typeof value === "object") {
  //     const result: Record<string, any> = {};

  //     for (const key in value) {
  //       if (Object.prototype.hasOwnProperty.call(value, key)) {
  //         result[key] = this.toJSValue(value[key]);
  //       }
  //     }

  //     return result;
  //   }

  //   return value;
  // }

  /**
   * Stringify TSON value back to TSON format
   */
  static stringify(
    value: any,
    pretty: boolean = true,
    indent: number = 2
  ): string {
    if (value === null) {
      return ""; // Null is represented as just the property name
    }

    if (value === undefined) {
      return "-"; // Undefined
    }

    if (typeof value === "string") {
      const backSlash = "\\";

      // Escape special characters like in JSON
      const escaped = value
        .replace(/\\/g, backSlash + backSlash)
        .replace(/"/g, backSlash + '"') // double quote
        .replace(/\n/g, backSlash + "n") // newline
        .replace(/\r/g, backSlash + "r") // carriage return
        .replace(/\t/g, backSlash + "t") // tab
        .replace(/\f/g, backSlash + "f") // form feed
        .replace("\b", backSlash + "b") // backspace. /\b not working
        .replace(/\v/g, backSlash + "v"); // vertical tab

      // Use double quotes for strings
      return `"${escaped}"`;
    }

    if (typeof value === "number") {
      // Integers vs floating point have different syntax
      return Number.isInteger(value) ? `#${value}` : `=${value}`;
    }

    if (typeof value === "boolean") {
      return `?${value}`;
    }

    if (Array.isArray(value)) {
      return this.arrayStringify(value, pretty);
    }

    if (typeof value === "object") {
      return this.objectStringify(value, pretty);
    }

    return String(value);
  }

  private static arrayStringify(
    arr: any[],
    pretty: boolean,
    depth: number = 0,
    globalIndent: number = 2
  ): string {
    if (arr.length === 0) return "[]";

    const indent = this._indent(depth, globalIndent, pretty);
    const innerIndent = this._indent(depth + 1, globalIndent, pretty);
    const delimiter = pretty ? "\n" : " ";
    const start = pretty ? "[\n" : "[";
    const end = pretty ? `\n${indent}]` : "]";

    const items = arr
      .map((item) => {
        // For array items, we need to handle named objects/arrays differently
        let itemStr: string;

        if (typeof item === "object" && item !== null && !Array.isArray(item)) {
          // Check if this is a named object (has a single key with object value)
          const keys = Object.keys(item);
          if (
            keys.length === 1 &&
            typeof item[keys[0]] === "object" &&
            item[keys[0]] !== null
          ) {
            const name = keys[0];
            const value = item[keys[0]];

            if (Array.isArray(value)) {
              // Named array
              itemStr = `${name}${this.arrayStringify(
                value,
                pretty,
                depth + 1
              )}`;
            } else {
              // Named object
              itemStr = `${name}${this.objectStringify(
                value,
                pretty,
                depth + 1,
                globalIndent,
                true
              )}`;
            }
          } else {
            // Regular object
            itemStr = this.objectStringify(
              item,
              pretty,
              depth + 1,
              globalIndent,
              true
            );
          }
        } else {
          // Simple value or array
          itemStr = this.stringifyValue(item, pretty, depth + 1, globalIndent);
        }

        return pretty ? `${innerIndent}${itemStr}` : itemStr;
      })
      .join(delimiter);

    return `${start}${items}${end}`;
  }

  // Helper method to stringify a value properly based on its type
  private static stringifyValue(
    value: any,
    pretty: boolean,
    depth: number = 0,
    globalIndent: number = 2
  ): string {
    if (value === null) {
      return "";
    }

    if (typeof value === "string") {
      const backSlash = "\\";

      // Escape special characters
      const escaped = value
        .replace(/\\/g, backSlash + backSlash)
        .replace(/"/g, backSlash + '"')
        .replace(/\n/g, backSlash + "n")
        .replace(/\r/g, backSlash + "r")
        .replace(/\t/g, backSlash + "t")
        .replace(/\f/g, backSlash + "f")
        .replace("\b", backSlash + "b")
        .replace(/\v/g, backSlash + "v");

      return `"${escaped}"`;
    }

    if (typeof value === "number") {
      return Number.isInteger(value) ? `#${value}` : `=${value}`;
    }

    if (typeof value === "boolean") {
      return `?${value}`;
    }

    if (Array.isArray(value)) {
      return this.arrayStringify(value, pretty, depth, globalIndent);
    }

    if (typeof value === "object" && value !== null) {
      return this.objectStringify(value, pretty, depth, globalIndent, true);
    }

    return String(value);
  }

  private static _indent(
    depth: number,
    indent: number,
    pretty: boolean
  ): string {
    return pretty ? "  ".repeat(indent).repeat(depth) : "";
  }

  private static objectStringify(
    obj: any,
    pretty: boolean,
    depth: number = 0,
    globalIndent: number = 2,
    useBraces: boolean = true
  ): string {
    const keys = Object.keys(obj);
    if (keys.length === 0) return useBraces ? "{}" : "";

    // Check if this is a named object with a single key
    if (keys.length === 1 && !this.isNamedObjectKey(keys[0])) {
      const value = obj[keys[0]];

      // Named array - use bracket notation directly
      if (Array.isArray(value)) {
        return `${keys[0]}${this.arrayStringify(value, pretty, depth)}`;
      }

      // Named object - use the new brace syntax for nested objects
      if (typeof value === "object" && value !== null) {
        return `${keys[0]}${this.objectStringify(
          value,
          pretty,
          depth,
          globalIndent,
          true
        )}`;
      }
    }

    const indent = this._indent(depth, globalIndent, pretty);
    const innerIndent = this._indent(depth + 1, globalIndent, pretty);
    const delimiter = pretty ? "\n" : " ";
    const start = useBraces ? (pretty ? "{\n" : "{") : "";
    const end = useBraces ? (pretty ? `\n${indent}}` : "}") : "";

    const items = keys
      .map((key) => {
        const value = obj[key];

        // Different formatting based on value type
        if (value === null) {
          // Null is represented by just the property name
          return pretty ? `${innerIndent}${key}` : key;
        } else if (Array.isArray(value)) {
          // Array properties use bracket notation
          const arrStr = this.arrayStringify(value, pretty, depth + 1);
          return pretty ? `${innerIndent}${key}${arrStr}` : `${key}${arrStr}`;
        } else if (typeof value === "object" && value !== null) {
          // Object properties use the new brace syntax
          const objStr = this.objectStringify(
            value,
            pretty,
            depth + 1,
            globalIndent,
            true
          );
          return pretty ? `${innerIndent}${key}${objStr}` : `${key}${objStr}`;
        } else if (typeof value === "string") {
          // Strings use direct attachment with double quotes
          const strValue = this.stringifyValue(value, pretty);
          return pretty
            ? `${innerIndent}${key}${strValue}`
            : `${key}${strValue}`;
        } else if (typeof value === "number") {
          // Numbers use # for integers and = for floats
          const numValue = this.stringifyValue(value, pretty);
          return pretty
            ? `${innerIndent}${key}${numValue}`
            : `${key}${numValue}`;
        } else if (typeof value === "boolean") {
          // Booleans use ?true or ?false
          const boolValue = this.stringifyValue(value, pretty);
          return pretty
            ? `${innerIndent}${key}${boolValue}`
            : `${key}${boolValue}`;
        } else {
          // Other values
          const valStr = this.stringifyValue(value, pretty);
          return pretty ? `${innerIndent}${key}${valStr}` : `${key}${valStr}`;
        }
      })
      .join(delimiter);

    return `${start}${items}${end}`;
  }

  private static isNamedObjectKey(key: string): boolean {
    // These keys should not be treated as named object indicators
    const reservedKeys = ["constructor", "prototype", "toString", "__proto__"];
    return reservedKeys.includes(key);
  }
}
