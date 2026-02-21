const fs = require("fs/promises");
const path = require("path");

const DATA_PATH = path.join(__dirname, "..", "..", "data", "campaigns.json");

// Ensure file exists
async function ensureFile() {
  try {
    await fs.access(DATA_PATH);
  } catch {
    await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
    await fs.writeFile(
      DATA_PATH,
      JSON.stringify({ campaigns: [] }, null, 2),
      "utf8"
    );
  }
}

async function readStore() {
  await ensureFile();
  const raw = await fs.readFile(DATA_PATH, "utf8");
  return JSON.parse(raw || '{"campaigns": []}');
}

async function writeStore(data) {
  await ensureFile();
  await fs.writeFile(DATA_PATH, JSON.stringify(data, null, 2), "utf8");
}

module.exports = { readStore, writeStore, DATA_PATH };
