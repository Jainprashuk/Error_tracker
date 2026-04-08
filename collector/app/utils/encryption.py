import os
import base64
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives import padding
from cryptography.hazmat.backends import default_backend
from dotenv import load_dotenv

load_dotenv()

# We pull the key from env, but provide a safe fallback for local development if it's missing.
# For AES-256-CBC, we need 32 bytes.
_key_str = os.getenv("ENCRYPTION_KEY", "VbK3Fk-HlsP6Kx8GZ7p7b_Q-n_hUaM2iXk9D9VcFvTQ=")
try:
    _key_bytes = base64.urlsafe_b64decode(_key_str)
    if len(_key_bytes) != 32:
        # Fallback to something 32 bytes if not valid
        _key_bytes = _key_str.encode('utf-8').ljust(32, b'\0')[:32]
except Exception:
    _key_bytes = _key_str.encode('utf-8').ljust(32, b'\0')[:32]

# Maintain fernet for backward compatibility
_fernet = Fernet(base64.urlsafe_b64encode(_key_bytes))

def encrypt_data(data: str) -> str:
    """
    Encrypts plaintext string using AES-256-CBC with a random IV.
    Returns: B64(IV + Ciphertext)
    """
    if not data:
        return data
    
    # Check if already looks encrypted by new method (starts with iv_ prefix or specific format)
    # Actually, we don't need a prefix if we just try-catch.
    
    try:
        iv = os.urandom(16)
        cipher = Cipher(algorithms.AES(_key_bytes), modes.CBC(iv), backend=default_backend())
        encryptor = cipher.encryptor()
        
        # Pad data
        padder = padding.PKCS7(128).padder()
        padded_data = padder.update(data.encode('utf-8')) + padder.finalize()
        
        ciphertext = encryptor.update(padded_data) + encryptor.finalize()
        
        # Combine IV and ciphertext and base64 encode
        combined = iv + ciphertext
        return base64.b64encode(combined).decode('utf-8')
    except Exception as e:
        return data

def decrypt_data(encrypted_data: str) -> str:
    """
    Decrypts string. Tries AES-256-CBC first, then falls back to Fernet, then returns as-is.
    """
    if not encrypted_data:
        return encrypted_data
    
    # Try AES-256-CBC (New Default)
    try:
        combined = base64.b64decode(encrypted_data)
        if len(combined) > 16:
            iv = combined[:16]
            ciphertext = combined[16:]
            
            cipher = Cipher(algorithms.AES(_key_bytes), modes.CBC(iv), backend=default_backend())
            decryptor = cipher.decryptor()
            
            padded_data = decryptor.update(ciphertext) + decryptor.finalize()
            
            unpadder = padding.PKCS7(128).unpadder()
            data = unpadder.update(padded_data) + unpadder.finalize()
            
            return data.decode('utf-8')
    except Exception:
        # If AES-CBC fails, try Fernet
        pass

    # Try Fernet (Backward Compatibility)
    try:
        return _fernet.decrypt(encrypted_data.encode('utf-8')).decode('utf-8')
    except Exception:
        # If decryption fails (unencrypted legacy text), return original.
        return encrypted_data

