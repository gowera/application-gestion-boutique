const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

/** Persistent files live outside Chromium's cache and the installation directory. */
function createLocalDatabase(userData, encryption) {
  const directory = path.join(userData, "local-db");
  const metadataFile = path.join(directory, "database.json");
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });

  function atomicWrite(file, contents) {
    const temporary = `${file}.${crypto.randomUUID()}.tmp`;
    try {
      fs.writeFileSync(temporary, contents, { mode: 0o600 });
      if (fs.existsSync(file)) fs.copyFileSync(file, `${file}.bak`);
      fs.renameSync(temporary, file);
    } finally {
      fs.rmSync(temporary, { force: true });
    }
  }

  if (!fs.existsSync(metadataFile)) {
    atomicWrite(metadataFile, JSON.stringify({ version: 1, createdAt: new Date().toISOString(), format: "encrypted-json-records" }));
  }

  function filename(key) {
    if (typeof key !== "string" || !key.startsWith("user:")) throw new Error("Clé locale invalide.");
    return path.join(directory, `${crypto.createHash("sha256").update(key).digest("hex")}.json`);
  }

  function decode(raw) {
    const wrapper = JSON.parse(raw);
    const payload = wrapper.enc ? encryption.decryptString(Buffer.from(wrapper.data, "base64")) : wrapper.data;
    return JSON.parse(payload);
  }

  function readRecord(file) {
    try {
      return decode(fs.readFileSync(file, "utf8"));
    } catch (error) {
      if (fs.existsSync(`${file}.bak`)) return decode(fs.readFileSync(`${file}.bak`, "utf8"));
      throw error;
    }
  }

  return {
    directory,
    get(key) {
      const file = filename(key);
      if (!fs.existsSync(file) && !fs.existsSync(`${file}.bak`)) return null;
      const record = readRecord(file);
      if (record.key !== key) throw new Error("Le fichier local ne correspond pas au compte.");
      return record.value ?? null;
    },
    set(key, value) {
      const payload = JSON.stringify({ key, value, at: new Date().toISOString() });
      if (!encryption.isEncryptionAvailable()) throw new Error("Le stockage sécurisé Windows n’est pas disponible.");
      atomicWrite(filename(key), JSON.stringify({ enc: true, data: encryption.encryptString(payload).toString("base64") }));
      return { ok: true };
    },
    delete(key) {
      const file = filename(key);
      fs.rmSync(file, { force: true });
      fs.rmSync(`${file}.bak`, { force: true });
      return { ok: true };
    },
    keys() {
      return fs.readdirSync(directory).filter((name) => /^[a-f0-9]{64}\.json$/.test(name))
        .map((name) => readRecord(path.join(directory, name)).key);
    },
  };
}

module.exports = { createLocalDatabase };