import CryptoJS from 'crypto-js';

// Get the key from environment variables. Must be 32 bytes when base64 decoded.
const ENCRYPTION_KEY = import.meta.env.VITE_ENCRYPTION_KEY || 'VbK3Fk-HlsP6Kx8GZ7p7b_Q-n_hUaM2iXk9D9VcFvTQ=';

/**
 * Encrypts a string using AES-256-CBC with a random IV.
 * Matches Python's cryptography implementation.
 */
export const encrypt = (plaintext: string): string => {
    if (!plaintext) return plaintext;

    try {
        // Transform url-safe base64 to standard base64 if needed
        const standardBase64Key = ENCRYPTION_KEY.replace(/-/g, '+').replace(/_/g, '/');
        const key = CryptoJS.enc.Base64.parse(standardBase64Key);

        // Generate a random 16-byte IV
        const iv = CryptoJS.lib.WordArray.random(16);

        const encrypted = CryptoJS.AES.encrypt(plaintext, key, {
            iv: iv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7,
        });

        // Combine IV (16 bytes) + Ciphertext
        const combined = iv.concat(encrypted.ciphertext);

        // Return as Base64 string
        return CryptoJS.enc.Base64.stringify(combined);
    } catch (error) {
        console.error('Encryption failed:', error);
        return plaintext;
    }
};

/**
 * Decrypts a string using AES-256-CBC (assuming IV is prepended).
 */
export const decrypt = (base64CipherText: string): string => {
    if (!base64CipherText) return base64CipherText;

    try {
        const standardBase64Key = ENCRYPTION_KEY.replace(/-/g, '+').replace(/_/g, '/');
        const key = CryptoJS.enc.Base64.parse(standardBase64Key);

        // Parse the combined IV + Ciphertext
        const combined = CryptoJS.enc.Base64.parse(base64CipherText);

        // Extract IV (first 16 bytes = 4 words)
        const iv = CryptoJS.lib.WordArray.create(combined.words.slice(0, 4), 16);

        // Extract Ciphertext (everything after the first 16 bytes)
        const ciphertext = CryptoJS.lib.WordArray.create(combined.words.slice(4), combined.sigBytes - 16);

        const decrypted = CryptoJS.AES.decrypt(
            { ciphertext: ciphertext } as CryptoJS.lib.CipherParams,
            key,
            {
                iv: iv,
                mode: CryptoJS.mode.CBC,
                padding: CryptoJS.pad.Pkcs7,
            }
        );

        const result = decrypted.toString(CryptoJS.enc.Utf8);

        // If decryption fails or result is empty, return original (fallback for legacy data)
        return result || base64CipherText;
    } catch (error) {
        // Graceful fallback to return original data if decryption fails
        return base64CipherText;
    }
};
