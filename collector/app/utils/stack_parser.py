import re

def parse_stack_trace(stack):

    if not stack:
        return None

    match = re.search(r"(http.*?):(\d+):(\d+)", stack)

    if not match:
        return None

    return {
        "file": match.group(1),
        "line": int(match.group(2)),
        "column": int(match.group(3))
    }