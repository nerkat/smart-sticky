/*
  Warnings:

  - You are about to drop the column `event` on the `ScriptTag` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ScriptTag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "scriptTagId" TEXT NOT NULL,
    "src" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_ScriptTag" ("createdAt", "id", "scriptTagId", "shop", "src", "updatedAt") SELECT "createdAt", "id", "scriptTagId", "shop", "src", "updatedAt" FROM "ScriptTag";
DROP TABLE "ScriptTag";
ALTER TABLE "new_ScriptTag" RENAME TO "ScriptTag";
CREATE UNIQUE INDEX "ScriptTag_shop_key" ON "ScriptTag"("shop");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
