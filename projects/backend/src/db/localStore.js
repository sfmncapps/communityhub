import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_DIR = __dirname;

/**
 * Read records from a JSON persistent storage file
 * @param {string} filename Name of the file, e.g. "event_registrations.json"
 * @returns {Array} Array of records
 */
export const readStore = (filename) => {
  try {
    const filePath = path.join(DB_DIR, filename);
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw || "[]");
  } catch (err) {
    console.warn(`[localStore] Error reading ${filename}:`, err.message);
    return [];
  }
};

/**
 * Write records to a JSON persistent storage file atomically
 * @param {string} filename
 * @param {Array} data
 */
export const writeStore = (filename, data) => {
  try {
    const filePath = path.join(DB_DIR, filename);
    const tempPath = `${filePath}.tmp.${Date.now()}`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), "utf-8");
    fs.renameSync(tempPath, filePath);
  } catch (err) {
    console.error(`[localStore] Error writing ${filename}:`, err.message);
  }
};

/**
 * Insert record into local store
 * @param {string} filename
 * @param {object} record
 * @returns {object} inserted record with generated id and timestamps
 */
export const insertRecord = (filename, record) => {
  const records = readStore(filename);
  const now = new Date().toISOString();
  const newRecord = {
    id: record.id || crypto.randomUUID(),
    created_at: record.created_at || now,
    updated_at: now,
    ...record,
  };
  records.unshift(newRecord);
  writeStore(filename, records);
  return newRecord;
};

/**
 * Update record by ID or predicate function
 * @param {string} filename
 * @param {string|function} idOrPredicate
 * @param {object} updates
 * @returns {object|null} updated record or null if not found
 */
export const updateRecord = (filename, idOrPredicate, updates) => {
  const records = readStore(filename);
  let updatedCount = 0;
  let lastUpdated = null;

  for (let i = 0; i < records.length; i++) {
    const isMatch = typeof idOrPredicate === "function"
      ? idOrPredicate(records[i])
      : String(records[i].id) === String(idOrPredicate);

    if (isMatch) {
      records[i] = {
        ...records[i],
        ...updates,
        updated_at: new Date().toISOString(),
      };
      updatedCount++;
      lastUpdated = records[i];
      if (typeof idOrPredicate !== "function") break; // single id match
    }
  }

  if (updatedCount === 0) return null;
  writeStore(filename, records);
  return lastUpdated;
};

/**
 * Delete record by ID or predicate function
 * @param {string} filename
 * @param {string|function} idOrPredicate
 * @returns {boolean} true if deleted
 */
export const deleteRecord = (filename, idOrPredicate) => {
  const records = readStore(filename);
  const filtered = typeof idOrPredicate === "function"
    ? records.filter((r) => !idOrPredicate(r))
    : records.filter((r) => String(r.id) !== String(idOrPredicate));
  if (filtered.length !== records.length) {
    writeStore(filename, filtered);
    return true;
  }
  return false;
};
