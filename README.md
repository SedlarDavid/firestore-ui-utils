Firestore UI does not have simple actions like clone document. This script duplicates Firestore documents.

## Setup

1. Clone repository
2. Download service account JSON from Firebase Console (Project Settings -> Service Accounts -> Generate new private key, select Node.js)
3. Save it as `serviceAccountKey.json` in the root directory
4. Run `npm install`
5. Copy `.env.example` to `.env` and configure

## Configuration

Required:

- `COLLECTION_PATH` - Firestore collection path
- `SOURCE_DOC_ID` - Document ID to duplicate

Optional:

- `PREFIX` - Prefix for new document ID (e.g., "doc")
- `POSTFIX` - Postfix for new document ID (e.g., "copy")
- `NUM_OF_DUPLICATES` - Number of duplicates to create (default: 1)

If both PREFIX and POSTFIX are empty, document IDs will be auto-generated. If either is set, IDs will be formatted as: `{prefix}_{sourceDocId}_{postfix}_{timestamp}_{index}`

## Usage

Run `npm run duplicate`
