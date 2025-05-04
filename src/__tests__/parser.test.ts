import { TSON } from "../index";
import { describe, test, expect } from "@jest/globals";

describe("TSON Parser", () => {
  test("should parse a simple object", () => {
    const input = 'user{name"John" age#30}';
    const result = TSON.parse(input);
    expect(result).toEqual({ user: { name: "John", age: 30 } });
  });

  test("should parse an unnamed object", () => {
    const input = '{name"John" age#30}';
    const result = TSON.parse(input);
    expect(result).toEqual({ name: "John", age: 30 });
  });

  test("should parse a named array", () => {
    const input = 'colors["red" "green" "blue"]';
    const result = TSON.parse(input);
    expect(result).toEqual({ colors: ["red", "green", "blue"] });
  });

  test("should parse an unnamed array", () => {
    const input = "[#1 #2 #3 #4 #5]";
    const result = TSON.parse(input);
    expect(result).toEqual([1, 2, 3, 4, 5]);
  });

  test("should parse nested objects", () => {
    const input = 'person{name"John" address{city"New York" street"Broadway"}}';
    const result = TSON.parse(input);
    expect(result).toEqual({
      person: {
        name: "John",
        address: {
          city: "New York",
          street: "Broadway",
        },
      },
    });
  });

  test("should parse quoted strings", () => {
    const input = 'user{name"John Doe" email"john.doe@example.com"}';
    const result = TSON.parse(input);
    expect(result).toEqual({
      user: {
        name: "John Doe",
        email: "john.doe@example.com",
      },
    });
  });

  test("should parse special values", () => {
    const input = 'values{nll~ empty""}';
    const result = TSON.parse(input);
    expect(result).toEqual({
      values: {
        nll: null,
        empty: "",
      },
    });
  });

  test("should convert TSON to JSON", () => {
    const input = 'user{name"John" age#30}';
    const result = JSON.stringify(TSON.parse(input));
    expect(result).toBe('{"user":{"name":"John","age":30}}');
  });

  test("should stringify JavaScript object to TSON", () => {
    const input = { user: { name: "John", age: 30 } };
    const result = TSON.stringify(input);
    expect(result).toBe('user{name"John" age#30}');
  });

  test("should convert JSON to TSON", () => {
    const input = '{"user":{"name":"John","age":30}}';
    const result = TSON.stringify(JSON.parse(input));
    expect(result).toBe('user{name"John" age#30}');
  });

  test("should convert JSON Array to TSON", () => {
    const input =
      '{"users":[{"name":"John","age":30}, {"name":"Jane","age":25}]}';
    const result = TSON.stringify(JSON.parse(input));
    expect(result).toBe('users[{name"John" age#30} {name"Jane" age#25}]');
  });

  // Benchmark examples tests
  describe("Benchmark Examples", () => {
    test("should parse dictionary.tsonl", () => {
      const input = `metadata{term"Artificial Intelligence" language"en" part_of_speech"noun"}
  text_definition{content"A branch of computer science dealing with the simulation of intelligent behavior in computers."}
  text_definition{content"The capability of a machine to imitate intelligent human behavior."}
  image{url"https://example.com/ai_image.jpg" caption"Visual representation of AI concept"}
  text_example{content"AI systems are typically categorized as either 'narrow AI' (designed for specific tasks) or 'general AI' (capable of performing any intellectual task)."}
  audio{url"https://example.com/ai_pronunciation.mp3" duration#2.5 transcript"Artificial Intelligence"}
  text_history{content"First coined as a term in 1956 by John McCarthy at the Dartmouth Conference."}`;

      // Parse each line individually
      const lines = input.trim().split("\n");
      lines.forEach((line) => {
        const result = TSON.parse(line);
        expect(result).toBeDefined();
        // Just check that it parses without error, we don't need to verify exact structure
      });
    });

    test("should parse user_orders.tsonl", () => {
      const input = `user{id"u1001" username"johndoe" fullName"John Doe" registeredAt"2023-05-15T10:30:00Z"}
  contact{userId"u1001" email"john.doe@example.com" isPrimary?true}
  contact{userId"u1001" phone"+1-555-123-4567" isPrimary?false}
  address{userId"u1001" type"shipping" street"123 Main St" city"San Francisco" state"CA" zipCode"94105" country"USA"}
  address{userId"u1001" type"billing" street"123 Main St" city"San Francisco" state"CA" zipCode"94105" country"USA"}
  order{id"o2001" userId"u1001" orderDate"2023-06-10T15:45:00Z" status"delivered" total=234.56}
  order_item{orderId"o2001" productId"p3001" name"Wireless Headphones" quantity#1 price=199.99}
  order_item{orderId"o2001" productId"p3002" name"Phone Case" quantity#2 price=17.99}
  user{id"u1002" username"janesmith" fullName"Jane Smith" registeredAt"2023-04-20T14:15:00Z"}
  contact{userId"u1002" email"jane.smith@example.com" isPrimary?true}
  address{userId"u1002" type"shipping" street"456 Oak Avenue" city"Los Angeles" state"CA" zipCode"90001" country"USA"}
  order{id"o2002" userId"u1002" orderDate"2023-06-12T09:30:00Z" status"shipped" total=59.95}
  order_item{orderId"o2002" productId"p3003" name"Bluetooth Speaker" quantity#1 price=59.95}`;

      // Parse each line individually
      const lines = input.trim().split("\n");
      lines.forEach((line) => {
        const result = TSON.parse(line);
        expect(result).toBeDefined();
        // Just check that it parses without error, we don't need to verify exact structure
      });
    });

    test("should parse schema.tsonl", () => {
      const input = `schema{name"conversation" version#1.0 description"Schema for conversation data"}
  schema_field{schema"conversation" field"id" dataType"string" required?true description"Unique conversation identifier"}
  schema_field{schema"conversation" field"participants" dataType"array" required?true description"List of conversation participants"}
  schema_field{schema"conversation" field"created_at" dataType"timestamp" required?true description"When conversation was created"}
  schema_field{schema"conversation" field"updated_at" dataType"timestamp" required?true description"When conversation was last updated"}
  schema_field{schema"conversation" field"title" dataType"string" required?false description"Optional conversation title"}
  schema{name"message" version#1.0 description"Schema for message data within conversations"}
  schema_field{schema"message" field"id" dataType"string" required?true description"Unique message identifier"}
  schema_field{schema"message" field"conversation_id" dataType"string" required?true description"Reference to parent conversation"}
  schema_field{schema"message" field"sender_id" dataType"string" required?true description"User ID of message sender"}
  schema_field{schema"message" field"content" dataType"string" required?true description"Message content"}
  schema_field{schema"message" field"timestamp" dataType"timestamp" required?true description"When message was sent"}
  schema_field{schema"message" field"attachments" dataType"array" required?false description"Optional file attachments"}
  conversation{id"conv123" participants["user1" "user2"] created_at"2023-06-20T10:00:00Z" updated_at"2023-06-20T10:30:00Z" title"Planning meeting"}
  message{id"msg1" conversation_id"conv123" sender_id"user1" content"Hi there! Shall we discuss the project?" timestamp"2023-06-20T10:00:00Z"}`;

      // Parse each line individually
      const lines = input.trim().split("\n");
      lines.forEach((line) => {
        const result = TSON.parse(line);
        expect(result).toBeDefined();
        // Just check that it parses without error, we don't need to verify exact structure
      });
    });

    test("should parse repeating.tsonl", () => {
      const input = `log_session{sessionId"sess12345" startTime"2023-06-01T08:00:00Z" userId"user789" deviceType"mobile"}
  log_event{sessionId"sess12345" timestamp"2023-06-01T08:00:05Z" eventType"page_view" path"/home"}
  log_event{sessionId"sess12345" timestamp"2023-06-01T08:00:30Z" eventType"button_click" elementId"search_btn"}
  log_event{sessionId"sess12345" timestamp"2023-06-01T08:00:45Z" eventType"search" query"summer shoes"}
  log_event{sessionId"sess12345" timestamp"2023-06-01T08:01:10Z" eventType"page_view" path"/search/results"}
  log_event{sessionId"sess12345" timestamp"2023-06-01T08:01:45Z" eventType"product_view" productId"prod123"}
  log_event{sessionId"sess12345" timestamp"2023-06-01T08:02:20Z" eventType"add_to_cart" productId"prod123" quantity#1}
  log_event{sessionId"sess12345" timestamp"2023-06-01T08:03:05Z" eventType"page_view" path"/cart"}
  log_event{sessionId"sess12345" timestamp"2023-06-01T08:04:30Z" eventType"checkout_start"}
  log_event{sessionId"sess12345" timestamp"2023-06-01T08:06:15Z" eventType"checkout_complete" orderTotal=59.99 paymentMethod"credit_card"}
  log_session{sessionId"sess12345" endTime"2023-06-01T08:07:00Z" duration#420}`;

      // Parse each line individually
      const lines = input.trim().split("\n");
      lines.forEach((line) => {
        const result = TSON.parse(line);
        expect(result).toBeDefined();
        // Just check that it parses without error, we don't need to verify exact structure
      });
    });

    test("should parse complex.tsonl", () => {
      const input = `product_catalog{catalogId"cat001" name"Summer Products 2023" publishedAt"2023-05-01T00:00:00Z" categories["outdoor" "sports" "summer" "beachwear"]}
  product{id"prod001" catalogId"cat001" sku"BW-001" inStock?true attributes{color"blue" size"M" material"cotton" washable?true}}
  product_name{productId"prod001" language"en" name"Men's Beach Shorts"}
  product_name{productId"prod001" language"es" name"Pantalones cortos de playa para hombres"}
  product_description{productId"prod001" language"en" description"Comfortable beach shorts perfect for summer activities. Quick-drying fabric with UV protection."}
  product_price{productId"prod001" currencyCode"USD" amount=29.99 isDiscounted?true originalAmount=39.99}
  product_image{productId"prod001" url"https://example.com/images/bw001_front.jpg" type"front" width#800 height#1200}
  product_image{productId"prod001" url"https://example.com/images/bw001_back.jpg" type"back" width#800 height#1200}
  product_review{productId"prod001" userId"u2001" rating=4.5 reviewDate"2023-06-15T09:20:00Z" verified?true}
  review_text{productId"prod001" reviewId"r3001" language"en" title"Great quality shorts" content"Really comfortable and perfect fit. Material feels premium and they dry quickly after swimming."}
  product_recommendation{productId"prod001" recommendedProducts["prod002" "prod005" "prod008"] recommendationType"frequently_bought_together"}
  product_availability{productId"prod001" storeId"store001" quantity#45 locationName"Main Warehouse" lastUpdated"2023-06-20T14:30:00Z"}
  product_availability{productId"prod001" storeId"store002" quantity#12 locationName"Downtown Store" lastUpdated"2023-06-20T15:45:00Z"}`;

      // Parse each line individually
      const lines = input.trim().split("\n");
      lines.forEach((line) => {
        const result = TSON.parse(line);
        expect(result).toBeDefined();
        // Just check that it parses without error, we don't need to verify exact structure
      });
    });

    // Test for round-trip conversions
    test("should convert benchmark examples to JSON and back to TSON", () => {
      const examples = [
        `metadata{term"Artificial Intelligence" language"en" part_of_speech"noun"}`,
        `user{id"u1001" username"johndoe" fullName"John Doe" registeredAt"2023-05-15T10:30:00Z"}`,
        `schema{name"conversation" version#1.0 description"Schema for conversation data"}`,
        `log_session{sessionId"sess12345" startTime"2023-06-01T08:00:00Z" userId"user789" deviceType"mobile"}`,
        `product_catalog{catalogId"cat001" name"Summer Products 2023" publishedAt"2023-05-01T00:00:00Z" categories["outdoor" "sports" "summer" "beachwear"]}`,
      ];

      examples.forEach((tsonExample) => {
        // Parse TSON to JS object
        const jsObject = TSON.parse(tsonExample);

        // Convert JSON back to TSON
        const backToTson = TSON.stringify(jsObject);

        // Parse the reconverted TSON
        const reconvertedObj = TSON.parse(backToTson);

        // Compare the original parsed object with the reconverted object
        expect(reconvertedObj).toEqual(jsObject);
      });
    });
  });
});
