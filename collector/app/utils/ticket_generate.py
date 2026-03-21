import json


def generate_title(error: dict):
    event_type = error.get("event_type", "error")

    if event_type == "manual":
        metadata = error.get("payload", {}).get("metadata", {})
        category = metadata.get("category", "User Report")
        return f"BUG | {category}"

    message = error.get("message", "Error")
    return f"BUG | {event_type} | {message[:80]}"


def build_description(error: dict, screenshot_url: str = None):
    payload = error.get("payload", {})
    metadata = payload.get("metadata", {})
    client = payload.get("client", {})

    # --- Screenshot section ---
    screenshot_section = ""
    if screenshot_url:
        screenshot_section = f"""
---

## 📸 Screenshot

![Screenshot]({screenshot_url})
"""

    # --- Metadata block ---
    metadata_lines = "\n".join(
        f"| **{k}** | `{v}` |" for k, v in metadata.items()
    ) if metadata else "| — | No metadata |"

    metadata_table = f"""| Key | Value |
|-----|-------|
{metadata_lines}"""

    # --- Full payload ---
    payload_json = json.dumps(payload, indent=2)

    description = f"""# 🔥 Error Report

---

## 📋 Summary

| Field | Value |
|-------|-------|
| **Message** | `{error.get("message", "N/A")}` |
| **Occurrences** | **{error.get("occurrences", "N/A")}** |
| **Event Type** | `{error.get("event_type", "N/A")}` |

---

## 📍 Client Info

| Field | Value |
|-------|-------|
| **URL** | {client.get("url", "N/A")} |
| **Browser** | `{client.get("browser", "N/A")}` |

---

## 🧾 Metadata

{metadata_table}
{screenshot_section}

---

## 📦 Full Payload
```json
{payload_json}
```
"""

    return description