-- Add indexes for the hot access and range query paths used by the app.
CREATE INDEX "Student_instructorId_status_id_idx" ON "Student"("instructorId", "status", "id");
CREATE INDEX "Session_studentId_start_idx" ON "Session"("studentId", "start");
CREATE INDEX "Session_start_idx" ON "Session"("start");
CREATE INDEX "Session_end_idx" ON "Session"("end");
CREATE INDEX "HomeworkItem_sessionId_idx" ON "HomeworkItem"("sessionId");
CREATE INDEX "Report_studentId_updatedAt_id_idx" ON "Report"("studentId", "updatedAt", "id");
CREATE INDEX "ReportSession_sessionId_idx" ON "ReportSession"("sessionId");
CREATE INDEX "StudentParent_parentId_studentId_idx" ON "StudentParent"("parentId", "studentId");
CREATE INDEX "StudentInvitation_studentId_instructorId_createdAt_idx" ON "StudentInvitation"("studentId", "instructorId", "createdAt");
CREATE INDEX "StudentInvitation_instructorId_createdAt_idx" ON "StudentInvitation"("instructorId", "createdAt");
