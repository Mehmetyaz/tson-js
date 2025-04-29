import { Lexer } from "./lexer";
import {
  Token,
  TokenType,
  TSONValue,
  TSONObject,
  TSONArray,
  ParseOptions,
} from "./types";

/**
 * TSON Parser class
 */
export class Parser {
  private tokens: Token[] = [];
  private current: number = 0;
  private options: ParseOptions;
  private sourceText: string = ""; // Store the original source text
  private sourceLines: string[] = []; // Cache for split source lines

  constructor(options: ParseOptions = {}) {
    this.options = {
      preserveComments: false,
      ...options,
    };
  }

  /**
   * Parse TSON string to JavaScript value
   */
  parse(input: string): TSONValue {
    // Store the original input for better error messages
    this.sourceText = input;
    this.sourceLines = input.split("\n");

    const lexer = new Lexer(input);
    this.tokens = lexer.tokenize();
    this.current = 0;

    this.skipCommentsAndWhitespace();

    // Check what kind of structure we have at the root
    if (this.check(TokenType.NAME)) {
      const name = this.advance().value;

      if (this.match(TokenType.OPEN_PAREN)) {
        // Named object or value: person(name(John), age(30)) or name(John)
        const value = this.parseParenContent();
        return this.wrapNamedValue(name, value);
      } else if (this.match(TokenType.OPEN_BRACKET)) {
        // Named array: colors[red, green, blue]
        const array = this.parseArray();
        return this.wrapNamedArray(name, array);
      } else {
        throw this.error(this.peek(), "Expected '(' or '[' after object name");
      }
    } else if (this.match(TokenType.OPEN_PAREN)) {
      // Unnamed object: (name(John), age(30))
      return this.parseObject();
    } else if (this.match(TokenType.OPEN_BRACKET)) {
      // Unnamed array: [1, 2, 3]
      return this.parseArray();
    } else {
      // Simple value at the root (shouldn't happen in valid TSON)
      return this.parsePrimary();
    }
  }

  private wrapNamedValue(name: string, value: TSONValue): TSONObject {
    const result: TSONObject = {};
    result[name] = value;
    return result;
  }

  private wrapNamedObject(name: string, obj: TSONObject): TSONObject {
    return this.wrapNamedValue(name, obj);
  }

  private wrapNamedArray(name: string, array: TSONArray): TSONObject {
    return this.wrapNamedValue(name, array);
  }

  private parseParenContent(): TSONValue {
    // Check if this is an object with key-value pairs or just a single value
    if (
      this.check(TokenType.NAME) &&
      (this.checkNext(TokenType.OPEN_PAREN) ||
        this.checkNext(TokenType.OPEN_BRACKET))
    ) {
      // This is likely an object with multiple key-value pairs
      return this.parseObject();
    } else if (this.check(TokenType.CLOSE_PAREN)) {
      // Empty object
      this.advance(); // consume ')'
      return {};
    } else {
      // This is a simple value in parentheses
      const value = this.parsePrimary();
      if (!this.match(TokenType.CLOSE_PAREN)) {
        throw this.error(this.peek(), "Expected ')' after value");
      }
      return value;
    }
  }

  private parseObject(): TSONObject {
    const obj: TSONObject = {};

    // Empty object
    if (this.match(TokenType.CLOSE_PAREN)) {
      return obj;
    }

    do {
      this.skipCommentsAndWhitespace();

      // Check for trailing comma
      if (this.check(TokenType.CLOSE_PAREN)) {
        break;
      }

      // Parse key
      if (!this.check(TokenType.NAME)) {
        throw this.error(this.peek(), "Expected property name");
      }

      const key = this.advance().value;

      // Handle values
      if (this.match(TokenType.OPEN_PAREN)) {
        // Could be a nested object or a simple value in parentheses
        obj[key] = this.parseParenContent();
      } else if (this.match(TokenType.OPEN_BRACKET)) {
        // Nested array
        obj[key] = this.parseArray();
      } else {
        // Simple value
        obj[key] = this.parsePrimary();
      }

      this.skipCommentsAndWhitespace();
    } while (this.match(TokenType.COMMA));

    if (!this.match(TokenType.CLOSE_PAREN)) {
      throw this.error(this.peek(), "Expected ')' after object");
    }

    return obj;
  }

  private parseArray(): TSONArray {
    const array: TSONArray = [];

    // Empty array
    if (this.match(TokenType.CLOSE_BRACKET)) {
      return array;
    }

    do {
      this.skipCommentsAndWhitespace();

      // Check for trailing comma
      if (this.check(TokenType.CLOSE_BRACKET)) {
        break;
      }

      if (this.check(TokenType.NAME) && this.checkNext(TokenType.OPEN_PAREN)) {
        // Named object in array: person(name(John))
        const name = this.advance().value;
        this.advance(); // consume '('
        const value = this.parseParenContent();
        array.push(this.wrapNamedValue(name, value));
      } else if (this.match(TokenType.OPEN_PAREN)) {
        // Unnamed object in array: (name(John))
        array.push(this.parseParenContent());
      } else if (
        this.check(TokenType.NAME) &&
        this.checkNext(TokenType.OPEN_BRACKET)
      ) {
        // Named array in array: colors[red, green]
        const name = this.advance().value;
        this.advance(); // consume '['
        const nestedArray = this.parseArray();
        array.push(this.wrapNamedArray(name, nestedArray));
      } else if (this.match(TokenType.OPEN_BRACKET)) {
        // Unnamed array in array: [1, 2, 3]
        array.push(this.parseArray());
      } else {
        // Simple value
        array.push(this.parsePrimary());
      }

      this.skipCommentsAndWhitespace();
    } while (this.match(TokenType.COMMA));

    if (!this.match(TokenType.CLOSE_BRACKET)) {
      throw this.error(this.peek(), "Expected ']' after array");
    }

    return array;
  }

  private parsePrimary(): TSONValue {
    this.skipCommentsAndWhitespace();

    if (this.match(TokenType.STRING)) {
      return this.previous().value;
    }

    if (this.match(TokenType.NUMBER)) {
      return parseFloat(this.previous().value);
    }

    if (this.match(TokenType.BOOLEAN)) {
      return this.previous().value === "true";
    }

    if (this.match(TokenType.NULL)) {
      return null;
    }

    if (this.match(TokenType.NAME)) {
      return this.previous().value;
    }

    throw this.error(this.peek(), "Expected value");
  }

  private skipCommentsAndWhitespace(): void {
    while (
      this.match(TokenType.COMMENT_LINE) ||
      this.match(TokenType.COMMENT_BLOCK) ||
      this.match(TokenType.WHITESPACE)
    ) {
      // Skip these tokens
    }
  }

  private match(type: TokenType): boolean {
    if (this.check(type)) {
      this.advance();
      return true;
    }
    return false;
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private checkNext(type: TokenType): boolean {
    if (this.current + 1 >= this.tokens.length) return false;
    return this.tokens[this.current + 1].type === type;
  }

  private checkAfterNext(type: TokenType): boolean {
    if (this.current + 2 >= this.tokens.length) return false;
    return this.tokens[this.current + 2].type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private error(token: Token, message: string): Error {
    const location =
      token.type === TokenType.EOF
        ? "at end"
        : `at line ${token.line}, column ${token.column}`;

    // Get surrounding context for better error reporting
    const context = this.getTokenContext(token);

    return new Error(`Parse error ${location}: ${message}\n${context}`);
  }

  private getTokenContext(token: Token): string {
    if (token.type === TokenType.EOF) {
      return "End of file";
    }

    // Get the actual source line from our stored input
    const sourceLine = this.getSourceLine(token.line);
    if (!sourceLine) {
      return `Token: "${token.value}"`;
    }

    // Create a pointer to the token position
    const tokenStart = token.column - 1;

    // Calculate pointer position
    let pointer = " ".repeat(tokenStart) + "^";
    if (token.value.length > 1) {
      pointer =
        " ".repeat(tokenStart) + "^".repeat(Math.min(token.value.length, 10));
    }

    return `Source: ${sourceLine}\n        ${pointer}\nToken: "${
      token.value
    }" (${TokenType[token.type]})`;
  }

  private getSourceLine(line: number): string | null {
    // Get the exact source line from our stored lines
    if (line > 0 && line <= this.sourceLines.length) {
      return this.sourceLines[line - 1];
    }

    // Fallback to token-based reconstruction
    try {
      // Find tokens on this line to reconstruct the source
      const lineTokens = this.tokens.filter((t) => t.line === line);
      if (lineTokens.length === 0) {
        return null;
      }

      // Sort by column
      lineTokens.sort((a, b) => a.column - b.column);

      // Reconstruct the line (this is a simplification and may not be perfect)
      let reconstructed = "";
      let lastColumn = 1;

      for (const t of lineTokens) {
        // Add spaces for any gaps
        const spaces = Math.max(0, t.column - lastColumn);
        reconstructed += " ".repeat(spaces) + t.value;
        lastColumn = t.column + t.value.length;
      }

      return reconstructed;
    } catch (err) {
      return null;
    }
  }
}
