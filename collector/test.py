from app.services.r2 import r2

print("Uploading test file...")

r2.put_object(
    Bucket="bugtracker-screenshots",
    Key="debug/test.txt",
    Body=b"hello world",
)

print("Upload complete")