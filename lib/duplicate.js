require("dotenv").config();
const { db } = require("./firebase");

/**
 * Duplicate a Firestore document
 * @param {string} collectionPath - Path to the collection
 * @param {string} sourceDocId - ID of the document to duplicate
 * @param {string} newDocId - ID for the new duplicated document (optional)
 */
async function duplicateDocument(collectionPath, sourceDocId, newDocId = null) {
  try {
    // Get the source document
    const sourceDocRef = db.collection(collectionPath).doc(sourceDocId);
    const sourceDoc = await sourceDocRef.get();

    if (!sourceDoc.exists) {
      console.error(
        `Document ${sourceDocId} does not exist in ${collectionPath}`
      );
      return;
    }

    // Get the document data
    const data = sourceDoc.data();

    // Create new document with the same data
    const targetDocRef = newDocId
      ? db.collection(collectionPath).doc(newDocId)
      : db.collection(collectionPath).doc(); // Auto-generate ID if not provided

    await targetDocRef.set(data);

    console.log(`✓ Successfully duplicated document!`);
    console.log(`  Source: ${collectionPath}/${sourceDocId}`);
    console.log(`  Copy: ${collectionPath}/${targetDocRef.id}`);

    return targetDocRef.id;
  } catch (error) {
    console.error("Error duplicating document:", error);
    throw error;
  }
}

async function run() {
  // Load configuration from environment variables
  const COLLECTION_PATH = process.env.COLLECTION_PATH;
  const SOURCE_DOC_ID = process.env.SOURCE_DOC_ID;
  const PREFIX = (process.env.PREFIX || "").trim();
  const POSTFIX = (process.env.POSTFIX || "").trim();
  const NUM_OF_DUPLICATES = parseInt(process.env.NUM_OF_DUPLICATES || "1", 10);

  // Validate required environment variables
  if (!COLLECTION_PATH || !SOURCE_DOC_ID) {
    console.error(
      "Error: COLLECTION_PATH and SOURCE_DOC_ID must be set in .env file"
    );
    console.error("Please copy .env.example to .env and configure your values");
    process.exit(1);
  }

  // Validate NUM_OF_DUPLICATES
  if (NUM_OF_DUPLICATES < 1 || isNaN(NUM_OF_DUPLICATES)) {
    console.error("Error: NUM_OF_DUPLICATES must be a positive number");
    process.exit(1);
  }

  /**
   * Generate a new document ID based on prefix/postfix configuration
   * @param {number} index - Index of the duplicate (0-based)
   * @returns {string|null} Generated document ID or null for auto-generation
   */
  function generateNewDocId(index) {
    // If both prefix and postfix are empty, use null for auto-generation
    const hasPrefix = PREFIX && PREFIX.length > 0;
    const hasPostfix = POSTFIX && POSTFIX.length > 0;

    if (!hasPrefix && !hasPostfix) {
      return null;
    }

    // Otherwise, combine: {prefix}_{sourceDocId}_{postfix}_{timestamp}_{index}
    const parts = [];
    if (hasPrefix) parts.push(PREFIX);
    parts.push(SOURCE_DOC_ID);
    if (hasPostfix) parts.push(POSTFIX);
    // Use timestamp + index to ensure uniqueness even when creating multiple duplicates quickly
    const timestamp = Date.now();
    const uniqueId =
      NUM_OF_DUPLICATES > 1
        ? `${timestamp}_${index + 1}`
        : timestamp.toString();
    parts.push(uniqueId);
    return parts.join("_");
  }

  // Run the duplication(s)
  try {
    console.log(
      `Starting duplication of ${NUM_OF_DUPLICATES} document(s)...\n`
    );

    for (let i = 0; i < NUM_OF_DUPLICATES; i++) {
      const newDocId = generateNewDocId(i);
      await duplicateDocument(COLLECTION_PATH, SOURCE_DOC_ID, newDocId);
      if (i < NUM_OF_DUPLICATES - 1) {
        console.log(""); // Add spacing between duplicates
      }
    }

    console.log(
      `\n✓ Successfully completed ${NUM_OF_DUPLICATES} duplication(s)!`
    );
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

module.exports = { duplicateDocument, run };
