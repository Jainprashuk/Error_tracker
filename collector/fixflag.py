from app.services.db import errors_collection

result = errors_collection.update_many(
    {"is_ticket_generated": {"$exists": False}},
    {"$set": {"is_ticket_generated": False}}
)

print(f"✅ Updated {result.modified_count} documents")