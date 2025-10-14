// @ts-nocheck
import CryptoJS from "crypto-js";

export const ENVELOPE_TAG = "qr-secure:v1";
export const SHARED_SECRET = "qr-secure#vault@2025";

export function createEnvelope(plainText) {
  const normalizedText = plainText.trim();

  if (!normalizedText) {
    throw new Error("Enter the text you want to protect.");
  }

  const payload = JSON.stringify({
    tag: ENVELOPE_TAG,
    v: 1,
    cipher: CryptoJS.AES.encrypt(
      JSON.stringify({
        text: normalizedText,
        issuedAt: Date.now(),
      }),
      SHARED_SECRET
    ).toString(),
  });

  return payload;
}

export function decryptEnvelope(serialized) {
  let decoded = {};

  try {
    decoded = JSON.parse(serialized);
  } catch {
    throw new Error("This QR code is not recognized by this app.");
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
    return JSON.parse(decrypted);
  } catch {
    throw new Error("The QR payload is corrupted.");
  }
}
