import base64
import uuid
import os
from app.services.r2 import r2

BUCKET_NAME = "bugtracker-screenshots"
PUBLIC_R2_URL = os.getenv("R2_PUBLIC_URL")

def upload_screenshot(base64_data):

    print("STEP 1: function called", flush=True)

    header, encoded = base64_data.split(",", 1)

    print("STEP 2: base64 decoded", flush=True)

    file_key = f"screenshots/{uuid.uuid4()}.png"

    image_bytes = base64.b64decode(encoded)

    print("STEP 3: uploading to R2...", flush=True)

    response = r2.put_object(
        Bucket=BUCKET_NAME,
        Key=file_key,
        Body=image_bytes,
        ContentType="image/png"
    )

    print("R2 response:", response, flush=True)

    print("STEP 4: upload done", flush=True)

    return f"{PUBLIC_R2_URL}/{file_key}"