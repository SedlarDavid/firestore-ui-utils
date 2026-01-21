require("dotenv").config();
const { db } = require("./firebase");
const fs = require("fs");
const path = require("path");

/**
 * Convert Firestore Timestamp format from JSON to Firestore Timestamp
 */
function convertTimestamp(timestampObj) {
  if (timestampObj && timestampObj._seconds !== undefined) {
    const { Timestamp } = require("firebase-admin/firestore");
    return Timestamp.fromMillis(
      timestampObj._seconds * 1000 + (timestampObj._nanoseconds || 0) / 1000000
    );
  }
  return timestampObj;
}

/**
 * Recursively convert all timestamp objects in data
 */
function convertTimestamps(data) {
  if (Array.isArray(data)) {
    return data.map(convertTimestamps);
  } else if (data && typeof data === "object") {
    const converted = {};
    for (const [key, value] of Object.entries(data)) {
      if (key === "pubDate" || key === "updatedDate" || key === "lastModified") {
        converted[key] = convertTimestamp(value);
      } else if (typeof value === "object" && value !== null) {
        converted[key] = convertTimestamps(value);
      } else {
        converted[key] = value;
      }
    }
    return converted;
  }
  return data;
}

/**
 * Insert documents from JSON file into Firestore
 * @param {string} collectionPath - Path to the collection
 * @param {string} jsonFilePath - Path to JSON file
 * @param {boolean} useSlugAsId - Use slug field as document ID (default: true)
 */
async function insertDocuments(collectionPath, jsonFilePath, useSlugAsId = true) {
  try {
    // Read and parse JSON file
    const jsonContent = fs.readFileSync(jsonFilePath, "utf-8");
    const documents = JSON.parse(jsonContent);

    if (!Array.isArray(documents)) {
      throw new Error("JSON file must contain an array of documents");
    }

    console.log(`Found ${documents.length} document(s) to insert\n`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < documents.length; i++) {
      const docData = documents[i];
      
      try {
        // Convert timestamps
        const convertedData = convertTimestamps(docData);

        // Determine document ID
        let docId;
        if (useSlugAsId && convertedData.slug) {
          docId = convertedData.slug;
        } else {
          // Auto-generate ID
          docId = null;
        }

        // Insert document
        const docRef = docId
          ? db.collection(collectionPath).doc(docId)
          : db.collection(collectionPath).doc();

        await docRef.set(convertedData);

        const insertedId = docRef.id;
        console.log(`✓ [${i + 1}/${documents.length}] Successfully inserted document`);
        console.log(`  ID: ${insertedId}`);
        if (convertedData.title) {
          console.log(`  Title: ${convertedData.title}`);
        }
        console.log("");

        successCount++;
      } catch (error) {
        console.error(`✗ [${i + 1}/${documents.length}] Error inserting document:`, error.message);
        if (docData.slug) {
          console.error(`  Slug: ${docData.slug}`);
        }
        console.error("");
        errorCount++;
      }
    }

    console.log("=".repeat(50));
    console.log(`Summary:`);
    console.log(`  Successfully inserted: ${successCount}`);
    console.log(`  Errors: ${errorCount}`);
    console.log(`  Total: ${documents.length}`);

    return { successCount, errorCount, total: documents.length };
  } catch (error) {
    console.error("Error reading or parsing JSON file:", error);
    throw error;
  }
}

async function run() {
  // Load configuration from environment variables
  const COLLECTION_PATH = process.env.COLLECTION_PATH;
  const JSON_FILE_PATH = process.env.JSON_FILE_PATH;
  const USE_SLUG_AS_ID = process.env.USE_SLUG_AS_ID !== "false"; // Default to true

  // Validate required environment variables
  if (!COLLECTION_PATH || !JSON_FILE_PATH) {
    console.error(
      "Error: COLLECTION_PATH and JSON_FILE_PATH must be set in .env file"
    );
    console.error("Please copy .env.example to .env and configure your values");
    process.exit(1);
  }

  // Resolve JSON file path (can be relative or absolute)
  const jsonFilePath = path.isAbsolute(JSON_FILE_PATH)
    ? JSON_FILE_PATH
    : path.resolve(process.cwd(), JSON_FILE_PATH);

  // Check if file exists
  if (!fs.existsSync(jsonFilePath)) {
    console.error(`Error: JSON file not found: ${jsonFilePath}`);
    process.exit(1);
  }

  // Run the insertion
  try {
    console.log(`Starting insertion of documents from JSON file...\n`);
    console.log(`Collection: ${COLLECTION_PATH}`);
    console.log(`JSON File: ${jsonFilePath}`);
    console.log(`Use slug as ID: ${USE_SLUG_AS_ID}\n`);
    console.log("=".repeat(50));
    console.log("");

    await insertDocuments(COLLECTION_PATH, jsonFilePath, USE_SLUG_AS_ID);

    console.log("\n✓ Successfully completed insertion!");
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

module.exports = { insertDocuments, run };
