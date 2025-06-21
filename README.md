# TSON-JS - JavaScript/TypeScript Implementation

> ⚠️ **EXPERIMENTAL PROJECT** - This is a newly created project. Not ready for production use.

JavaScript/TypeScript implementation of TSON (Token-Saving Object Notation) - a compact data format designed to reduce tokens in LLM API responses by 15-30% while maintaining readability and streaming capability.

## Features

- **Complete TSON Parser**: Parse TSON strings to JavaScript objects
- **TSON Stringifier**: Convert JavaScript objects to TSON format
- **Error Handling**: Comprehensive error reporting with line/column information
- **TypeScript Support**: Full TypeScript definitions included
- **Pretty Printing**: Optional formatted output for both parsing and stringification
- **Quote Selection**: Smart quote selection to minimize escaping

## Installation

```bash
npm install tson-js
```

## Quick Start

```typescript
import { TSON } from "tson-js";

// Parse TSON to JavaScript
const data = TSON.parse('user{name"John" age#30 active?true}');
console.log(data); // { user: { name: 'John', age: 30, active: true } }

// Convert JavaScript to TSON
const tson = TSON.stringify({ user: { name: "John", age: 30, active: true } });
console.log(tson); // user{name"John" age#30 active?true}
```

## API Reference

### `TSON.parse(input: string): any`

Parses a TSON string and returns the corresponding JavaScript value.

```typescript
// Basic parsing
const user = TSON.parse('user{name"John" age#30}');
// Result: { user: { name: "John", age: 30 } }

// Array parsing
const colors = TSON.parse('["red" "green" "blue"]');
// Result: ["red", "green", "blue"]

// Named array
const namedColors = TSON.parse('colors["red" "green" "blue"]');
// Result: { colors: ["red", "green", "blue"] }

// Mixed types
const mixed = TSON.parse("{id#123 price=99.99 available?true notes~}");
// Result: { id: 123, price: 99.99, available: true, notes: null }
```

### `TSON.stringify(value: any, pretty?: boolean): string`

Converts a JavaScript value to TSON format.

```typescript
// Basic stringification
const tson = TSON.stringify({ name: "John", age: 30 });
// Result: {name"John" age#30}

// Pretty printing
const prettyTson = TSON.stringify(
  {
    user: { name: "John", age: 30 },
  },
  true
);
// Result:
// user{
//   name"John"
//   age#30
// }

// Named root object
const named = TSON.stringify({ colors: ["red", "green"] });
// Result: colors["red" "green"]
```

## Type Handling

TSON-JS automatically handles JavaScript types with appropriate TSON prefixes:

| JavaScript Type    | TSON Format            | Example               |
| ------------------ | ---------------------- | --------------------- |
| `number` (integer) | `#value`               | `#123`                |
| `number` (float)   | `=value`               | `=99.99`              |
| `boolean`          | `?value`               | `?true`               |
| `null`             | `~`                    | `~`                   |
| `string`           | `"value"` or `'value'` | `"Hello"`             |
| `object`           | `{key-value-pairs}`    | `{name"John" age#30}` |
| `array`            | `[item1 item2]`        | `[#1 #2]`             |

## String Handling

TSON-JS intelligently selects quotes to minimize escaping:

```typescript
// Automatic quote selection
TSON.stringify({ message: "John's car" });
// Result: {message"John's car"}

TSON.stringify({ message: 'He said "Hello"' });
// Result: {message'He said "Hello"'}

// Escaping when necessary
TSON.stringify({ mixed: 'It\'s "quoted" text' });
// Result: {mixed"It's \"quoted\" text"}
```

## Error Handling

TSON-JS provides detailed error information:

```typescript
import { TSONParseError, TSONParseErrors } from "tson-js";

try {
  TSON.parse("invalid{syntax");
} catch (error) {
  if (error instanceof TSONParseErrors) {
    error.errors.forEach((err) => {
      console.log(`Error: ${err.message}`);
      console.log(
        `Location: line ${err.cursor.line}, column ${err.cursor.column}`
      );
    });
  }
}
```

## TSONL Support

Process TSONL (TSON Lines) format:

```typescript
const tsonl = `
user{name"John" age#30}
user{name"Jane" age#25}
user{name"Bob" age#35}
`;

const users = tsonl
  .trim()
  .split("\n")
  .map((line) => TSON.parse(line));
// Result: [
//   { user: { name: "John", age: 30 } },
//   { user: { name: "Jane", age: 25 } },
//   { user: { name: "Bob", age: 35 } }
// ]

// Convert back to TSONL
const backToTsonl = users.map((user) => TSON.stringify(user)).join("\n");
```

## Advanced Examples

### Complex Nested Objects

```typescript
const complex = {
  order: {
    id: "ORD-123",
    items: [
      { name: "Headphones", price: 99.99, quantity: 1 },
      { name: "Case", price: 19.99, quantity: 2 },
    ],
    customer: { name: "John", email: "john@example.com" },
    metadata: { source: "web", campaign: null },
  },
};

const tson = TSON.stringify(complex);
// Result: order{id"ORD-123" items[{name"Headphones" price=99.99 quantity#1} {name"Case" price=19.99 quantity#2}] customer{name"John" email"john@example.com"} metadata{source"web" campaign~}}
```

### Configuration Objects

```typescript
const config = {
  app: { name: "MyApp", debug: false, port: 8080 },
  database: { host: "localhost", ssl: true, timeout: 30 },
};

const configTson = TSON.stringify(config, true);
// Result:
// app{
//   name"MyApp"
//   debug?false
//   port#8080
// }
// database{
//   host"localhost"
//   ssl?true
//   timeout#30
// }
```

## Token Efficiency

Comparison with JSON:

```typescript
const data = { user: { name: "John", age: 30, active: true } };

// JSON: 47 characters
JSON.stringify(data); // {"user":{"name":"John","age":30,"active":true}}

// TSON: 32 characters (32% reduction)
TSON.stringify(data); // user{name"John" age#30 active?true}
```

## TypeScript Types

```typescript
import { TSONParseError, TSONParseErrors } from "tson-js";

// Error types for handling parse errors
interface Cursor {
  position: number;
  column: number;
  line: number;
}

class TSONParseError extends Error {
  cursor: Cursor;
  endCursor?: Cursor;
}

class TSONParseErrors extends Error {
  errors: TSONParseError[];
}
```

## Contributing

This package is part of the experimental TSON project. Contributions are welcome! Please see the main [TSON repository](https://github.com/Mehmetyaz/tson) for contribution guidelines.

## Support

If you find TSON-JS useful, you can support the project:

<a href="https://www.buymeacoffee.com/mehmetyaz"><img src="https://img.buymeacoffee.com/button-api/?text=Buy me a computer part&emoji=🔩&slug=mehmetyaz&button_colour=40DCA5&font_colour=ffffff&font_family=Inter&outline_colour=000000&coffee_colour=FFDD00" /></a>

## Documentation

For complete TSON format documentation, see:

- [TSON Format Guide](https://github.com/Mehmetyaz/tson/blob/main/docs/TSON.md)
- [TSON LLM Instructions](https://github.com/Mehmetyaz/tson/blob/main/docs/TSON_LLM_instructions.md)
- [Main Project README](https://github.com/Mehmetyaz/tson/blob/main/README.md)

## License

Apache License 2.0 - See [LICENSE](LICENSE) file for details.
