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

      // Parse named values based on the next token type
      switch (this.peek().type) {
        case TokenType.OPEN_BRACE:
          this.advance(); // consume '{'
          // Named object: person{name"John", age#30}
          return this.wrapNamedValue(name, this.parseObject());

        case TokenType.LESS_THAN:
          this.advance(); // consume '<'
          // Array with type specifier: myArray<#>[1, 2, 3]
          const typeSpecifier = this.parseArrayTypeSpecifier();

          if (!this.match(TokenType.OPEN_BRACKET)) {
            throw this.error(
              this.peek(),
              "Expected '[' after array type specifier"
            );
          }

          return this.wrapNamedValue(name, this.parseArray(typeSpecifier));

        case TokenType.OPEN_BRACKET:
          this.advance(); // consume '['
          // Named array: colors["red", "green", "blue"]
          return this.wrapNamedArray(name, this.parseArray());

        case TokenType.STRING:
          this.advance(); // consume string token
          // Direct string: name"John"
          return this.wrapNamedValue(name, this.previous().value);

        case TokenType.QUESTION:
          this.advance(); // consume '?'
          // Boolean: enabled?true
          return this.wrapNamedValue(name, this.parseBoolean());

        case TokenType.HASH:
          this.advance(); // consume '#'
          // Integer: age#30
          return this.wrapNamedValue(name, this.parseInt());

        case TokenType.EQUALS:
          this.advance(); // consume '='
          // Float: price=99.99
          return this.wrapNamedValue(name, this.parseFloat());

        case TokenType.AMPERSAND:
          this.advance(); // consume '&'
          // Float (deprecated): price&99.99
          return this.wrapNamedValue(name, this.parseFloat());

        default:
          // Just a name with no value: standalone 'name' means null
          return this.wrapNamedValue(name, null);
      }
    }

    // Handle unnamed values at root level
    switch (this.peek().type) {
      case TokenType.OPEN_BRACE:
        this.advance(); // consume '{'
        // Unnamed object: {name"John", age#30}
        return this.parseObject();

      case TokenType.LESS_THAN:
        this.advance(); // consume '<'
        // Unnamed array with type specifier: <#>[1, 2, 3]
        const typeSpecifier = this.parseArrayTypeSpecifier();

        if (!this.match(TokenType.OPEN_BRACKET)) {
          throw this.error(
            this.peek(),
            "Expected '[' after array type specifier"
          );
        }

        return this.parseArray(typeSpecifier);

      case TokenType.OPEN_BRACKET:
        this.advance(); // consume '['
        // Unnamed array: [1, 2, 3]
        return this.parseArray();

      case TokenType.STRING:
        this.advance(); // consume string token
        // String value
        return this.previous().value;

      case TokenType.NUMBER:
        this.advance(); // consume number token
        // Number value
        return parseFloat(this.previous().value);

      case TokenType.BOOLEAN:
        this.advance(); // consume boolean token
        // Boolean value
        return this.previous().value === "true";

      case TokenType.NULL:
        this.advance(); // consume null token
        // Null value
        return null;

      case TokenType.HASH:
        this.advance(); // consume '#'
        // Integer value with # prefix
        return this.parseInt();

      case TokenType.EQUALS:
        this.advance(); // consume '='
        // Float value with = prefix
        return this.parseFloat();

      case TokenType.AMPERSAND:
        this.advance(); // consume '&'
        // Float value with & prefix (deprecated)
        return this.parseFloat();

      case TokenType.QUESTION:
        this.advance(); // consume '?'
        // Boolean value with ? prefix
        return this.parseBoolean();

      default:
        throw this.error(this.peek(), "Expected value");
    }
  }

  private parseInt(): number {
    if (!this.check(TokenType.NUMBER)) {
      throw this.error(this.peek(), "Expected integer value after '#'");
    }
    return parseInt(this.advance().value, 10);
  }

  private parseFloat(): number {
    if (!this.check(TokenType.NUMBER)) {
      const symbol = this.previous().type === TokenType.EQUALS ? "=" : "&";
      throw this.error(
        this.peek(),
        `Expected floating-point value after '${symbol}'`
      );
    }
    return parseFloat(this.advance().value);
  }

  private parseBoolean(): boolean {
    if (!this.check(TokenType.BOOLEAN)) {
      throw this.error(
        this.peek(),
        "Expected boolean value (true or false) after '?'"
      );
    }
    return this.advance().value === "true";
  }

  private wrapNamedValue(name: string, value: TSONValue): TSONObject {
    const result: TSONObject = {};
    result[name] = value;
    return result;
  }

  private wrapNamedArray(name: string, array: TSONArray): TSONObject {
    return this.wrapNamedValue(name, array);
  }

  // Parse array type specifier like <#>, <?>, <=>
  private parseArrayTypeSpecifier(): string {
    switch (this.peek().type) {
      case TokenType.HASH:
        this.advance(); // consume '#'
        // Integer array
        if (!this.match(TokenType.GREATER_THAN)) {
          throw this.error(
            this.peek(),
            "Expected '>' after array type specifier"
          );
        }
        return "#";

      case TokenType.QUESTION:
        this.advance(); // consume '?'
        // Boolean array
        if (!this.match(TokenType.GREATER_THAN)) {
          throw this.error(
            this.peek(),
            "Expected '>' after array type specifier"
          );
        }
        return "?";

      case TokenType.EQUALS:
        this.advance(); // consume '='
        // Float array
        if (!this.match(TokenType.GREATER_THAN)) {
          throw this.error(
            this.peek(),
            "Expected '>' after array type specifier"
          );
        }
        return "=";

      case TokenType.AMPERSAND:
        this.advance(); // consume '&'
        // Float array (deprecated)
        if (!this.match(TokenType.GREATER_THAN)) {
          throw this.error(
            this.peek(),
            "Expected '>' after array type specifier"
          );
        }
        return "&";

      default:
        throw this.error(
          this.peek(),
          "Expected array type specifier (# for integer, ? for boolean, = for float)"
        );
    }
  }

  private parseObject(): TSONObject {
    const obj: TSONObject = {};

    // Empty object
    if (this.match(TokenType.CLOSE_BRACE)) {
      return obj;
    }

    do {
      this.skipCommentsAndWhitespace();

      // Check for trailing comma
      if (this.check(TokenType.CLOSE_BRACE)) {
        break;
      }

      // Parse key
      if (!this.check(TokenType.NAME)) {
        throw this.error(this.peek(), "Expected property name");
      }

      const key = this.advance().value;

      // Handle values based on the token type
      switch (this.peek().type) {
        case TokenType.OPEN_BRACE:
          this.advance(); // consume '{'
          // Nested object with the new syntax
          obj[key] = this.parseObject();
          break;

        case TokenType.LESS_THAN:
          this.advance(); // consume '<'
          // Key with type specifier: items<#>[1, 2, 3]
          const typeSpecifier = this.parseArrayTypeSpecifier();

          if (!this.match(TokenType.OPEN_BRACKET)) {
            throw this.error(
              this.peek(),
              "Expected '[' after array type specifier"
            );
          }

          obj[key] = this.parseArray(typeSpecifier);
          break;

        case TokenType.OPEN_BRACKET:
          this.advance(); // consume '['
          // Nested array
          obj[key] = this.parseArray();
          break;

        case TokenType.STRING:
          this.advance(); // consume string token
          // Direct string attachment: name"John"
          obj[key] = this.previous().value;
          break;

        case TokenType.QUESTION:
          this.advance(); // consume '?'
          // Boolean: enabled?true
          obj[key] = this.parseBoolean();
          break;

        case TokenType.HASH:
          this.advance(); // consume '#'
          // Integer: age#30
          obj[key] = this.parseInt();
          break;

        case TokenType.EQUALS:
          this.advance(); // consume '='
          // Float: price=99.99
          obj[key] = this.parseFloat();
          break;

        case TokenType.AMPERSAND:
          this.advance(); // consume '&'
          // Float: price&99.99 (deprecated)
          obj[key] = this.parseFloat();
          break;

        case TokenType.NULL:
          this.advance(); // consume null token
          // Null value: notes
          obj[key] = null;
          break;

        case TokenType.NAME:
          // We have another name, means we're looking at a property with no explicit value
          // In this case, it should be treated as null
          obj[key] = null;
          break;

        default:
          throw this.error(this.peek(), "Expected value");
      }

      this.skipCommentsAndWhitespace();
    } while (this.match(TokenType.COMMA));

    if (!this.match(TokenType.CLOSE_BRACE)) {
      throw this.error(this.peek(), "Expected '}' after object");
    }

    return obj;
  }

  private parseArray(typeSpecifier: string = ""): TSONArray {
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

      // Parse array items based on token type
      if (this.check(TokenType.NAME)) {
        const nameToken = this.peek();
        const name = nameToken.value;
        this.advance(); // consume the name

        // Handle named values in arrays
        switch (this.peek().type) {
          case TokenType.OPEN_BRACE:
            this.advance(); // consume '{'
            // Named object in array with new syntax: person{name"John"}
            const value = this.parseObject();
            array.push(this.wrapNamedValue(name, value));
            break;

          case TokenType.LESS_THAN:
            this.advance(); // consume '<'
            // Named array with type specifier: colors<#>[1, 2, 3]
            const innerTypeSpecifier = this.parseArrayTypeSpecifier();

            if (!this.match(TokenType.OPEN_BRACKET)) {
              throw this.error(
                this.peek(),
                "Expected '[' after array type specifier"
              );
            }

            array.push(
              this.wrapNamedValue(name, this.parseArray(innerTypeSpecifier))
            );
            break;

          case TokenType.OPEN_BRACKET:
            this.advance(); // consume '['
            // Named array in array: colors["red", "green"]
            const nestedArray = this.parseArray();
            array.push(this.wrapNamedArray(name, nestedArray));
            break;

          case TokenType.STRING:
            this.advance(); // consume string token
            // Direct string: name"John"
            array.push(this.wrapNamedValue(name, this.previous().value));
            break;

          case TokenType.QUESTION:
            this.advance(); // consume '?'
            // Boolean: enabled?true
            array.push(this.wrapNamedValue(name, this.parseBoolean()));
            break;

          case TokenType.HASH:
            this.advance(); // consume '#'
            // Integer: age#30
            array.push(this.wrapNamedValue(name, this.parseInt()));
            break;

          case TokenType.EQUALS:
            this.advance(); // consume '='
            // Float: price=99.99
            array.push(this.wrapNamedValue(name, this.parseFloat()));
            break;

          case TokenType.AMPERSAND:
            this.advance(); // consume '&'
            // Float: price&99.99 (deprecated)
            array.push(this.wrapNamedValue(name, this.parseFloat()));
            break;

          default:
            // Just a name, meaning null value
            array.push(this.wrapNamedValue(name, null));
            break;
        }
      } else {
        // Handle unnamed values in arrays
        switch (this.peek().type) {
          case TokenType.LESS_THAN:
            this.advance(); // consume '<'
            // Unnamed array with type specifier inside another array: <#>[1, 2, 3]
            const innerTypeSpecifier = this.parseArrayTypeSpecifier();

            if (!this.match(TokenType.OPEN_BRACKET)) {
              throw this.error(
                this.peek(),
                "Expected '[' after array type specifier"
              );
            }

            array.push(this.parseArray(innerTypeSpecifier));
            break;

          case TokenType.OPEN_BRACE:
            this.advance(); // consume '{'
            // Unnamed object in array with new syntax: {name"John"}
            array.push(this.parseObject());
            break;

          case TokenType.OPEN_BRACKET:
            this.advance(); // consume '['
            // Unnamed array in array: [1, 2, 3]
            array.push(this.parseArray());
            break;

          case TokenType.HASH:
            this.advance(); // consume '#'
            // Direct integer value in array: #42
            array.push(this.parseInt());
            break;

          case TokenType.EQUALS:
            this.advance(); // consume '='
            // Direct float value in array: =99.99
            array.push(this.parseFloat());
            break;

          case TokenType.AMPERSAND:
            this.advance(); // consume '&'
            // Direct float value in array: &99.99 (deprecated)
            array.push(this.parseFloat());
            break;

          case TokenType.QUESTION:
            this.advance(); // consume '?'
            // Direct boolean value in array: ?true
            array.push(this.parseBoolean());
            break;

          case TokenType.STRING:
            this.advance(); // consume string token
            // String value
            array.push(this.previous().value);
            break;

          case TokenType.NUMBER:
            this.advance(); // consume number token
            // Decide type based on type specifier
            const numValue = parseFloat(this.previous().value);
            if (typeSpecifier === "#") {
              // Force integer if in integer array
              array.push(parseInt(this.previous().value, 10));
            } else if (typeSpecifier === "=" || typeSpecifier === "&") {
              // Keep as float if in float array
              array.push(numValue);
            } else {
              // Otherwise, keep as is
              array.push(numValue);
            }
            break;

          case TokenType.BOOLEAN:
            this.advance(); // consume boolean token
            // Boolean value
            array.push(this.previous().value === "true");
            break;

          case TokenType.NULL:
            this.advance(); // consume null token
            // Null value
            array.push(null);
            break;

          default:
            throw this.error(this.peek(), "Expected array item");
            break;
        }
      }

      this.skipCommentsAndWhitespace();
    } while (this.match(TokenType.COMMA));

    if (!this.match(TokenType.CLOSE_BRACKET)) {
      throw this.error(this.peek(), "Expected ']' after array");
    }

    return array;
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
