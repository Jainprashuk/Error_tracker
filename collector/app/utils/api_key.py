import secrets

def generate_api_key():
    return "proj_" + secrets.token_hex(12)