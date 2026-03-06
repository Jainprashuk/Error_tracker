"""
Fingerprint generation utility for error deduplication.
Creates a unique hash identifier for errors to detect duplicates.
"""

import hashlib


def generate_fingerprint(endpoint: str, message: str):
    """
    Generate a unique fingerprint/hash for an error.
    
    This function creates a SHA256 hash of the error endpoint and message.
    Same endpoint + same message will always produce the same fingerprint,
    which allows us to identify duplicate errors.
    
    Args:
        endpoint (str): The URL/endpoint where the error occurred
        message (str): The error message text
    
    Returns:
        str: A 64-character SHA256 hex digest (unique identifier for this error)
    
    Example:
        fingerprint = generate_fingerprint("https://api.example.com/users", "TypeError: Cannot read property")
        # Returns: "a1b2c3d4e5f6... (64 char hex string)"
    """
    
    # Combine endpoint and message into a single string
    base = f"{endpoint}-{message}"

    # Create SHA256 hash of the combined string and convert to hexadecimal
    # SHA256 is cryptographically secure and produces consistent results
    fingerprint = hashlib.sha256(base.encode()).hexdigest()

    return fingerprint