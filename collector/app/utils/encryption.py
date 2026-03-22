import os
from cryptography.fernet import Fernet
from dotenv import load_dotenv

load_dotenv()

# Secret key required for Fernet encryption. It must be 32 url-safe base64-encoded bytes.
# We pull it from env, but provide a safe fallback for local development if it's missing.
_key = os.getenv("ENCRYPTION_KEY")
if not _key:
    # A valid fallback Fernet key generated for dev usage to prevent crashes.
    _key = b"VbK3Fk-HlsP6Kx8GZ7p7b_Q-n_hUaM2iXk9D9VcFvTQ="
else:
    _key = _key.encode('utf-8')

fernet = Fernet(_key)

def encrypt_data(data: str) -> str:
    """Encrypts plaintext string using symmetric Fernet encryption."""
    if not data:
        return data
    # Simple check if already looks like a fernet token (begins with gAAAA...)
    if data.startswith("gAAAAAB"):
        return data
    return fernet.encrypt(data.encode('utf-8')).decode('utf-8')

def decrypt_data(encrypted_data: str) -> str:
    """Decrypts string encoded by Fernet back to plaintext. Fails gracefully."""
    if not encrypted_data:
        return encrypted_data
    try:
        return fernet.decrypt(encrypted_data.encode('utf-8')).decode('utf-8')
    except Exception:
        # If decryption fails (e.g. invalid key or unencrypted legacy text), return original.
        # This provides backward compatibility for already-saved plaintext API keys in DB!
        return encrypted_data
