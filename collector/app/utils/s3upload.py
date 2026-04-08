import base64
import uuid
import os
from app.services.r2 import r2

BUCKET_NAME = "bugtracker-screenshots"
PUBLIC_R2_URL = os.getenv("R2_PUBLIC_URL")

def upload_screenshot(base64_data):


    header, encoded = base64_data.split(",", 1)


    file_key = f"screenshots/{uuid.uuid4()}.png"

    image_bytes = base64.b64decode(encoded)


    response = r2.put_object(
        Bucket=BUCKET_NAME,
        Key=file_key,
        Body=image_bytes,
        ContentType="image/png"
    )


    return f"{PUBLIC_R2_URL}/{file_key}"