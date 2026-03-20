import hashlib
import re


def normalize_endpoint(endpoint: str) -> str:
    if not endpoint:
        return "unknown"

    endpoint = endpoint.split("?")[0]

    endpoint = re.sub(r"/\d+", "/:id", endpoint)
    endpoint = re.sub(r"/[a-f0-9-]{8,}", "/:uuid", endpoint)

    return endpoint


def normalize_message(message: str) -> str:
    if not message:
        return "unknown"

    message = re.sub(r"\d+", "", message)
    message = re.sub(r"'[^']*'", "''", message)

    return message.strip()


def get_top_stack_frame(stack: str) -> str:
    if not stack:
        return "no_stack"

    lines = stack.split("\n")

    for line in lines:
        if "node_modules" not in line and line.strip():
            return line.strip()

    return lines[0].strip() if lines else "no_stack"


def generate_fingerprint(
    endpoint: str,
    message: str,
    stack: str,
    event_type: str,
    status: int = None
):
    normalized_endpoint = normalize_endpoint(endpoint)
    normalized_message = normalize_message(message)
    top_frame = get_top_stack_frame(stack)

    status_part = str(status) if status else "no_status"

    base = f"{event_type}|{status_part}|{normalized_endpoint}|{normalized_message}|{top_frame}"

    return hashlib.sha256(base.encode()).hexdigest()