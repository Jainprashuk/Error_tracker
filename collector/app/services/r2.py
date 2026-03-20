import boto3
import os
from botocore.config import Config
from dotenv import load_dotenv

load_dotenv()

CF_ACCOUNT_ID = os.getenv("CF_ACCOUNT_ID")
CF_ACCESS_KEY_ID = os.getenv("CF_ACCESS_KEY_ID")
CF_SECRET_ACCESS_KEY = os.getenv("CF_SECRET_ACCESS_KEY")


r2 = boto3.client(
    "s3",
    endpoint_url=f"https://{CF_ACCOUNT_ID}.r2.cloudflarestorage.com",
    aws_access_key_id=CF_ACCESS_KEY_ID,
    aws_secret_access_key=CF_SECRET_ACCESS_KEY,
    region_name="auto",
    config=Config(
        signature_version="s3v4",
        retries={"max_attempts": 3},
        connect_timeout=5,
        read_timeout=5
    )
)