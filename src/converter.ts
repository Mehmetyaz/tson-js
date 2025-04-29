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
                value as TSONObject,
                pretty,
                depth + 1,
                globalIndent,
                true
              )}`;
            }
          } else {
            // Regular object
            itemStr = this.objectStringify(
              item as TSONObject,
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
    value: TSONValue,
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
      return this.objectStringify(
        value as TSONObject,
        pretty,
        depth,
        globalIndent,
        true
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
    obj: TSONObject,
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
          value as TSONObject,
          pretty,
          depth,
          globalIndent,
          true
        )}`;
      }
    }

    const indent = this._indent(depth, globalIndent, pretty);
    const innerIndent = this._indent(depth + 1, globalIndent, pretty);
    const delimiter = pretty ? ",\n" : ", ";
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
            value as TSONObject,
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
