
import fs from "node:fs";

import {
    normalizeOcrLines,
    groupLinesIntoColumns,
    parsePrice,
    extractPricesFromColumn,
    matchPricesWithItems,
    detectCategoryHeadings,
    attachDescriptionsToItems,
    buildStructuredMenu,
    buildMenuFromColumns,
    normalizeMenuText,
    normalizeDescriptionWithWordninja,
    detectCurrencyConsistency
} from "./src/modules/menu-import/menu-parser.js";

// Read OCR output
const ocrData = JSON.parse(
    fs.readFileSync("./ocr-output.json", "utf-8")
);

// Step 1: Normalize OCR lines
const normalizedLines = normalizeOcrLines(ocrData);

console.log("Total OCR lines:", normalizedLines.length);

// Step 2: Group lines into columns
const columns = groupLinesIntoColumns(normalizedLines);

console.log("Detected columns:", columns.length);

for (const [index, column] of columns.entries()) {
    console.log(`\n--- Column ${index + 1} ---`);

    for (const line of column.lines) {
        console.log(
            `${line.text} | X: ${Math.round(line.left)} | Y: ${Math.round(line.centerY)}`
        );
    }
}

// Step 3: Test price detection
console.log("\n========== PRICE DETECTION TEST ==========");

const testPrices = [
    "$8.99",
    "₹120",
    "1,250.00",
    "120/-",
    "BIRYANI",
    "Chicken Biryani"
];

for (const value of testPrices) {
    console.log(value, "=>", parsePrice(value));
}

// Step 4: Extract prices from each column
console.log("\n========== COLUMN PRICE EXTRACTION ==========");

const extractedColumns = columns.map(
    extractPricesFromColumn
);

for (const [index, column] of extractedColumns.entries()) {
    console.log(`\n--- Column ${index + 1} ---`);

    console.log("Detected prices:");

    for (const item of column.prices) {
        console.log({
            text: item.text,
            amount: item.price.amount,
            currencySymbol: item.price.currencySymbol,
            y: Math.round(item.centerY)
        });
    }

    console.log(
        "Remaining text lines:",
        column.nonPriceLines.length
    );
}

// Step 5: Match prices with menu item names
console.log("\n========== PRICE AND ITEM MATCHING ==========");

for (const [index, column] of extractedColumns.entries()) {
    const matchedItems = matchPricesWithItems(column);

    console.log(`\n--- Column ${index + 1} ---`);

    for (const item of matchedItems) {
        console.log({
            name: item.name,
            price: item.price.amount,
            currency: item.price.currencySymbol,
            confidence: item.confidence,
            warning: item.warning || null
        });
    }
}

console.log("\n========== CATEGORY DETECTION ==========");

for (const [index, column] of extractedColumns.entries()) {
    const categories = detectCategoryHeadings(column);

    console.log(`\n--- Column ${index + 1} ---`);

    console.log(
        categories.map(category => category.name)
    );
}

// Step 6: Attach descriptions to menu items
console.log("\n========== DESCRIPTION EXTRACTION ==========");

for (const [index, column] of extractedColumns.entries()) {
    const matchedItems = matchPricesWithItems(column);

    const itemsWithDescriptions = attachDescriptionsToItems(
        column,
        matchedItems
    );

    console.log(`\n--- Column ${index + 1} ---`);

    for (const item of itemsWithDescriptions) {
        console.log({
            name: item.name,
            price: item.price.amount,
            description: item.description
        });
    }
}
console.log("\n========== STRUCTURED MENU JSON ==========");

const structuredMenu = extractedColumns.map(column => ({
    page: column.page,
    categories: buildStructuredMenu(column)
}));

console.log(
    JSON.stringify(structuredMenu, null, 2)
);

console.log("\n========== COMPLETE MENU ==========");

const completeMenu = buildMenuFromColumns(extractedColumns);

console.log(JSON.stringify(completeMenu, null, 2));

console.log("\n========== TEXT NORMALIZATION ==========");

const samples = [
    "Grilled chickencombined with house special spicy",
    "Chicken Biryani",
    "  Fresh   Lime   Juice  ",
    "BASSMATIRICE"
];

for (const sample of samples) {
    console.log({
        original: sample,
        normalized: normalizeMenuText(sample)
    });
}

console.log("\n========== TEXT NORMALIZATION ==========");

const description = "Grilled chickencombined with house special spicy";

console.log({
  original: description,
  normalized: normalizeDescriptionWithWordninja(description),
});

const samples1 = [
  "Chicken Biryani",
  "  Fresh   Lime   Juice  ",
  "BASSMATIRICE",
];

for (const value of samples1) {
  console.log({
    original: value,
    normalized: normalizeMenuText(value),
  });
}

console.log(
  detectCurrencyConsistency([
    parsePrice("$8.99"),
    parsePrice("$12.50"),
    parsePrice("$15"),
  ]),
);

console.log(
  detectCurrencyConsistency([
    parsePrice("$8.99"),
    parsePrice("₹250"),
  ]),
);

console.log(
  detectCurrencyConsistency([
    parsePrice("$8.99"),
    parsePrice("250"),
  ]),
);

console.log("\n========== CURRENCY VALIDATION TESTS ==========");

const currencyTests = [
  [
    { currencySymbol: "$", amount: 8.99 },
    { currencySymbol: "$", amount: 12.5 },
  ],
  [
    { currencySymbol: "$", amount: 8.99 },
    { currencySymbol: "₹", amount: 250 },
  ],
  [
    { currencySymbol: "$", amount: 8.99 },
    { currencySymbol: null, amount: 250 },
  ],
];

currencyTests.forEach((prices, index) => {
  console.log(`Test ${index + 1}:`);
  console.log(detectCurrencyConsistency(prices));
});

console.log("\n========== PRICE MATCHING EDGE CASES ==========");

const createLine = (text, centerY) => ({
  text,
  centerY,
});

const testColumn = {
  prices: [
    {
      text: "$10.00",
      centerY: 100,
      price: parsePrice("$10.00"),
    },
    {
      text: "$15.00",
      centerY: 200,
      price: parsePrice("$15.00"),
    },
    {
      text: "$20.00",
      centerY: 300,
      price: parsePrice("$20.00"),
    },
  ],

  nonPriceLines: [
    createLine("CHICKEN BIRYANI", 98),
    createLine("Grilled chicken with special spices", 150),
    createLine("MUTTON BIRYANI", 202),
    createLine("RICE", 280),
  ],
};

console.log(
  JSON.stringify(matchPricesWithItems(testColumn), null, 2),
);