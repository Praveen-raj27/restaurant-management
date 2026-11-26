import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backendRoot = path.resolve(__dirname, "../../..");

const pythonPath = path.join(
  backendRoot,
  "ocr-service",
  ".venv",
  "bin",
  "python",
);

const normalizerPath = path.join(
  backendRoot,
  "ocr-service",
  "normalize_text.py",
);

const getBoundingBox = (polygon) => {
  const xCoordinates = polygon.map((point) => point[0]);
  const yCoordinates = polygon.map((point) => point[1]);

  const left = Math.min(...xCoordinates);
  const right = Math.max(...xCoordinates);
  const top = Math.min(...yCoordinates);
  const bottom = Math.max(...yCoordinates);

  return {
    left,
    right,
    top,
    bottom,
    centerX: (left + right) / 2,
    centerY: (top + bottom) / 2,
  };
};

// Normalize OCR output into a consistent line structure.
export const normalizeOcrLines = (pages) => {
  return pages.flatMap((page) =>
    page.lines.map((line) => ({
      text: line.text.trim(),
      confidence: line.confidence,
      ...getBoundingBox(line.polygon),
      page: page.page,
    })),
  );
};

// Group OCR lines into horizontal columns using K-means.
export const groupLinesIntoColumns = (lines) => {
  const pageGroups = new Map();

  for (const line of lines) {
    if (!pageGroups.has(line.page)) {
      pageGroups.set(line.page, []);
    }

    pageGroups.get(line.page).push(line);
  }

  const allColumns = [];

  for (const [page, pageLines] of pageGroups) {
    if (pageLines.length < 2) {
      allColumns.push({
        page,
        centerX: pageLines[0]?.centerX ?? 0,
        lines: pageLines,
      });
      continue;
    }

    const sortedX = pageLines.map((line) => line.centerX).sort((a, b) => a - b);

    let centers = [sortedX[0], sortedX[sortedX.length - 1]];

    for (let iteration = 0; iteration < 30; iteration++) {
      const clusters = [[], []];

      for (const line of pageLines) {
        const distance1 = Math.abs(line.centerX - centers[0]);

        const distance2 = Math.abs(line.centerX - centers[1]);

        const clusterIndex = distance1 <= distance2 ? 0 : 1;

        clusters[clusterIndex].push(line);
      }

      centers = clusters.map((cluster, index) => {
        if (!cluster.length) {
          return centers[index];
        }

        return (
          cluster.reduce((sum, line) => sum + line.centerX, 0) / cluster.length
        );
      });
    }

    const clusters = [[], []];

    for (const line of pageLines) {
      const distance1 = Math.abs(line.centerX - centers[0]);

      const distance2 = Math.abs(line.centerX - centers[1]);

      clusters[distance1 <= distance2 ? 0 : 1].push(line);
    }

    clusters.forEach((columnLines, index) => {
      if (!columnLines.length) return;

      allColumns.push({
        page,
        centerX: centers[index],
        lines: columnLines.sort((a, b) => a.centerY - b.centerY),
      });
    });
  }

  return allColumns.sort((a, b) => {
    if (a.page !== b.page) {
      return a.page - b.page;
    }

    return a.centerX - b.centerX;
  });
};

const menuNameNormalizerPath = path.join(
  backendRoot,
  "ocr-service",
  "normalize_menu_name.py",
);
// Normalize text without guessing missing word boundaries.
export const normalizeMenuText = (value) => {
  if (!value || typeof value !== "string") {
    return "";
  }

  return value
    .replace(/\s+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim();
};

function normalizeMenuNameWithVocabulary(value) {
  if (!value) {
    return {
      originalName: value,
      suggestedName: value,
      needsReview: true,
    };
  }

  try {
    const result = execFileSync(pythonPath, [menuNameNormalizerPath], {
      input: JSON.stringify(value),
      encoding: "utf8",
      maxBuffer: 1024 * 1024,
      timeout: 10000,
    });

    return JSON.parse(result);
  } catch (error) {
    console.error("Menu name normalization failed:", error.message);

    return {
      originalName: value,
      suggestedName: normalizeMenuText(value),
      needsReview: true,
    };
  }
}

export function normalizeDescriptionWithWordninja(value) {
  if (!value) return "";

  try {
    const result = execFileSync(pythonPath, [normalizerPath], {
      input: JSON.stringify(value),
      encoding: "utf8",
      maxBuffer: 1024 * 1024,
      timeout: 10000,
    });

    return JSON.parse(result);
  } catch (error) {
    console.error("Description normalization failed:", error.message);

    return normalizeMenuText(value);
  }
}

// Parse prices and preserve the original OCR value.

export const parsePrice = (text) => {
  if (typeof text !== "string" || !text.trim()) {
    return null;
  }

  const normalized = text.trim().replace(/\s+/g, "");

  const match = normalized.match(
    /^(₹|\$|€|£)?(\d{1,5}(?:,\d{3})*(?:\.\d{1,2})?)(\/-)?$/,
  );

  if (!match) {
    return null;
  }

  const amount = Number(match[2].replace(/,/g, ""));

  // Menu prices must be greater than zero.
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return {
    currencySymbol: match[1] || null,
    amount,
    suffix: match[3] || null,
    originalText: text,
  };
};


export const detectCurrencyConsistency = (prices) => {
  const detectedCurrencies = [
    ...new Set(
      prices
        .map((price) => price.currencySymbol)
        .filter(Boolean),
    ),
  ];

  const hasMissingCurrency = prices.some(
    (price) => !price.currencySymbol,
  );

  return {
    detectedCurrencies,
    isConsistent: detectedCurrencies.length <= 1,
    hasMissingCurrency,
    reviewRequired:
      detectedCurrencies.length > 1 || hasMissingCurrency,
  };
};


// Separate price lines from other OCR lines.
export const extractPricesFromColumn = (column) => {
  const lines = [...column.lines].sort((a, b) => a.centerY - b.centerY);

  const prices = [];
  const nonPriceLines = [];

  for (const line of lines) {
    const price = parsePrice(line.text);

    if (price) {
      prices.push({
        ...line,
        price,
      });
    } else {
      nonPriceLines.push(line);
    }
  }

  return {
    page: column.page,
    centerX: column.centerX,
    prices,
    nonPriceLines,
  };
};

const isLikelyMenuItem = (line) => {
  if (!line?.text) return false;

  const text = line.text.trim();

  if (!text) return false;

  // Exclude long description-like sentences.
  if (text.length > 40) return false;

  // Exclude sentence-like text.
  if (/[.!?]$/.test(text)) return false;

  // Exclude common document headings.
  const excludedHeadings = [
    "MENU",
    "FOOD MENU",
    "INDIAN",
    "VEG",
    "NON VEG",
  ];

  if (excludedHeadings.includes(text.toUpperCase())) {
    return false;
  }

  // Menu item names are generally uppercase in this OCR output.
  if (text !== text.toUpperCase()) return false;

  return true;
};

// Match each detected price with its nearest menu item.

export const matchPricesWithItems = (column, maxDistance = 10) => {
  const matchedItems = [];
  const usedLines = new Set();

  for (const priceLine of column.prices) {
    const candidates = column.nonPriceLines
      .filter((line) => !usedLines.has(line))
      .filter(isLikelyMenuItem)
      .map((line) => ({
        line,
        distance: Math.abs(line.centerY - priceLine.centerY),
      }))
      .filter((candidate) => candidate.distance <= maxDistance)
      .sort((a, b) => a.distance - b.distance);

    const closest = candidates[0];
    const secondClosest = candidates[1];

    // Avoid guessing when two candidates are equally close.
    const isAmbiguous =
      closest &&
      secondClosest &&
      closest.distance === secondClosest.distance;

    if (!closest || isAmbiguous) {
      matchedItems.push({
        name: null,
        itemLine: null,
        itemY: null,
        price: priceLine.price,
        confidence: "LOW",
        warning: isAmbiguous
          ? "AMBIGUOUS_MENU_ITEM_MATCH"
          : "NO_MATCHING_MENU_ITEM",
      });

      continue;
    }

    const closestLine = closest.line;
    const closestDistance = closest.distance;

    usedLines.add(closestLine);

    matchedItems.push({
      name: closestLine.text.trim(),
      itemLine: closestLine,
      itemY: closestLine.centerY,
      price: priceLine.price,
      priceText: priceLine.text,
      confidence: "HIGH",
      verticalDistance: closestDistance,
    });
  }

  return matchedItems.sort(
    (a, b) => (a.itemY ?? Infinity) - (b.itemY ?? Infinity),
  );
};


// Detect likely category headings.
export const detectCategoryHeadings = (column) => {
  const matchedItemYPositions = new Set(
    column.prices.map((price) => Math.round(price.centerY)),
  );

  const categories = [];

  for (const line of column.nonPriceLines) {
    const text = line.text.trim();
    const normalized = text.toUpperCase().replace(/\s+/g, " ");

    const isMatchedItem = [...matchedItemYPositions].some(
      (y) => Math.abs(y - Math.round(line.centerY)) <= 10,
    );

    if (isMatchedItem) continue;

    const isDescription =
      /[.,!?]/.test(text) ||
      /^(SPECIAL|GRILLED|FRESH|SERVED|MADE|WITH)\b/i.test(normalized);

    const isPlaceholder = /^FOOD\s*NAME$/i.test(normalized);

    const isDocumentTitle = ["INDIAN", "FOOD MENU"].includes(normalized);

    const isUppercase = text === text.toUpperCase() && /[A-Z]/.test(text);

    if (
      isUppercase &&
      text.length <= 30 &&
      !isDescription &&
      !isPlaceholder &&
      !isDocumentTitle
    ) {
      categories.push({
        name: text,
        page: line.page,
        centerY: line.centerY,
        confidence: "REVIEW_REQUIRED",
      });
    }
  }

  return categories;
};


const isLikelyDescription = (text) => {
  const value = text.trim();

  if (!value) return false;

  // Exclude likely category headings and placeholders.
  if (/^FOOD\s*NAME$/i.test(value)) return false;

  // Descriptions commonly contain lowercase words,
  // multiple words, or sentence punctuation.
  const hasLowercase = /[a-z]/.test(value);
  const hasMultipleWords = /\s/.test(value);
  const hasPunctuation = /[.,!?]/.test(value);

  return hasLowercase || hasMultipleWords || hasPunctuation;
};

// Attach description lines to the corresponding menu items.

export const attachDescriptionsToItems = (column, matchedItems) => {
  const categories = detectCategoryHeadings(column);

  const sortedItems = [...matchedItems].sort(
    (a, b) => (a.itemY ?? Infinity) - (b.itemY ?? Infinity),
  );

  const itemLines = new Set(
    sortedItems.map((entry) => entry.itemLine).filter(Boolean),
  );



  return sortedItems.map((item, index) => {
    if (!item.itemLine || item.itemY === null) {
      return {
        ...item,
        description: "",
        descriptionLines: [],
      };
    }

    const nextItem = sortedItems[index + 1];
    const nextItemY = nextItem?.itemY ?? Infinity;

    const nextCategoryY =
      categories
        .filter((category) => category.centerY > item.itemY)
        .sort((a, b) => a.centerY - b.centerY)[0]?.centerY ??
      Infinity;

    const boundaryY = Math.min(nextItemY, nextCategoryY);

    const descriptionLines = column.nonPriceLines
      .filter((line) => {
        const isBelowItem = line.centerY > item.itemY + 2;
        const isBeforeNextBoundary = line.centerY < boundaryY;
        const isNotAnotherItem = !itemLines.has(line);

     

        const isNotCategory = !categories.some(
          (category) => category.centerY === line.centerY,
        );

        return (
          isBelowItem &&
          isBeforeNextBoundary &&
          isNotAnotherItem &&
          isNotCategory
        );
      })
      .sort((a, b) => a.centerY - b.centerY);

    const originalDescription = descriptionLines
      .map((line) => line.text.trim())
      .join(" ");

    return {
      ...item,
      descriptionLines: descriptionLines.map(
        (line) => line.text.trim(),
      ),
      description: originalDescription,
    };
  });
};


// Build structured categories and menu items for one column.

export const buildStructuredMenu = (column) => {
  const categories = detectCategoryHeadings(column);

  const matchedItems = matchPricesWithItems(column);

  const prices = matchedItems
    .map((item) => item.price)
    .filter(Boolean);

  const itemsWithDescriptions = attachDescriptionsToItems(
    column,
    matchedItems
  );

  // Create categories with unique IDs.
  const result = categories.map((category) => ({
    id: crypto.randomUUID(),
    name: category.name,
    items: [],
  }));

  for (const item of itemsWithDescriptions) {
    if (!item.name || item.itemY === null) continue;

    const category = [...categories]
      .filter((category) => category.centerY < item.itemY)
      .sort((a, b) => b.centerY - a.centerY)[0];

    const targetCategory = result.find(
      (entry) => entry.name === category?.name
    );

    if (!targetCategory) continue;

    const isPlaceholder = /^FOOD\s*NAME$/i.test(
      item.name.trim()
    );

    const normalizedName = normalizeMenuNameWithVocabulary(
      item.name
    );

    const nameNeedsReview =
      isPlaceholder || normalizedName.needsReview;

    targetCategory.items.push({
      // Unique ID for each menu item.
      id: crypto.randomUUID(),

      name: normalizedName.suggestedName,
      originalName: item.name,
      suggestedName: normalizedName.suggestedName,
      nameNeedsReview,

      price: item.price.amount,
      currency: item.price.currencySymbol,
      originalPrice: item.price.originalText,

      description: normalizeDescriptionWithWordninja(
        item.description
      ),
      originalDescription: item.description,

      matchingConfidence: item.confidence,
      ocrConfidence: item.itemLine?.confidence ?? null,

      reviewRequired: true,

      warnings: [
        ...(isPlaceholder
          ? ["PLACEHOLDER_ITEM_NAME"]
          : []),

        ...(item.itemLine?.confidence < 0.85
          ? ["LOW_OCR_CONFIDENCE"]
          : []),

        ...(item.confidence === "LOW"
          ? ["LOW_PRICE_MATCH_CONFIDENCE"]
          : []),

        ...(nameNeedsReview
          ? ["MENU_NAME_REQUIRES_REVIEW"]
          : []),

        "OCR_REQUIRES_OWNER_REVIEW",
      ],
    });
  }

  return {
    categories: result,
    prices,
  };
};



// Combine all detected columns into a page-based menu structure.


export const buildMenuFromColumns = (columns) => {
  const pages = new Map();

  for (const column of columns) {
    const pageNumber = Number(column.page);

    const structuredMenu = buildStructuredMenu(column);

    if (!pages.has(pageNumber)) {
      pages.set(pageNumber, {
        categories: [],
        prices: [],
      });
    }

    const pageData = pages.get(pageNumber);

    pageData.categories.push(
      ...structuredMenu.categories
    );

    pageData.prices.push(
      ...structuredMenu.prices
    );
  }

  return {
    pages: [...pages.entries()]
      .sort(([a], [b]) => a - b)
      .map(([page, pageData]) => ({
        page,

        currencyValidation: detectCurrencyConsistency(
          pageData.prices
        ),

        categories: pageData.categories,
      })),

    reviewRequired: true,
  };
};


