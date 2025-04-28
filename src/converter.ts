import { TSONValue, TSONObject, TSONArray } from "./types";

/**
 * Converter class for TSON to JSON transformations
 */
export class TSONStringifier {
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
    value: TSONValue,
    pretty: boolean = true,
    indent: number = 2
  ): string {
    if (value === null) {
      return "null";
    }

    if (value === undefined) {
      return "";
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

      // Always use double quotes for strings
      return `"${escaped}"`;
    }

    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
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
    arr: TSONArray,
    pretty: boolean,
    depth: number = 0,
    globalIndent: number = 2
  ): string {
    if (arr.length === 0) return "[]";

    const indent = this._indent(depth, globalIndent, pretty);
    const innerIndent = this._indent(depth + 1, globalIndent, pretty);
    const delimiter = pretty ? ",\n" : ", ";
    const start = pretty ? "[\n" : "[";
    const end = pretty ? `\n${indent}]` : "]";

    const items = arr
      .map((item) => {
        const itemStr = this.stringify(item, pretty, globalIndent);
        return pretty ? `${innerIndent}${itemStr}` : itemStr;
      })
      .join(delimiter);

    return `${start}${items}${end}`;
  }

  private static _indent(
    depth: number,
    indent: number,
    pretty: boolean
  ): string {
    return pretty ? "  ".repeat(indent).repeat(depth) : "";
  }

  private static objectStringify(
    obj: TSONObject,
    pretty: boolean,
    depth: number = 0,
    globalIndent: number = 2,
    addParentheses: boolean = true
  ): string {
    const keys = Object.keys(obj);
    if (keys.length === 0) return addParentheses ? "()" : "";

    // Check if this is a named object with a single key
    if (keys.length === 1 && !this.isNamedObjectKey(keys[0])) {
      const value = obj[keys[0]];

      // Named array - use bracket notation directly
      if (Array.isArray(value)) {
        return `${keys[0]}${this.arrayStringify(value, pretty, depth)}`;
      }

      // Named object
      if (typeof value === "object" && value !== null) {
        return `${keys[0]}${this.objectStringify(
          value as TSONObject,
          pretty,
          depth
        )}`;
      }
    }

    const indent = this._indent(depth, globalIndent, pretty);
    const innerIndent = this._indent(depth + 1, globalIndent, pretty);
    const delimiter = pretty ? ",\n" : ", ";
    const start = addParentheses ? (pretty ? "(\n" : "(") : "";
    const end = addParentheses ? (pretty ? `\n${indent})` : ")") : "";

    const items = keys
      .map((key) => {
        const value = obj[key];
        let valueStr: string;

        if (Array.isArray(value)) {
          // Use brackets notation for arrays in properties
          valueStr = this.arrayStringify(value, pretty, depth + 1);
          return pretty
            ? `${innerIndent}${key}${valueStr}`
            : `${key}${valueStr}`;
        } else if (typeof value === "object" && value !== null) {
          valueStr = this.objectStringify(
            value as TSONObject,
            pretty,
            depth + 1,
            globalIndent,
            false
          );
        } else {
          valueStr = this.stringify(value, pretty);
        }

        // Format property with parentheses around the value for non-arrays
        return pretty
          ? `${innerIndent}${key}(${valueStr})`
          : `${key}(${valueStr})`;
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
