-- DropForeignKey
ALTER TABLE "Student" DROP CONSTRAINT "Student_instructorId_fkey";

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
