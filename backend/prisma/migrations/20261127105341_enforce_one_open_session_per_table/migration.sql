CREATE UNIQUE INDEX "TableSession_one_open_per_table"
ON "TableSession" ("tableId")
WHERE "status" = 'OPEN';