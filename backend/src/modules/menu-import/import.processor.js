import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";

import prisma from "../../config/prisma.js";

import {
  resolveMenuFilePath,
  menuFileExists,
} from "../../utils/privateStorage.js";

import {
  normalizeOcrLines,
  groupLinesIntoColumns,
  extractPricesFromColumn,
  buildMenuFromColumns,
} from "../menu-import/menu-parser.js";

const execFileAsync = promisify(execFile);

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

const ocrScriptPath = path.join(backendRoot, "ocr-service", "ocr_service.py");

console.log("Backend root:", backendRoot);
console.log("Python path:", pythonPath);

const runPythonOcr = async (filePath) => {
  const { stdout } = await execFileAsync(
    pythonPath,
    [ocrScriptPath, filePath],
    {
      encoding: "utf8",
      timeout: 180000,
      maxBuffer: 20 * 1024 * 1024,
    },
  );

  const result = JSON.parse(stdout);

  if (!Array.isArray(result) || result.length === 0) {
    throw new Error("OCR_NO_RESULTS");
  }

  return result;
};

export const processMenuImport = async ({ importId, restaurantId }) => {
  // Claim the import so it cannot be processed twice.
  const claim = await prisma.menuImport.updateMany({
    where: {
      id: importId,
      restaurantId,
      status: "UPLOADED",
    },
    data: {
      status: "PROCESSING",
      errorMessage: null,
    },
  });

  if (claim.count === 0) {
    return {
      skipped: true,
    };
  }

  try {
    const menuImport = await prisma.menuImport.findFirst({
      where: {
        id: importId,
        restaurantId,
      },
      select: {
        storageKey: true,
      },
    });

    if (!menuImport) {
      throw new Error("MENU_IMPORT_NOT_FOUND");
    }

    const filePath = resolveMenuFilePath({
      storageKey: menuImport.storageKey,
      restaurantId,
    });

    const exists = await menuFileExists(filePath);

    if (!exists) {
      throw new Error("MENU_FILE_NOT_FOUND");
    }

    // Step 1: Run Python OCR.
    const ocrPages = await runPythonOcr(filePath);

    // Step 2: Normalize OCR output.
    const normalizedLines = normalizeOcrLines(ocrPages);

    if (normalizedLines.length === 0) {
      throw new Error("OCR_NO_TEXT_DETECTED");
    }

    // Step 3: Group OCR lines into columns.
    const columns = groupLinesIntoColumns(normalizedLines);

    // Step 3.1: Separate prices from other OCR lines.
    const processedColumns = columns.map(extractPricesFromColumn);

    // Step 4: Build structured menu data.
    const extractedData = buildMenuFromColumns(processedColumns);

    // Step 5: Save results for owner review.
    await prisma.menuImport.update({
      where: {
        id: importId,
      },
      data: {
        status: "REVIEW_REQUIRED",
        extractedData,
        errorMessage: null,
      },
    });

    return {
      success: true,
      status: "REVIEW_REQUIRED",
    };
  } catch (error) {
    console.error("Menu import processing failed:", error);

    await prisma.menuImport
      .update({
        where: {
          id: importId,
        },
        data: {
          status: "FAILED",
          errorMessage: "MENU_PROCESSING_FAILED",
        },
      })
      .catch((updateError) => {
        console.error("Failed to update menu import status:", updateError);
      });

    throw error;
  }
};
