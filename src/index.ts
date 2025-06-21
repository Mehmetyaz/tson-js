export const TSON = {
  parse: (input: string) => new Parser(input).parse(),
  stringify: (value: any, pretty: boolean = false) =>
    Stringifier.stringify(value, pretty),
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
    '"': this.parseDoubleQuoteString,
    "'": this.parseSingleQuoteString,
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
      column: 0,
      line: 0,
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
    value: any | undefined;
  } {
    const startCursor = copyCursor(this._cursor);
    const name = this.parseName();
    const value = this.parseVal();
    if (name.length === 0) {
      this.addError(
        new TSONParseError("Name is required", startCursor, this._cursor)
      );
    }
    return { name, value };
  }

  private parseNameOptionalValue(): {
    name?: string;
    value: any | undefined;
  } {
    const name = this.parseName();
    const value = this.parseVal();
    if (name.length > 0) {
      return { name, value };
    } else {
      return { name: undefined, value };
    }
  }

  private parseVal(): any | undefined {
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
    return undefined;
  }

  private parseNull(): null {
    return null;
  }

  private parseObject(): any {
    const object: any = {};
    this.skipWhitespace();
    const startCursor = copyCursor(this._cursor);
    while (this.peek() !== "}" && !this.isAtEnd()) {
      const result = this.parseNameRequiredValue();
      if (result.value !== undefined) {
        object[result.name] = result.value;
        this.skipWhitespace();
        continue;
      } else {
        const continueParsing = this.skipToAfterNextWhitespace();
        if (!continueParsing) {
          this.addError(
            new TSONParseError(
              `Unterminated object at line ${startCursor.line}, column ${startCursor.column}`,
              startCursor,
              this._cursor
            )
          );
          return object;
        }
        this.skipWhitespace();
        continue;
      }
    }

    let closingBrace = this.advance();
    if (closingBrace !== "}") {
      this.addError(
        new TSONParseError(
          `Unterminated object at line ${startCursor.line}, column ${startCursor.column}`,
          startCursor,
          this._cursor
        )
      );
    }
    return object;
  }

  private skipToAfterNextWhitespace(): boolean {
    let whiteSpaceAppeared = false;
    while (true) {
      if (this.isAtEnd()) {
        return false;
      }
      if (!whiteSpaceAppeared) {
        this.advance();
        continue;
      }

      const char = this.peek();
      if (char === " " || char === "\n" || char === "\r" || char === "\t") {
        this.skipWhitespace();
        return true;
      }
    }
  }

  private parseArray(): any {
    const array: any[] = [];
    this.skipWhitespace();
    const startCursor = copyCursor(this._cursor);
    while (this.peek() !== "]" && !this.isAtEnd()) {
      const result = this.parseNameOptionalValue();
      if (result.value === undefined) {
        const continueParsing = this.skipToAfterNextWhitespace();
        if (!continueParsing) {
          this.addError(
            new TSONParseError(
              `Unterminated array at line ${startCursor.line}, column ${startCursor.column}`,
              startCursor,
              this._cursor
            )
          );
          return array;
        }
        this.skipWhitespace();
        continue;
      }
      if (result.name) {
        array.push({ [result.name]: result.value });
      } else {
        array.push(result.value);
      }
      this.skipWhitespace();
    }

    let closingBracket = this.advance();
    if (closingBracket !== "]") {
      this.addError(
        new TSONParseError(
          `Unterminated array at line ${startCursor.line}, column ${startCursor.column}`,
          startCursor,
          this._cursor
        )
      );
    }
    return array;
  }

  private parseArrayTypeSpecifier(): any[] {
    const startCursor = copyCursor(this._cursor);
    if (this.isAtEnd()) {
      this.addError(
        new TSONParseError(
          `Unterminated array type specifier at line ${startCursor.line}, column ${startCursor.column}`,
          startCursor,
          this._cursor
        )
      );
      return [];
    }
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

    if (this.isAtEnd()) {
      this.addError(
        new TSONParseError(
          `Unterminated array type specifier at line ${startCursor.line}, column ${startCursor.column}`,
          startCursor,
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
        if (result === undefined) {
          const continueParsing = this.skipToAfterNextWhitespace();
          if (!continueParsing) {
            this.addError(
              new TSONParseError(
                `Unterminated array type specifier at line ${startCursor.line}, column ${startCursor.column}`,
                startCursor,
                this._cursor
              )
            );
            return arr;
          }
          this.skipWhitespace();
          continue;
        }
        arr.push(result);
      } else {
        const result = parser.call(this, this._cursor);
        if (result === undefined) {
          this.skipWhitespace();
          continue;
        }

        arr.push(result);
      }
      this.skipWhitespace();
    }

    let closingBracket = this.advance();
    if (closingBracket !== "]") {
      this.addError(
        new TSONParseError(
          `Unterminated array type specifier at line ${startCursor.line}, column ${startCursor.column}`,
          startCursor,
          this._cursor
        )
      );
    }
    return arr;
  }

  private parseDoubleQuoteString(): string {
    const string: string[] = [];
    const startCursor = copyCursor(this._cursor);

    loop: while (this.peek() !== '"' && !this.isAtEnd()) {
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

      if (this.peek() === "\\") {
        switch (this.peekNext()) {
          case '"':
            this.advanceMultiple(2); // advance \ and "
            string.push('"');
            continue loop;
          case "\\":
            this.advanceMultiple(2); // advance \ and \
            string.push("\\");
            continue loop;
          case "n":
            this.advanceMultiple(2); // advance \ and n
            string.push("\n");
            continue loop;
          case "r":
            this.advanceMultiple(2); // advance \ and r
            string.push("\r");
            continue loop;
          case "t":
            this.advanceMultiple(2); // advance \ and t
            string.push("\t");
            continue loop;
          case "b":
            this.advanceMultiple(2); // advance \ and b
            string.push("\b");
            continue loop;
          case "f":
            this.advanceMultiple(2); // advance \ and f
            string.push("\f");
            continue loop;
          case "v":
            this.advanceMultiple(2); // advance \ and v
            string.push("\v");
            continue loop;
          case "\0":
            break loop;
          default:
            // If escape sequence is not recognized, treat it as literal
            string.push(this.advance()); // just add the backslash
            continue loop;
        }
      }

      string.push(this.advance());
    }
    if (this.isAtEnd()) {
      this.addError(
        new TSONParseError(
          `Unterminated string at line ${startCursor.line}, column ${startCursor.column}`,
          startCursor,
          this._cursor
        )
      );
    }

    let closingQuote = this.advance();
    if (closingQuote !== '"') {
      this.addError(
        new TSONParseError(
          `Unterminated string at line ${startCursor.line}, column ${startCursor.column}`,
          startCursor,
          this._cursor
        )
      );
    }

    return string.join("");
  }

  private parseSingleQuoteString(): string {
    const string: string[] = [];
    const startCursor = copyCursor(this._cursor);

    loop: while (this.peek() !== "'" && !this.isAtEnd()) {
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

      if (this.peek() === "\\") {
        switch (this.peekNext()) {
          case "'":
            this.advanceMultiple(2); // advance \ and '
            string.push("'");
            continue loop;
          case "\\":
            this.advanceMultiple(2); // advance \ and \
            string.push("\\");
            continue loop;
          case "n":
            this.advanceMultiple(2); // advance \ and n
            string.push("\n");
            continue loop;
          case "r":
            this.advanceMultiple(2); // advance \ and r
            string.push("\r");
            continue loop;
          case "t":
            this.advanceMultiple(2); // advance \ and t
            string.push("\t");
            continue loop;
          case "b":
            this.advanceMultiple(2); // advance \ and b
            string.push("\b");
            continue loop;
          case "f":
            this.advanceMultiple(2); // advance \ and f
            string.push("\f");
            continue loop;
          case "v":
            this.advanceMultiple(2); // advance \ and v
            string.push("\v");
            continue loop;
          case "\0":
            break loop;
          default:
            // If escape sequence is not recognized, treat it as literal
            string.push(this.advance()); // just add the backslash
            continue loop;
        }
      }

      string.push(this.advance());
    }
    if (this.isAtEnd()) {
      this.addError(
        new TSONParseError(
          `Unterminated string at line ${startCursor.line}, column ${startCursor.column}`,
          startCursor,
          this._cursor
        )
      );
    }

    let closingQuote = this.advance();
    if (closingQuote !== "'") {
      this.addError(
        new TSONParseError(
          `Unterminated string at line ${startCursor.line}, column ${startCursor.column}`,
          startCursor,
          this._cursor
        )
      );
    }

    return string.join("");
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

    // Check for invalid float format
    if (this.isInvalidFloat(numberString)) {
      this.addError(
        new TSONParseError(
          `Invalid float value: ${numberString}`,
          this._cursor,
          this._cursor
        )
      );
    }

    return parseFloat(numberString);
  }

  private isInvalidFloat(str: string): boolean {
    // Check for multiple decimal points
    const decimalPointCount = (str.match(/\./g) || []).length;
    if (decimalPointCount > 1) {
      return true;
    }

    // Check for invalid characters (not digits, sign, decimal point, or 'e' for scientific notation)
    // Scientific notation format: [+-]?[0-9]*(\.[0-9]+)?([eE][+-]?[0-9]+)?
    if (!/^[+-]?[0-9]*(\.[0-9]+)?([eE][+-]?[0-9]+)?$/.test(str)) {
      return true;
    }

    // Additional check for incomplete scientific notation
    if (/e[+-]?$/.test(str)) {
      return true;
    }

    // Ensure number is valid (not NaN)
    const value = parseFloat(str);

    return isNaN(value);
  }

  private parseInt(): number {
    let numberString = "";
    while (!Parser.isNumberTerminator(this.peek()) && !this.isAtEnd()) {
      numberString += this.advance();
    }

    // Check for valid integer format
    if (!/^[+-]?[0-9]+$/.test(numberString)) {
      this.addError(
        new TSONParseError(
          `Invalid integer value: ${numberString}`,
          this._cursor,
          this._cursor
        )
      );
    }

    const result = parseInt(numberString, 10);
    if (isNaN(result)) {
      this.addError(
        new TSONParseError(
          `Invalid number: ${numberString}`,
          this._cursor,
          this._cursor
        )
      );
    }
    return result;
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
      for (let i of ["r", "u", "e"]) {
        const str = this.advance();
        if (str !== i) {
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
      return true;
    } else if (value === "f") {
      for (let i of ["a", "l", "s", "e"]) {
        const str = this.advance();
        if (str !== i) {
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
      return false;
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
    if (this._cursor.position >= this._input.length) {
      return "\0";
    }
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
   * Stringify TSON value back to TSON format
   */
  static stringify(
    value: any,
    pretty: boolean = true,
    indent: number = 2
  ): string {
    return String(this.stringifyValue(value, pretty, 0, indent));
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
      .filter((item) => {
        return item !== undefined;
      })
      .map((item) => {
        const strValue = this.stringifyValue(item, pretty, depth + 1);
        if (pretty) {
          return `${innerIndent}${strValue}`;
        } else {
          return strValue;
        }
      })
      .join(delimiter);

    return `${start}${items}${end}`;
  }

  // Helper method to stringify a value properly based on its type
  private static stringifyValue(
    value: any,
    pretty: boolean,
    depth: number = 0,
    globalIndent: number = 2,
    isObjectProperty: boolean = false
  ): string {
    if (value === undefined) {
      return "";
    }
    if (value === null) {
      return "~";
    }

    if (value === undefined) {
      return "";
    }

    if (typeof value === "string") {
      const backSlash = "\\";

      // Choose quote type based on content
      const hasDoubleQuote = value.includes('"');
      const hasSingleQuote = value.includes("'");
      const useDoubleQuote =
        !hasDoubleQuote || (hasDoubleQuote && hasSingleQuote);

      let escaped: string;
      if (useDoubleQuote) {
        // Use double quotes, escape double quotes but not single quotes
        escaped = value
          .replace(/\\/g, backSlash + backSlash)
          .replace(/"/g, backSlash + '"')
          .replace(/\n/g, backSlash + "n")
          .replace(/\r/g, backSlash + "r")
          .replace(/\t/g, backSlash + "t")
          .replace(/\f/g, backSlash + "f")
          .replace("\b", backSlash + "b")
          .replace(/\v/g, backSlash + "v");

        return `"${escaped}"`;
      } else {
        // Use single quotes, escape single quotes but not double quotes
        escaped = value
          .replace(/\\/g, backSlash + backSlash)
          .replace(/'/g, backSlash + "'")
          .replace(/\n/g, backSlash + "n")
          .replace(/\r/g, backSlash + "r")
          .replace(/\t/g, backSlash + "t")
          .replace(/\f/g, backSlash + "f")
          .replace("\b", backSlash + "b")
          .replace(/\v/g, backSlash + "v");

        return `'${escaped}'`;
      }
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
      return this.objectStringify(
        value,
        pretty,
        depth,
        globalIndent,
        isObjectProperty
      );
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
    isObjectProperty: boolean = false
  ): string {
    const keys = Object.keys(obj);
    if (keys.length === 0) return "{}";

    // Check if this is a named object with a single key
    if (keys.length === 1) {
      const value = obj[keys[0]];
      if (!isObjectProperty) {
        return `${keys[0]}${this.stringifyValue(
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
    const start = pretty ? "{\n" : "{";
    const end = pretty ? `\n${indent}}` : "}";

    const items = keys
      .filter((k) => {
        return k !== undefined;
      })
      .map((key) => {
        const value = obj[key];
        const strValue = this.stringifyValue(
          value,
          pretty,
          depth + 1,
          undefined,
          true
        );
        if (pretty) {
          return `${innerIndent}${key}${strValue}`;
        } else {
          return `${key}${strValue}`;
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
