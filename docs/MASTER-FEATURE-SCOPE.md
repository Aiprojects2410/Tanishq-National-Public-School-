# TNPS ERP Master Feature Scope

## Project boundary
Tanishq National Public School is a completely separate client project. Skylark School ERP is reference-only. Never modify Skylark code, data, Supabase, Netlify, production configuration or infrastructure from this project.

## Roles
- Developer: full application control, user management, configuration, audit logs, security/settings, and support ticket resolution/closure.
- Principal: school-wide operational access, but no developer/database controls and no ticket resolve/close authority.
- Teacher: assigned classes/students only; student QR scanner, attendance, homework, exam results, timetable, notices and reports.
- Parent: child-focused access; no separate student portal.

## Authentication and access
- Protected routes and role-based access.
- Separate Developer, Principal, Teacher and Parent portals inside the same application.
- Parent access is linked to the child's Student ID/data; students do not receive a separate login portal.
- Support future School ID/email login, temporary-password credential display when accounts are created, password change on first login, password reset and secure session/logout flows.
- Principal/Teacher/Parent permissions must be enforced server-side after the separate Supabase environment is connected, not only by hiding UI controls.

## Principal modules
- Dashboard
- Students
- Teachers & Staff
- Student Attendance
- Teacher Attendance
- QR Center
- Scanner
- Academics
- Timetable
- Communication / Notices
- Leave
- Reports
- Settings
- Floating Feedback / Support

Fees are intentionally excluded for now.

## Developer portal
- Full system dashboard.
- Create/revoke/remove Principal, Teacher and Parent accounts.
- Student and school data controls.
- School configuration including school name, logo, address, Google Maps school location, emergency/public contact and academic session.
- Classes, sections, subjects and assignments configuration.
- Reports and audit logs.
- Support Center with full ticket resolution authority.
- Future database/system tools after the separate Supabase environment is connected.
- Developer-only controls must not appear as normal Principal/Teacher/Parent controls.

## Student and Teacher Management
- Student photo, automatic Student ID and Admission Number.
- Student name, DOB, gender, class, section, guardian name and parent contact.
- Aadhaar number and Aadhaar document.
- Home address/location entered manually during student creation.
- School address/location configured once as the default Google Maps school location.
- Flexible image/PDF documents for current and future document types.
- Teacher photo, automatic Teacher ID, contact, qualification, joining date, designation, class/subject assignment and documents.
- Safe create/edit/deactivate flows; avoid destructive hard deletes when records are already referenced by attendance/results.

## QR Center and identity pages
- Student and Teacher QR collections are separate.
- Each has All Cards and Remaining Cards tabs.
- Print and Save PDF for every card.
- Printed tag moves completed cards out of Remaining Cards.
- One QR identity per student/teacher with a dedicated QR profile/card page.
- The same QR is used for attendance and authorized identity/profile lookup.
- QR should use a secure opaque identity token rather than exposing database UUIDs or sensitive data inside the QR itself; scanning the token can open the public identification page.
- A normal/third-party QR scan opens the public identification page.
- Student public page can show school-approved emergency identification details: photo, name, Student ID, admission number, class/section, guardian name, approved contact, manually entered home address/location and default school address/location.
- Aadhaar number, Aadhaar image and private uploaded documents must never be exposed publicly.
- QR regeneration, when implemented, invalidates the old physical QR card.

## Attendance
### Student Attendance
- Overview totals: total students, present, absent, attendance percentage.
- Class and section filters.
- Class cards showing total/present/absent/percentage.
- Student table with name, Student ID, status and arrival time.
- Date, class, section, status and student search filters.
- Individual and historical attendance views.
- Daily/weekly/monthly overview and attendance calendar/analytics can be added without changing the core scanner flow.
- Late/absent/present status and attendance notes may be supported in the future.

### Teacher Attendance
- Same detailed depth as student attendance.
- Total teachers, present, absent and percentage.
- Teacher table with name, Teacher ID, status and arrival time.
- Date, status, teacher name/ID and designation filters.
- Individual teacher history and monthly view.
- Class/subject/designation assignment may be shown where available.

### Scanner
- Separate Principal and Teacher Scanner module.
- Principal scanner accepts teacher QR only and records teacher attendance.
- Teacher scanner accepts student QR only and records student attendance.
- Back/environment camera and continuous multi-scan session.
- Invalid/wrong-role QR rejected.
- One successful attendance per person per calendar day; repeated scans rejected.
- Production must enforce the duplicate rule server-side as well as in the UI, ideally with a database uniqueness constraint/transaction.
- Keep student and teacher attendance in separate logical records.

## Academics
- Classes and sections.
- Subjects and teacher assignment.
- Academic session/year configuration.
- Homework with image/PDF attachments, class/subject targeting and due dates.
- Homework submission/review workflow where useful.
- Exams/assessments.
- Nursery/KG observation-based assessment.
- Class 1-8 marks/grade-based results.
- Report-card/result presentation.
- Student promotion/section transfer can be added for future academic sessions.

## Teacher Exam Results
- Select exam, class/section and student.
- Enter subject-wise obtained marks against configured maximum marks.
- Save result.
- Automatically calculate total, percentage and configured grade.
- Teacher cannot manually enter the calculated percentage.
- Published results appear in the linked parent's portal.
- Result data should preserve exam/session history.

## Timetable
- View/filter timetable.
- Add Timetable action.
- Edit and delete timetable entries.
- Class, section, day, period, start/end time, subject and teacher fields.
- Weekly grid view.
- Assigned timetable appears in relevant teacher and parent views.

## Parent portal
- No separate student portal.
- Parent accesses linked child data.
- Child profile and QR.
- Attendance.
- Homework.
- Exam results with subject-wise marks, total, percentage and grade.
- Timetable and notices.
- Only the linked child's records are visible.

## Reports
- Standalone Reports module for Developer, Principal and Teacher with role-based data scope.
- Monthly student attendance reports.
- Monthly teacher attendance reports.
- Class/section attendance summaries.
- Individual student report search by name, Student ID or Admission Number.
- Individual teacher report search.
- Present/absent counts, working days, percentage and daily history.
- Designed printable report layout with Print and Save PDF.
- Future report types can be added without redesigning the module.

## Notices / Communication / Notifications
- Principal can create school notices/announcements.
- Notices can target appropriate roles/classes.
- Teacher and Parent see only relevant notices.
- Notification center for role-appropriate events such as new notice, result publication, timetable change, attendance/result updates and ticket activity.

## Leave
- Simple leave request workflow for teachers/staff if enabled by the school.
- Principal can review/approve/reject leave requests.
- Leave history is retained for reporting.
- Keep this lightweight; it should not become a large HR/payroll module.

## Support Tickets / Feedback
- Floating Feedback widget across portals.
- Small matching icon peeks from the side after a short delay.
- User can drag/reposition it anywhere.
- Fully expanded state shows “Feedback!”.
- Quick actions: Report Bug, Technical Problem, Data Issue, Help, Feature Request, My Tickets.
- Capture ticket ID, user, role, page/module, timestamp, browser/device, description and optional screenshot.
- Status flow: Open -> In Progress -> Resolved -> Closed.
- Only Developer may assign, resolve or close tickets.
- Principal, Teacher and Parent may create/view/reply to their own tickets but cannot resolve or close them.
- Future AI Support Assistant may classify issues, suggest priority and prefill ticket context, but cannot resolve/close them.

## Search, errors, account settings and audit
- Global search for students, teachers, Student ID and Admission Number.
- Useful empty/loading/error states.
- 401/403/404/500-style friendly error pages where applicable.
- Profile, account and security settings per role.
- Notifications dropdown/center.
- Developer audit log for important actions: create, update, deactivate, result changes, attendance corrections and account changes.

## Optional future AI
- AI Support Assistant.
- Teacher homework/question/notice helper.
- Student progress summaries from approved data.
- Parent-friendly result summaries.
- Developer read-only system insights.
- No AI authority to perform destructive actions without explicit authorization.

## Infrastructure boundary
- This repository must never connect to or modify Skylark infrastructure.
- Supabase and Netlify are intentionally deferred to the separate environment/account for this project.
- Current prototype may use local browser storage only until the separate production database/auth environment is connected.
