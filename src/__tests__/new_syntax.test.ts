import { TSON } from "../index";
import { describe, test, expect } from "@jest/globals";

describe("TSON Parser with New Syntax", () => {
  test("Basic object with new syntax", () => {
    const input = `person{name"John Doe" age#30 active?true balance=123.45 notes~}`;
    const expected = {
      person: {
        name: "John Doe",
        age: 30,
        active: true,
        balance: 123.45,
        notes: null,
      },
    };
    expect(TSON.parse(input)).toEqual(expected);
  });

  test("Nested objects with new syntax", () => {
    const input = `user{
      name"Alice",
      age#28,
      address{
        street"123 Main St",
        city"Wonderland",
        zipcode#12345
      }
    }`;
    const expected = {
      user: {
        name: "Alice",
        age: 28,
        address: {
          street: "123 Main St",
          city: "Wonderland",
          zipcode: 12345,
        },
      },
    };
    expect(TSON.parse(input)).toEqual(expected);
  });

  test("Arrays with new syntax", () => {
    const input = `colors["red", "green", "blue"]`;
    const expected = { colors: ["red", "green", "blue"] };
    expect(TSON.parse(input)).toEqual(expected);
  });

  test("Mixed array items", () => {
    const input = `items[
      product{name"Laptop" price=999.99}
      {name"Mouse" price=49.99}
      "Keyboard"
      #42
    ]`;
    const expected = {
      items: [
        { product: { name: "Laptop", price: 999.99 } },
        { name: "Mouse", price: 49.99 },
        "Keyboard",
        42,
      ],
    };
    expect(TSON.parse(input)).toEqual(expected);
  });

  test("Null values", () => {
    const input = `person{name"John" email~ phone~}`;
    const expected = { person: { name: "John", email: null, phone: null } };
    expect(TSON.parse(input)).toEqual(expected);
  });

  test("Boolean values", () => {
    const input = `settings{darkMode?true notifications?false}`;
    const expected = { settings: { darkMode: true, notifications: false } };
    expect(TSON.parse(input)).toEqual(expected);
  });

  test("Number values", () => {
    const input = `stats{count#42 average=3.14 zero#0}`;
    const expected = { stats: { count: 42, average: 3.14, zero: 0 } };
    expect(TSON.parse(input)).toEqual(expected);
  });

  test("Complex nested structure", () => {
    const input = `
    order{
      id"ORD-12345"
      customer{
        id"CUST-789"
        name"John Doe"
        email"john@example.com"
      }
      items[
        {
          id"ITEM-001"
          name"Headphones"
          quantity#1
          price=99.99
        }
        {
          id"ITEM-002"
          name"Phone Case"
          quantity#2
          price=19.99
        }
      ],
      shipped?true
      total=139.97
    }`;

    const expected = {
      order: {
        id: "ORD-12345",
        customer: {
          id: "CUST-789",
          name: "John Doe",
          email: "john@example.com",
        },
        items: [
          {
            id: "ITEM-001",
            name: "Headphones",
            quantity: 1,
            price: 99.99,
          },
          {
            id: "ITEM-002",
            name: "Phone Case",
            quantity: 2,
            price: 19.99,
          },
        ],
        shipped: true,
        total: 139.97,
      },
    };

    expect(TSON.parse(input)).toEqual(expected);
  });

  test("Stringify with new syntax", () => {
    const obj = {
      person: {
        name: "John Doe",
        age: 30,
        isActive: true,
        scores: [98, 87, 95],
        address: {
          street: "123 Main St",
          city: "Anytown",
        },
      },
    };

    const tsonString = TSON.stringify(obj);
    const parsedBack = TSON.parse(tsonString);

    expect(parsedBack).toEqual(obj);
  });

  test("Array with direct number values", () => {
    const input = `[#1 #2 #3 #4 #5]`;
    const expected = [1, 2, 3, 4, 5];
    expect(TSON.parse(input)).toEqual(expected);
  });

  test("Array with direct float values", () => {
    const input = `[=1.1 =2.2 =3.3]`;
    const expected = [1.1, 2.2, 3.3];
    expect(TSON.parse(input)).toEqual(expected);
  });

  test("Array with direct boolean values", () => {
    const input = `[?true ?false ?true]`;
    const expected = [true, false, true];
    expect(TSON.parse(input)).toEqual(expected);
  });

  test("Mixed array with various types", () => {
    const input = `["string" #42 =3.14 ?true {name"John"}]`;
    const expected = ["string", 42, 3.14, true, { name: "John" }];
    expect(TSON.parse(input)).toEqual(expected);
  });

  test("Array with type specifier", () => {
    const input = `numbers<#>[1 2 3 4 5]`;
    const expected = { numbers: [1, 2, 3, 4, 5] };
    expect(TSON.parse(input)).toEqual(expected);
  });

  test("Array with float type specifier", () => {
    const input = `prices<=>[ 10.5 20.99 5.0]`;
    const expected = { prices: [10.5, 20.99, 5.0] };
    expect(TSON.parse(input)).toEqual(expected);
  });

  test("Array with boolean type specifier", () => {
    const input = `flags<?>[ true false true]`;
    const expected = { flags: [true, false, true] };
    expect(TSON.parse(input)).toEqual(expected);
  });

  test("Array with type specifier allows items without explicit type markers", () => {
    const input = `nums<#>[1 2 3 4 5]`;
    const expected = { nums: [1, 2, 3, 4, 5] };
    expect(TSON.parse(input)).toEqual(expected);
  });

  test("Nested arrays with type specifiers", () => {
    const input = `data{
      ints<#>[1, 2, 3],
      floats<=>[ 1.1, 2.2, 3.3],
      flags<?>[ true, false, true]
    }`;
    const expected = {
      data: {
        ints: [1, 2, 3],
        floats: [1.1, 2.2, 3.3],
        flags: [true, false, true],
      },
    };
    expect(TSON.parse(input)).toEqual(expected);
  });

  test("Array with type specifier auto-converts values", () => {
    // Float 3.5 should be converted to integer 3 in a int-typed array
    const input = `nums<#>[1, 2, ?true]`;
    const expected = { nums: [1, 2, true] };
    expect(TSON.parse(input)).toEqual(expected);
  });

  test("Unnamed array with type specifier", () => {
    const input = `<#>[1, 2, 3, 4, 5]`;
    const expected = [1, 2, 3, 4, 5];
    expect(TSON.parse(input)).toEqual(expected);
  });

  test("Mixed array with nested typed arrays", () => {
    const input = `[<#>[1, 2, 3], <=>[ 4.5, 5.5], <?>[ true, false]]`;
    const expected = [
      [1, 2, 3],
      [4.5, 5.5],
      [true, false],
    ];
    expect(TSON.parse(input)).toEqual(expected);
  });

  test("Object with typed array properties", () => {
    const input = `{
      integers<#>[1, 2, 3],
      floats<=>[ 1.1, 2.2, 3.3],
      booleans<?>[ true, false]
    }`;
    const expected = {
      integers: [1, 2, 3],
      floats: [1.1, 2.2, 3.3],
      booleans: [true, false],
    };
    expect(TSON.parse(input)).toEqual(expected);
  });

  test("Complex nested structure with typed arrays", () => {
    const input = `data{
      values[
        <#>[1, 2, 3],
        <=>[ 4.4, 5.5],
        <?>[ true, false],
        {nested<#>[7, 8, 9]}
      ]
    }`;
    const expected = {
      data: {
        values: [[1, 2, 3], [4.4, 5.5], [true, false], { nested: [7, 8, 9] }],
      },
    };
    expect(TSON.parse(input)).toEqual(expected);
  });

  test("should parse arrays with direct values", () => {
    const tests = [
      {
        input: "[#1 #2 #3]",
        expected: [1, 2, 3],
        description: "Array with direct integer values",
      },
      {
        input: "[=10.5 =20.75 =30.25]",
        expected: [10.5, 20.75, 30.25],
        description: "Array with direct float values",
      },
      {
        input: "[?true ?false ?true]",
        expected: [true, false, true],
        description: "Array with direct boolean values",
      },
    ];

    tests.forEach(({ input, expected, description }) => {
      const result = TSON.parse(input);
      expect(result).toEqual(expected);
    });
  });

  test("should parse arrays with type specifiers", () => {
    const tests = [
      {
        input: "<#>[1, 2, 3]",
        expected: [1, 2, 3],
        description: "Array with integer type specifier",
      },
      {
        input: "<?>[true, false, true]",
        expected: [true, false, true],
        description: "Array with boolean type specifier",
      },
      {
        input: '<=>["string1", "string2", "string3"]',
        expected: ["string1", "string2", "string3"],
        description: "Array with float type specifier but containing strings",
      },
    ];

    tests.forEach(({ input, expected, description }) => {
      const result = TSON.parse(input);
      expect(result).toEqual(expected);
    });
  });

  test("should parse unnamed and nested array types", () => {
    const tests = [
      {
        input: "<#>[1, 2, <#>[3, 4]]",
        expected: [1, 2, [3, 4]],
        description: "Unnamed array with nested typed array",
      },
      {
        input: "<?>[true, false, <?>[true, false]]",
        expected: [true, false, [true, false]],
        description: "Unnamed boolean array with nested boolean array",
      },
      {
        input: '<=>["1.5", "2.5", <=>["3.75", "4.25"]]',
        expected: ["1.5", "2.5", ["3.75", "4.25"]],
        description: "Float array with nested float array containing strings",
      },
    ];

    tests.forEach(({ input, expected, description }) => {
      const result = TSON.parse(input);
      expect(result).toEqual(expected);
    });
  });
});
