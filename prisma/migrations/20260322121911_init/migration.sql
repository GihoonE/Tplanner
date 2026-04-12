-- CreateTable
CREATE TABLE "Student" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "school" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "avatarChar" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "totalSessions" INTEGER NOT NULL DEFAULT 0,
    "hwCompletionRate" INTEGER NOT NULL DEFAULT 0
);
