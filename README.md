# JavaScript Implementation of TSON

## This is a newly created project. Not ready for production use.

TSON (Token-Saving Object Notation) is a compact, human-readable data format designed for token-efficient, easy-to-parse data representation. This library provides TypeScript/JavaScript utilities for parsing and generating TSON.

## Installation

```bash
npm install tson-js
```

## Usage

### Parsing TSON to JavaScript

```javascript
import { parse } from "tson-js";

// Parse TSON string to JavaScript object
const data = parse('{name"John" age#30}');
console.log(data); // { name: 'John', age: 30 }

// Parse TSON array
const colors = parse('colors["red" "green" "blue"]');
console.log(colors); // { colors: ['red', 'green', 'blue'] }
```

### Converting TSON to JSON

```javascript
import { tsonToJSON } from "tson-js";

// Convert TSON to JSON string
const json = tsonToJSON('user{name"John" age#30}');
console.log(json); // {"user":{"name":"John","age":30}}

// Pretty print with formatting
const prettyJson = tsonToJSON('user{name"John" age#30}', true);
console.log(prettyJson);
// {
//   "user": {
//     "name": "John",
//     "age": 30
//   }
// }
```

### Converting JavaScript to TSON

```javascript
import { stringify } from "tson-js";

// Convert JavaScript object to TSON
const tson = stringify({ user: { name: "John", age: 30 } });
console.log(tson); // user{name"John" age#30}

// Pretty print with formatting
const prettyTson = stringify({ user: { name: "John", age: 30 } }, true);
console.log(prettyTson);
// user{
//   name"John"
//   age#30
// }
```

### Converting JSON to TSON

```javascript
import { jsonToTSON } from "tson-js";

// Convert JSON string to TSON
const tson = jsonToTSON('{"user":{"name":"John","age":30}}');
console.log(tson); // user{name"John" age#30}
```

## API Reference

### `parse(input: string, options?: ParseOptions): TSONValue`

Parses TSON string to JavaScript value.

**Options:**

- `preserveComments` (boolean): Whether to preserve comments in the output. Default: `false`

### `tsonToJSON(input: string, pretty?: boolean): string`

Converts TSON string to JSON string.

### `stringify(value: TSONValue, pretty?: boolean): string`

Converts JavaScript value to TSON string.

### `jsonToTSON(input: string, pretty?: boolean): string`

Converts JSON string to TSON string.

## Types

- `TSONValue`: Any valid TSON value (string, number, boolean, null, undefined, object, array)
- `TSONObject`: Object with string keys and TSON values
- `TSONArray`: Array of TSON values
- `ParseOptions`: Options for parsing

## TSON Format

TSON is a compact data format designed to reduce tokens in LLM API responses.

### Syntax

- Native types have prefixes:
  - `#` for integers: `#123`
  - `=` for float: `=123.45`
  - `?` for booleans: `?true`
  - `~` for null values: `~`
- Strings are wrapped with `""`, JSON escaped strings are supported: `"\"Hello, world!\""`
- Arrays are wrapped with `[]`, array items are separated by a space:
  ```
  [#123 =123.45 ?true ~ "string" {obj_key{inner_key#123}} ["array" "item"]]
  ```
- Objects are wrapped with `{}`, object keys & values are separated by a space, with type-specific prefixes after keys:
  ```
  {key#123 null_value~ obj_key{inner_key#123} array_key[?true =123.45 ["nested" "array"]]}
  ```

### Naming Rules

- Object properties must be named.
- Root values or array items can be named or unnamed:
  - Named:
    - `person{name"John"}` → JSON object will be `{person: {name: "John"}}`
    - `people[person{name"John"} {some"Value"}]` → JSON object will be `{people: [{person: {name: "John"}}, {some: "Value"}]}`
  - Unnamed:
    - `{name"John"}` → JSON object will be `{name: "John"}`

### TSONL (TSON Line)

- Like JSONL, but with TSON syntax.
- Each line is a valid TSON value.
- Lines are separated by newlines.

For more details about the TSON format, please check the [main TSON documentation](https://github.com/yourusername/tson).

## License

MIT
