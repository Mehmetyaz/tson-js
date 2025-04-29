import { Token, TokenType } from "./types";

/**
 * TSON Lexer class for tokenizing TSON input
 */
export class Lexer {
  private input: string;
  private position: number = 0;
  private line: number = 1;
  private column: number = 1;
  private tokens: Token[] = [];

  constructor(input: string) {
    this.input = input;
  }

  /**
   * Tokenize the input string
   */
  tokenize(): Token[] {
    while (!this.isAtEnd()) {
      this.scanToken();
    }

    this.tokens.push({
      type: TokenType.EOF,
      value: "",
      line: this.line,
      column: this.column,
    });

    return this.tokens;
  }

  private isAtEnd(): boolean {
    return this.position >= this.input.length;
  }

  private advance(): string {
    const char = this.input.charAt(this.position);
    this.position++;
    this.column++;
    return char;
  }

  private peek(): string {
    if (this.isAtEnd()) return "\0";
    return this.input.charAt(this.position);
  }

  private peekNext(): string {
    if (this.position + 1 >= this.input.length) return "\0";
    return this.input.charAt(this.position + 1);
  }

  private addToken(type: TokenType, value: string): void {
    this.tokens.push({
      type,
      value,
      line: this.line,
      column: this.column - value.length,
    });
  }

  private scanToken(): void {
    const char = this.advance();

    switch (char) {
      case "{":
        this.addToken(TokenType.OPEN_BRACE, char);
        break;
      case "}":
        this.addToken(TokenType.CLOSE_BRACE, char);
        break;
      case "[":
        this.addToken(TokenType.OPEN_BRACKET, char);
        break;
      case "]":
        this.addToken(TokenType.CLOSE_BRACKET, char);
        break;
      case "<":
        this.addToken(TokenType.LESS_THAN, char);
        break;
      case ">":
        this.addToken(TokenType.GREATER_THAN, char);
        break;
      case "(":
        throw new Error(
          `Syntax error: Parentheses are no longer supported in TSON. Use curly braces {} instead at line ${this.line}, column ${this.column}`
        );
      case ")":
        throw new Error(
          `Syntax error: Parentheses are no longer supported in TSON. Use curly braces {} instead at line ${this.line}, column ${this.column}`
        );
      case ",":
        this.addToken(TokenType.COMMA, char);
        break;
      case "=":
        // Float/double value indicator (changed from boolean)
        this.addToken(TokenType.EQUALS, char);
        break;
      case "#":
        // Integer value indicator
        this.addToken(TokenType.HASH, char);
        break;
      case "&":
        // Float/double value indicator (deprecated, replaced by =)
        this.addToken(TokenType.AMPERSAND, char);
        break;
      case "?":
        // Boolean value indicator (new)
        this.addToken(TokenType.QUESTION, char);
        break;
      case '"':
        // Check if this is a direct string attachment (no space between name and string)
        // This is handled directly by scanning the string
        this.scanQuotedString();
        break;
      case "\n":
        this.line++;
        this.column = 1;
        break;
      case " ":
      case "\r":
      case "\t":
        // Ignore whitespace
        break;
      case "/":
        if (this.peek() === "/") {
          this.scanLineComment();
        } else if (this.peek() === "*") {
          this.scanBlockComment();
        } else {
          this.scanName(char);
        }
        break;
      case "-":
        if (this.isDigit(this.peek())) {
          this.scanNumber(char);
        } else {
          this.scanName(char);
        }
        break;
      default:
        if (this.isDigit(char)) {
          this.scanNumber(char);
        } else if (this.isNameStart(char)) {
          // Check if the next character is a string, array, object, etc. indicator
          const afterName = this.scanName(char);

          // Check if we need to add an implicit null token
          if (
            afterName &&
            this.isNextWhitespaceOrDelimiter() &&
            !this.isSpecialOperator(this.peek())
          ) {
            this.addToken(TokenType.NULL, "null");
          }
        } else if (char.trim() === "") {
          // Ignore whitespace
          break;
        } else {
          throw new Error(
            `Unexpected character: ${char} at line ${this.line}, column ${this.column}`
          );
        }
    }
  }

  private isNextWhitespaceOrDelimiter(): boolean {
    const next = this.peek();
    return (
      next === " " ||
      next === "\t" ||
      next === "\r" ||
      next === "\n" ||
      next === "," ||
      next === "]" ||
      next === "}" ||
      next === "\0"
    );
  }

  private isSpecialOperator(char: string): boolean {
    return (
      char === "{" ||
      char === "[" ||
      char === '"' ||
      char === "=" ||
      char === "#" ||
      char === "&" ||
      char === "<" ||
      char === ">"
    );
  }

  private scanLineComment(): void {
    let text = "/";

    // Consume the second slash
    text += this.advance();

    // Read until end of line
    while (this.peek() !== "\n" && !this.isAtEnd()) {
      text += this.advance();
    }

    this.addToken(TokenType.COMMENT_LINE, text);
  }

  private scanBlockComment(): void {
    let text = "/*";

    // Consume the opening /*
    this.advance();

    // Read until closing */
    while (
      !(this.peek() === "*" && this.peekNext() === "/") &&
      !this.isAtEnd()
    ) {
      if (this.peek() === "\n") {
        this.line++;
        this.column = 1;
      }
      text += this.advance();
    }

    if (this.isAtEnd()) {
      throw new Error(
        `Unterminated block comment at line ${this.line}, column ${this.column}`
      );
    }

    // Consume the closing */
    text += this.advance() + this.advance();

    this.addToken(TokenType.COMMENT_BLOCK, text);
  }

  private scanQuotedString(): void {
    let value = "";

    while (this.peek() !== '"' && !this.isAtEnd()) {
      if (this.peek() === "\n") {
        throw new Error(
          `Unterminated string at line ${this.line}, column ${this.column}`
        );
      }

      if (this.peek() === "\\" && this.peekNext() === '"') {
        // Handle escaped quote
        value += this.advance(); // consume the backslash
      }

      value += this.advance();
    }

    if (this.isAtEnd()) {
      throw new Error(
        `Unterminated string at line ${this.line}, column ${this.column}`
      );
    }

    // Consume the closing "
    this.advance();

    const escaped = value
      .replace(/\\/g, "\\")
      .replace(/\\"/g, '"') // double quote
      .replace(/\\n/g, "\n") // newline
      .replace(/\\r/g, "\r") // carriage return
      .replace(/\\t/g, "\t"); // tab

    this.addToken(TokenType.STRING, escaped);
  }

  private scanNumber(firstChar: string): void {
    let value = firstChar;

    // Integer part
    while (this.isDigit(this.peek())) {
      value += this.advance();
    }

    // Decimal part
    if (this.peek() === "." && this.isDigit(this.peekNext())) {
      value += this.advance(); // consume '.'

      while (this.isDigit(this.peek())) {
        value += this.advance();
      }
    }

    this.addToken(TokenType.NUMBER, value);
  }

  private scanName(firstChar: string): boolean {
    let value = firstChar;
    let addedName = false;

    while (this.isNamePart(this.peek())) {
      value += this.advance();
    }

    // Special case for boolean values true/false
    if (value === "true" || value === "false") {
      this.addToken(TokenType.BOOLEAN, value);
      return false;
    }

    // Special case for null
    if (value === "null") {
      this.addToken(TokenType.NULL, value);
      return false;
    }

    this.addToken(TokenType.NAME, value);
    addedName = true;

    return addedName;
  }

  private isDigit(char: string): boolean {
    return char >= "0" && char <= "9";
  }

  private isNameStart(char: string): boolean {
    return (
      (char >= "a" && char <= "z") ||
      (char >= "A" && char <= "Z") ||
      char === "_" ||
      char === "$"
    );
  }

  private isNamePart(char: string): boolean {
    return (
      this.isNameStart(char) ||
      this.isDigit(char) ||
      char === "_" ||
      char === "." ||
      char === "-"
    );
  }
}
