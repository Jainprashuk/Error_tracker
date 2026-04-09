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


def get_stack_frames(stack: str, limit: int = 3) -> str:
    if not stack:
        return "no_stack"

    lines = stack.split("\n")
    frames = []

    for line in lines:
        line = line.strip()
        if not line or "node_modules" in line or "at " not in line.lower():
            continue

        # 💡 P1 FIX: Normalize stack frames to prevent grouping failures
        # 1. Remove line/column numbers at the end (e.g., :12:5 or :12)
        line = re.sub(r":\d+(:\d+)?\)?$", "", line)
        
        # 2. Remove Vite/Webpack dev hashes (e.g., ?t=123456789 or ?v=abcd)
        line = re.sub(r"\?[t|v]=[^:)]+", "", line)
        
        frames.append(line)
        if len(frames) >= limit:
            break

    return "|".join(frames) if frames else lines[0].strip() if lines else "no_stack"



def generate_fingerprint(
    endpoint: str,
    message: str,
    stack: str,
    event_type: str,
    status: int = None,
    project_id: str = None
):
    """
    Generates a unique SHA256 fingerprint for grouping similar errors.
    💡 Uses top 3 stack frames + normalized message + endpoint.
    """
    normalized_endpoint = normalize_endpoint(endpoint)
    normalized_message = normalize_message(message)
    stack_sig = get_stack_frames(stack)

    status_part = str(status) if status else "no_status"
    project_id_part = str(project_id) if project_id else "no_project"

    # We combine more context to reduce collisions
    base = f"{event_type}|{status_part}|{normalized_endpoint}|{normalized_message}|{stack_sig}|{project_id_part}"

    return hashlib.sha256(base.encode()).hexdigest()