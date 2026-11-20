# Earn simple application architecture

## Three daily records and reporting

<!-- mermaid:id=system -->
```mermaid
flowchart TB
  browser["Simple dashboard and daily forms"]
  auth["Better Auth login and role checks"]
  records["Salary - Cashflow - Production"]
  db["Prisma ORM and Neon PostgreSQL"]
  summary["Daily and monthly totals"]
  pdf["Private PDF preview and download"]
  browser --> auth
  auth --> records
  records --> db
  db --> summary
  summary --> browser
  summary --> pdf
%% portable-canonical-v2:eyJhY2Nlc3NpYmlsaXR5IjpudWxsLCJkYXRhIjp7ImRpcmVjdGlvbiI6IlRCIiwiZWRnZXMiOlt7ImZyb20iOiJicm93c2VyIiwidG8iOiJhdXRoIn0seyJmcm9tIjoiYXV0aCIsInRvIjoicmVjb3JkcyJ9LHsiZnJvbSI6InJlY29yZHMiLCJ0byI6ImRiIn0seyJmcm9tIjoiZGIiLCJ0byI6InN1bW1hcnkifSx7ImZyb20iOiJzdW1tYXJ5IiwidG8iOiJicm93c2VyIn0seyJmcm9tIjoic3VtbWFyeSIsInRvIjoicGRmIn1dLCJub2RlcyI6W3siaWQiOiJicm93c2VyIiwibGFiZWwiOiJTaW1wbGUgZGFzaGJvYXJkIGFuZCBkYWlseSBmb3JtcyJ9LHsiaWQiOiJhdXRoIiwibGFiZWwiOiJCZXR0ZXIgQXV0aCBsb2dpbiBhbmQgcm9sZSBjaGVja3MifSx7ImlkIjoicmVjb3JkcyIsImxhYmVsIjoiU2FsYXJ5IC0gQ2FzaGZsb3cgLSBQcm9kdWN0aW9uIn0seyJpZCI6ImRiIiwibGFiZWwiOiJQcmlzbWEgT1JNIGFuZCBOZW9uIFBvc3RncmVTUUwifSx7ImlkIjoic3VtbWFyeSIsImxhYmVsIjoiRGFpbHkgYW5kIG1vbnRobHkgdG90YWxzIn0seyJpZCI6InBkZiIsImxhYmVsIjoiUHJpdmF0ZSBQREYgcHJldmlldyBhbmQgZG93bmxvYWQifV19LCJkZXNjcmlwdGlvbiI6bnVsbCwiaWQiOiJzeXN0ZW0iLCJraW5kIjoiZmxvd2NoYXJ0Iiwic291cmNlU2hhMjU2IjoiMDYwNmQzNGViYTY3YzJjMTczMTJlZGNlNzY0ZTE3NGRhMjQwOGI0NzZhMjczYmMyNWI1NjlhMDI0ZWY1Mzc4YSIsInN0eWxlcyI6W10sInRpdGxlIjoiVGhyZWUgZGFpbHkgcmVjb3JkcyBhbmQgcmVwb3J0aW5nIiwidmVyc2lvbiI6MX0
```
