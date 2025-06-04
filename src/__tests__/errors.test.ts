import { TSON } from "../index";
import { describe, test, expect } from "@jest/globals";

describe("TSON Parser Error Handling", () => {
  // Unterminated string tests
  test("should throw error for unterminated string", () => {
    const input = `{name"John}`;
    expect(() => TSON.parse(input)).toThrow();
  });

  test("should throw error for unterminated string in array", () => {
    const input = `["hello" "world]`;
    expect(() => TSON.parse(input)).toThrow();
  });

  test("should throw error for unterminated escape sequence", () => {
    const input = `{message"Hello\\}`;
    expect(() => TSON.parse(input)).toThrow();
  });

  // Unterminated object tests
  test("should throw error for unterminated object", () => {
    const input = `person{name"John" age#30`;
    expect(() => TSON.parse(input)).toThrow();
  });

  test("should throw error for unterminated nested object", () => {
    const input = `user{name"Alice" address{city"Wonderland"}`;
    expect(() => TSON.parse(input)).toThrow();
  });

  test("should throw error for missing property value", () => {
    const input = `{name}`;
    expect(() => TSON.parse(input)).toThrow();
  });

  // Unterminated array tests
  test("should throw error for unterminated array", () => {
    const input = `colors["red" "green" "blue"`;
    expect(() => TSON.parse(input)).toThrow();
  });

  test("should throw error for unterminated typed array", () => {
    const input = `numbers<#>[1 2 3`;
    expect(() => TSON.parse(input)).toThrow();
  });

  test("should throw error for unterminated nested array", () => {
    const input = `{matrix[[#1 #2] [#3 #4]}`;
    expect(() => TSON.parse(input)).toThrow();
  });

  // Invalid type prefix tests
  test("should throw error for invalid number prefix", () => {
    const input = `{count$30}`;
    expect(() => TSON.parse(input)).toThrow();
  });

  test("should throw error for invalid boolean value", () => {
    const input = `{active?maybe}`;
    expect(() => TSON.parse(input)).toThrow();
  });

  test("should throw error for invalid null value", () => {
    const input = `{value~null}`;
    expect(() => TSON.parse(input)).toThrow();
  });

  // Mismatched brackets tests
  test("should throw error for mismatched object brackets", () => {
    const input = `person{name"John"]`;
    expect(() => TSON.parse(input)).toThrow();
  });

  test("should throw error for mismatched array brackets", () => {
    const input = `colors["red" "green" "blue"}`;
    expect(() => TSON.parse(input)).toThrow();
  });

  test("should throw error for mismatched type specifier brackets", () => {
    const input = `numbers<#[1 2 3]`;
    expect(() => TSON.parse(input)).toThrow();
  });

  // Invalid syntax tests
  test("should throw error for missing type prefix", () => {
    const input = `{age30}`;
    expect(() => TSON.parse(input)).toThrow();
  });

  test("should throw error for invalid array separator", () => {
    const input = `[#1;#2;#3]`;
    expect(() => TSON.parse(input)).toThrow();
  });

  test("should throw error for invalid type specifier", () => {
    const input = `numbers<@>[1 2 3]`;
    expect(() => TSON.parse(input)).toThrow();
  });

  // Malformed input tests
  test("should throw error for completely malformed input", () => {
    const input = `{{{`;
    expect(() => TSON.parse(input)).toThrow();
  });

  test("should throw error for empty input", () => {
    const input = ``;
    expect(() => TSON.parse(input)).toThrow();
  });

  // Deep nesting error tests
  test("should throw error for deeply nested unterminated objects", () => {
    const input = `user{
      profile{
        personal{
          name"John"
          details{
            age#30
            height=175.5
    }`;
    expect(() => TSON.parse(input)).toThrow();
  });

  test("should throw error for deeply nested unterminated arrays", () => {
    const input = `matrix[
      [#1 #2 #3]
      [#4 #5 #6]
      [#7 #8 [#9 #10 #11
    ]`;
    expect(() => TSON.parse(input)).toThrow();
  });

  test("should throw error for mixed nesting with unterminated structure", () => {
    const input = `data{
      values[
        {x#1 y#2}
        {x#3 y[#4 #5]}
        {z{
          inner[#1 #2]
      ]
    }`;
    expect(() => TSON.parse(input)).toThrow();
  });

  // Specific error message tests
  test("should provide specific error message for unterminated string", () => {
    const input = `{name"John}`;
    expect(() => TSON.parse(input)).toThrow(
      /unterminated string|unexpected end|unexpected token/i
    );
  });

  test("should provide specific error message for unterminated object", () => {
    const input = `person{name"John" age#30`;
    expect(() => TSON.parse(input)).toThrow(
      /unterminated object|unexpected end|unexpected token|missing }/i
    );
  });

  test("should provide specific error message for unterminated array", () => {
    const input = `colors["red" "green" "blue"`;
    expect(() => TSON.parse(input)).toThrow(
      /unterminated array|unexpected end|unexpected token|missing ]/i
    );
  });

  // Float value error tests
  test("should throw error for invalid float values with multiple decimal points", () => {
    const inputs = [`{value=12.34.56}`, `{value=1.2.3.4}`, `{pi=3..14}`];

    inputs.forEach((input) => {
      expect(() => TSON.parse(input)).toThrow();
    });
  });

  test("should throw error for float values with invalid characters", () => {
    const inputs = [
      `{rate=12a.34}`,
      `{rate=12.34b}`,
      `{rate=a12.34}`,
      `{rate=12.b34}`,
    ];

    inputs.forEach((input) => {
      expect(() => TSON.parse(input)).toThrow();
    });
  });

  test("should throw error for float values in scientific notation with errors", () => {
    const inputs = [
      `{value=1.23e}`,
      `{value=1.23e+}`,
      `{value=1.23e-}`,
      `{value=1.23ea}`,
    ];

    inputs.forEach((input) => {
      expect(() => TSON.parse(input)).toThrow();
    });
  });
});
