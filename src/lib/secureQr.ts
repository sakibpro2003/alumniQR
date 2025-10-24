// @ts-nocheck
import CryptoJS from "crypto-js";

export const ENVELOPE_TAG = "qr-secure:v1";
export const SHARED_SECRET = "qr-secure#vault@2025";

const ENVELOPE_TAG_V2 = "qs1";
const ENVELOPE_PREFIX_V2 = "qs2.";
const ENVELOPE_PREFIX_V3 = "qs3.";
const ENVELOPE_VERSION_V3 = 3;
const PAYLOAD_SEPARATOR = "\u001f"; // Unit separator keeps join/split unambiguous.
const ISSUED_RADIX = 36;

const KEY = CryptoJS.SHA256(SHARED_SECRET);
const deriveIV = () => {
  const ivHash = CryptoJS.SHA256(`${SHARED_SECRET}:iv`);
  ivHash.sigBytes = 16;
  ivHash.clamp();
  return ivHash;
};
const BASE_IV = deriveIV();
const getIV = () => BASE_IV.clone();

const toSafeString = (value) => {
  if (typeof value === "string") {
    return value.trim();
  }

  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
};

const sanitizeSegment = (value) =>
  toSafeString(value).replaceAll(PAYLOAD_SEPARATOR, " ");

const normalizeDetails = (input) => {
  if (!input || typeof input !== "object") {
    const raw = sanitizeSegment(input);
    return {
      name: raw,
      batch: "",
      generatedBy: "",
      issuedAt: null,
    };
  }

  const issuedCandidate =
    typeof input.issuedAt === "number"
      ? input.issuedAt
      : typeof input.i === "number"
      ? input.i
      : null;

  return {
    name: sanitizeSegment(input.name ?? input.n ?? input.text ?? ""),
    batch: sanitizeSegment(input.batch ?? input.b ?? ""),
    generatedBy: sanitizeSegment(input.generatedBy ?? input.g ?? ""),
    issuedAt: issuedCandidate,
  };
};

const toBase64Url = (value) =>
  value.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const fromBase64Url = (value) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = (4 - (normalized.length % 4)) % 4;
  return normalized + "=".repeat(padding);
};

const decodeV3Envelope = (encoded) => {
  const paddedCipher = fromBase64Url(encoded);
  const cipherWords = CryptoJS.enc.Base64.parse(paddedCipher);
  const bytes = CryptoJS.AES.decrypt(
    { ciphertext: cipherWords },
    KEY,
    {
      iv: getIV(),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    }
  );
  const decrypted = bytes.toString(CryptoJS.enc.Utf8);

  if (!decrypted) {
    throw new Error("The QR code cannot be unlocked by this app.");
  }

  const segments = decrypted.split(PAYLOAD_SEPARATOR);

  if (segments.length < 4) {
    throw new Error("The QR payload is corrupted.");
  }

  const [name, batch, generatedBy, issuedRaw] = segments;
  const issuedAtNumber = parseInt(issuedRaw, ISSUED_RADIX);

  const data = {
    name: sanitizeSegment(name),
    batch: sanitizeSegment(batch),
    generatedBy: sanitizeSegment(generatedBy),
  };

  return {
    text: JSON.stringify(data),
    issuedAt: Number.isFinite(issuedAtNumber) ? issuedAtNumber : Date.now(),
    data,
    version: ENVELOPE_VERSION_V3,
  };
};

export function createEnvelope(payload) {
  const normalized =
    typeof payload === "string" ? payload.trim() : payload;

  if (
    normalized === undefined ||
    normalized === null ||
    (typeof normalized === "string" && normalized.length === 0)
  ) {
    throw new Error("Enter the text you want to protect.");
  }

  let parsedPayload = normalized;
  if (typeof normalized === "string") {
    try {
      parsedPayload = JSON.parse(normalized);
    } catch {
      parsedPayload = { text: normalized };
    }
  }

  const details = normalizeDetails(parsedPayload);
  const issuedAt = details.issuedAt ?? Date.now();

  const plainSegments = [
    sanitizeSegment(details.name),
    sanitizeSegment(details.batch),
    sanitizeSegment(details.generatedBy),
    issuedAt.toString(ISSUED_RADIX),
  ];

  const plaintext = plainSegments.join(PAYLOAD_SEPARATOR);
  const encrypted = CryptoJS.AES.encrypt(
    plaintext,
    KEY,
    {
      iv: getIV(),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    }
  );

  const base64Cipher = CryptoJS.enc.Base64.stringify(encrypted.ciphertext);
  const compactCipher = toBase64Url(base64Cipher);

  return `${ENVELOPE_PREFIX_V3}${compactCipher}`;
}

export function decryptEnvelope(serialized) {
  if (
    typeof serialized === "string" &&
    serialized.startsWith(ENVELOPE_PREFIX_V3)
  ) {
    const encodedCipher = serialized.slice(ENVELOPE_PREFIX_V3.length);
    if (!encodedCipher) {
      throw new Error("This QR code is not recognized by this app.");
    }
    return decodeV3Envelope(encodedCipher);
  }

  if (
    typeof serialized === "string" &&
    serialized.startsWith(ENVELOPE_PREFIX_V2)
  ) {
    const encodedCipher = serialized.slice(ENVELOPE_PREFIX_V2.length);
    if (!encodedCipher) {
      throw new Error("This QR code is not recognized by this app.");
    }
    return decodeLegacyV2Envelope(encodedCipher);
  }

  let decoded = {};

  try {
    decoded = JSON.parse(serialized);
  } catch {
    throw new Error("This QR code is not recognized by this app.");
  }

  if (decoded?.t === ENVELOPE_TAG_V2 && typeof decoded.c === "string") {
    const paddedCipher = fromBase64Url(decoded.c);
    const bytes = CryptoJS.AES.decrypt(paddedCipher, SHARED_SECRET);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);

    if (!decrypted) {
      throw new Error("The QR code cannot be unlocked by this app.");
    }

    let parsed;
    try {
      parsed = JSON.parse(decrypted);
    } catch {
      throw new Error("The QR payload is corrupted.");
    }

    if (parsed && typeof parsed === "object" && !parsed.text) {
      const data = {
        name: sanitizeSegment(parsed.n ?? ""),
        batch: sanitizeSegment(parsed.b ?? ""),
        generatedBy: sanitizeSegment(parsed.g ?? ""),
      };

      const issuedAt =
        typeof parsed.i === "number" ? parsed.i : Date.now();

      return {
        text: JSON.stringify(data),
        issuedAt,
        data,
        version: 2,
      };
    }

    return parsed;
  }

  if (decoded.tag !== ENVELOPE_TAG || typeof decoded.cipher !== "string") {
    throw new Error("This QR code is not recognized by this app.");
  }

  const bytes = CryptoJS.AES.decrypt(decoded.cipher, SHARED_SECRET);
  const decrypted = bytes.toString(CryptoJS.enc.Utf8);

  if (!decrypted) {
    throw new Error("The QR code cannot be unlocked by this app.");
  }

  try {
    const legacy = JSON.parse(decrypted);
    return { ...legacy, version: 1 };
  } catch {
    throw new Error("The QR payload is corrupted.");
  }
}

function decodeLegacyV2Envelope(encoded) {
  const paddedCipher = fromBase64Url(encoded);
  const bytes = CryptoJS.AES.decrypt(paddedCipher, SHARED_SECRET);
  const decrypted = bytes.toString(CryptoJS.enc.Utf8);

  if (!decrypted) {
    throw new Error("The QR code cannot be unlocked by this app.");
  }

  const segments = decrypted.split(PAYLOAD_SEPARATOR);
  if (segments.length < 4) {
    throw new Error("The QR payload is corrupted.");
  }

  const [name, batch, generatedBy, issuedRaw] = segments;
  const issuedAtNumber = Number(issuedRaw);

  const data = {
    name: sanitizeSegment(name),
    batch: sanitizeSegment(batch),
    generatedBy: sanitizeSegment(generatedBy),
  };

  return {
    text: JSON.stringify(data),
    issuedAt: Number.isFinite(issuedAtNumber) ? issuedAtNumber : Date.now(),
    data,
    version: 2,
  };
}
