import { TSON } from "../index";
import { describe, test, expect } from "@jest/globals";

describe("TSON Escape Characters", () => {
  describe("Parse escape sequences", () => {
    test("should parse escaped quotes", () => {
      const input = 'message{text"He said, \\"Hello World!\\""}';
      const result = TSON.parse(input);
      expect(result).toEqual({
        message: {
          text: 'He said, "Hello World!"',
        },
      });
    });

    test("should parse single quote strings", () => {
      const input = "message{text'Hello World!'}";
      const result = TSON.parse(input);
      expect(result).toEqual({
        message: {
          text: "Hello World!",
        },
      });
    });

    test("should parse escaped single quotes", () => {
      const input = "message{text'He said, \\'Hello World!\\''}";
      const result = TSON.parse(input);
      expect(result).toEqual({
        message: {
          text: "He said, 'Hello World!'",
        },
      });
    });

    test("should parse double quotes inside single quotes without escaping", () => {
      const input = "message{text'He said, \"Hello World!\"'}";
      const result = TSON.parse(input);
      expect(result).toEqual({
        message: {
          text: 'He said, "Hello World!"',
        },
      });
    });

    test("should parse single quotes inside double quotes without escaping", () => {
      const input = "message{text\"He said, 'Hello World!'\"}";
      const result = TSON.parse(input);
      expect(result).toEqual({
        message: {
          text: "He said, 'Hello World!'",
        },
      });
    });

    test("should parse escaped backslashes", () => {
      const input = 'path{value"C:\\\\Users\\\\Name\\\\Documents"}';
      const result = TSON.parse(input);
      expect(result).toEqual({
        path: {
          value: "C:\\Users\\Name\\Documents",
        },
      });
    });

    test("should parse escaped newlines", () => {
      const input = 'text{multiline"Line 1\\nLine 2\\nLine 3"}';
      const result = TSON.parse(input);
      expect(result).toEqual({
        text: {
          multiline: "Line 1\nLine 2\nLine 3",
        },
      });
    });

    test("should parse escaped carriage returns", () => {
      const input = 'text{windows"Line 1\\r\\nLine 2"}';
      const result = TSON.parse(input);
      expect(result).toEqual({
        text: {
          windows: "Line 1\r\nLine 2",
        },
      });
    });

    test("should parse escaped tabs", () => {
      const input = 'text{tabbed"Column1\\tColumn2\\tColumn3"}';
      const result = TSON.parse(input);
      expect(result).toEqual({
        text: {
          tabbed: "Column1\tColumn2\tColumn3",
        },
      });
    });

    test("should parse mixed escape sequences", () => {
      const input =
        'data{complex"Path: C:\\\\test\\\\file.txt\\nSize: 1024 bytes\\tModified: \\"2023-01-01\\""}';
      const result = TSON.parse(input);
      expect(result).toEqual({
        data: {
          complex:
            'Path: C:\\test\\file.txt\nSize: 1024 bytes\tModified: "2023-01-01"',
        },
      });
    });

    test("should handle empty string with escapes", () => {
      const input = 'test{empty"" escaped"\\"\\""}';
      const result = TSON.parse(input);
      expect(result).toEqual({
        test: {
          empty: "",
          escaped: '""',
        },
      });
    });

    test("should parse escape sequences in arrays", () => {
      const input =
        'messages["Hello\\nWorld" "Say \\"Hi\\"" "Path: C:\\\\temp"]';
      const result = TSON.parse(input);
      expect(result).toEqual({
        messages: ["Hello\nWorld", 'Say "Hi"', "Path: C:\\temp"],
      });
    });

    test("should parse multiple escape sequences in one string", () => {
      const input =
        'text{value"Start\\n\\tIndented line\\n\\t\\tDouble indented\\n\\"Quoted text\\"\\nEnd"}';
      const result = TSON.parse(input);
      expect(result).toEqual({
        text: {
          value:
            'Start\n\tIndented line\n\t\tDouble indented\n"Quoted text"\nEnd',
        },
      });
    });

    test("should handle consecutive escape characters", () => {
      const input = 'test{backslashes"\\\\\\\\\\\\\\\\"}';
      const result = TSON.parse(input);
      expect(result).toEqual({
        test: {
          backslashes: "\\\\\\\\",
        },
      });
    });
  });

  describe("Stringify escape sequences", () => {
    test("should escape quotes in strings", () => {
      const obj = {
        message: {
          text: 'He said, "Hello World!"',
        },
      };
      const result = TSON.stringify(obj, false);
      expect(result).toBe("message{text'He said, \"Hello World!\"'}");
    });

    test("should use double quotes when string contains single quotes", () => {
      const obj = {
        message: {
          text: "He said, 'Hello World!'",
        },
      };
      const result = TSON.stringify(obj, false);
      expect(result).toBe("message{text\"He said, 'Hello World!'\"}");
    });

    test("should use double quotes when string contains both quote types", () => {
      const obj = {
        message: {
          text: `He said, "Hello 'World'!"`,
        },
      };
      const result = TSON.stringify(obj, false);
      expect(result).toBe('message{text"He said, \\"Hello \'World\'!\\""}');
    });

    test("should use double quotes when no quotes present", () => {
      const obj = {
        message: {
          text: "Hello World!",
        },
      };
      const result = TSON.stringify(obj, false);
      expect(result).toBe('message{text"Hello World!"}');
    });

    test("should escape backslashes in strings", () => {
      const obj = {
        path: {
          value: "C:\\Users\\Name\\Documents",
        },
      };
      const result = TSON.stringify(obj, false);
      expect(result).toBe('path{value"C:\\\\Users\\\\Name\\\\Documents"}');
    });

    test("should escape newlines in strings", () => {
      const obj = {
        text: {
          multiline: "Line 1\nLine 2\nLine 3",
        },
      };
      const result = TSON.stringify(obj, false);
      expect(result).toBe('text{multiline"Line 1\\nLine 2\\nLine 3"}');
    });

    test("should escape carriage returns in strings", () => {
      const obj = {
        text: {
          windows: "Line 1\r\nLine 2",
        },
      };
      const result = TSON.stringify(obj, false);
      expect(result).toBe('text{windows"Line 1\\r\\nLine 2"}');
    });

    test("should escape tabs in strings", () => {
      const obj = {
        text: {
          tabbed: "Column1\tColumn2\tColumn3",
        },
      };
      const result = TSON.stringify(obj, false);
      expect(result).toBe('text{tabbed"Column1\\tColumn2\\tColumn3"}');
    });

    test("should escape mixed sequences", () => {
      const obj = {
        data: {
          complex:
            'Path: C:\\test\\file.txt\nSize: 1024 bytes\tModified: "2023-01-01"',
        },
      };
      const result = TSON.stringify(obj, false);
      expect(result).toBe(
        "data{complex'Path: C:\\\\test\\\\file.txt\\nSize: 1024 bytes\\tModified: \"2023-01-01\"'}"
      );
    });

    test("should handle empty and escaped strings", () => {
      const obj = {
        test: {
          empty: "",
          escaped: '""',
        },
      };
      const result = TSON.stringify(obj, false);
      expect(result).toBe('test{empty"" escaped\'""\'}');
    });

    test("should escape sequences in arrays", () => {
      const obj = {
        messages: ["Hello\nWorld", 'Say "Hi"', "Path: C:\\temp"],
      };
      const result = TSON.stringify(obj, false);
      expect(result).toBe(
        'messages["Hello\\nWorld" \'Say "Hi"\' "Path: C:\\\\temp"]'
      );
    });

    test("should handle consecutive backslashes", () => {
      const obj = {
        test: {
          backslashes: "\\\\\\\\",
        },
      };
      const result = TSON.stringify(obj, false);
      expect(result).toBe('test{backslashes"\\\\\\\\\\\\\\\\"}');
    });

    test("should handle form feed and backspace characters", () => {
      const obj = {
        special: {
          formfeed: "\f",
          backspace: "\b",
          vtab: "\v",
        },
      };
      const result = TSON.stringify(obj, false);
      expect(result).toBe('special{formfeed"\\f" backspace"\\b" vtab"\\v"}');
    });
  });

  describe("Round-trip escape sequences", () => {
    test("should maintain quotes through parse-stringify cycle", () => {
      const original = {
        quote: 'He said "Hello" to me',
      };
      const tsonString = TSON.stringify(original);
      const parsed = TSON.parse(tsonString);
      expect(parsed).toEqual(original);
    });

    test("should maintain single quotes through parse-stringify cycle", () => {
      const original = {
        quote: "He said 'Hello' to me",
      };
      const tsonString = TSON.stringify(original);
      const parsed = TSON.parse(tsonString);
      expect(parsed).toEqual(original);
    });

    test("should maintain mixed quotes through parse-stringify cycle", () => {
      const original = {
        quote: `He said "Hello 'World'!" to me`,
      };
      const tsonString = TSON.stringify(original);
      const parsed = TSON.parse(tsonString);
      expect(parsed).toEqual(original);
    });

    test("should maintain backslashes through parse-stringify cycle", () => {
      const original = {
        path: "C:\\Program Files\\App\\config.json",
      };
      const tsonString = TSON.stringify(original);
      const parsed = TSON.parse(tsonString);
      expect(parsed).toEqual(original);
    });

    test("should maintain newlines through parse-stringify cycle", () => {
      const original = {
        text: "First line\nSecond line\nThird line",
      };
      const tsonString = TSON.stringify(original);
      const parsed = TSON.parse(tsonString);
      expect(parsed).toEqual(original);
    });

    test("should maintain tabs through parse-stringify cycle", () => {
      const original = {
        data: "Name\tAge\tCity\nJohn\t30\tNY",
      };
      const tsonString = TSON.stringify(original);
      const parsed = TSON.parse(tsonString);
      expect(parsed).toEqual(original);
    });

    test("should maintain complex escape sequences through cycle", () => {
      const original = {
        complex:
          'File: "C:\\temp\\test.txt"\nContent:\n\t"Hello World!"\n\tEnd of file',
      };
      const tsonString = TSON.stringify(original);
      const parsed = TSON.parse(tsonString);
      expect(parsed).toEqual(original);
    });

    test("should handle arrays with escaped content", () => {
      const original = {
        data: [
          'Quote: "Hello"',
          "Path: C:\\temp",
          "Multi\nLine\nText",
          "Tab\tSeparated\tValues",
        ],
      };
      const tsonString = TSON.stringify(original);
      const parsed = TSON.parse(tsonString);
      expect(parsed).toEqual(original);
    });

    test("should handle arrays with mixed quote types", () => {
      const original = {
        data: [
          'Double: "Hello"',
          "Single: 'World'",
          `Mixed: "Hello 'World'!"`,
          "No quotes",
        ],
      };
      const tsonString = TSON.stringify(original);
      const parsed = TSON.parse(tsonString);
      expect(parsed).toEqual(original);
    });

    test("should handle all common escape sequences together", () => {
      const original = {
        allEscapes:
          'Quote: "text"\nNewline\rCarriage\tTab\\Backslash\fForm\bBack\vVertical',
      };
      const tsonString = TSON.stringify(original);
      const parsed = TSON.parse(tsonString);
      expect(parsed).toEqual(original);
    });
  });

  describe("Edge cases", () => {
    test("should handle string with only escape characters", () => {
      const input = 'test{escapes"\\n\\t\\r\\"\\\\"}';
      const result = TSON.parse(input);
      expect(result).toEqual({
        test: {
          escapes: '\n\t\r"\\',
        },
      });
    });

    test("should handle single quote string with only escape characters", () => {
      const input = "test{escapes'\\n\\t\\r\\'\\\\'}";
      const result = TSON.parse(input);
      expect(result).toEqual({
        test: {
          escapes: "\n\t\r'\\",
        },
      });
    });

    test("should choose optimal quote type for stringify", () => {
      const testCases = [
        { input: 'Text with "double" quotes', expectedQuote: "'" },
        { input: "Text with 'single' quotes", expectedQuote: '"' },
        { input: `Text with "both 'quote' types"`, expectedQuote: '"' },
        { input: "Plain text", expectedQuote: '"' },
      ];

      testCases.forEach(({ input, expectedQuote }) => {
        const obj = { text: input };
        const result = TSON.stringify(obj, false);
        expect(result.includes(`text${expectedQuote}`)).toBe(true);
      });
    });

    test("should handle empty string after escaping", () => {
      const obj = { empty: "" };
      const tsonString = TSON.stringify(obj);
      const parsed = TSON.parse(tsonString);
      expect(parsed).toEqual(obj);
    });

    test("should handle string with trailing backslash", () => {
      const original = {
        path: "C:\\folder\\",
      };
      const tsonString = TSON.stringify(original);
      const parsed = TSON.parse(tsonString);
      expect(parsed).toEqual(original);
    });

    test("should handle unicode characters with escapes", () => {
      const original = {
        mixed: 'Unicode: 🌟 with "quotes" and\nnewlines',
      };
      const tsonString = TSON.stringify(original);
      const parsed = TSON.parse(tsonString);
      expect(parsed).toEqual(original);
    });
  });
});
