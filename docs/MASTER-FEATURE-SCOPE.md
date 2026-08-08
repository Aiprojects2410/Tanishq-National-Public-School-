# TNPS ERP Master Feature Scope

## Roles
- Developer: full system control, user management, configuration, audit logs, and support ticket resolution/closure.
- Principal: school-wide operational access, but no developer/database controls and no ticket resolve/close authority.
- Teacher: assigned classes/students only; attendance scanner, homework, exam results, timetable, notices and reports.
- Parent: child-focused access; no separate student portal.

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
- Communication
- Reports
- Settings
- Floating Feedback / Support

Fees are intentionally excluded for now.

## Student and Teacher Management
- Student photo, automatic Student ID and Admission Number.
- Student name, DOB, gender, class, section, guardian name and parent contact.
- Aadhaar number and Aadhaar document.
- Home address/location entered manually.
- School address/location configured once as the default Google Maps school location.
- Flexible image/PDF documents.
- Teacher photo, automatic Teacher ID, contact, qualification, joining date, designation, class/subject assignment and documents.

## QR Center and identity pages
- Student and Teacher QR collections are separate.
- Each has All Cards and Remaining Cards tabs.
- Print and Save PDF for every card.
- Printed tag moves completed cards out of Remaining Cards.
- One QR identity per student/teacher with a dedicated QR profile page.
- The same QR is used for attendance and authorized identity/profile lookup.
- A third-party QR scan opens the public identification page.
- Student public page can show school-approved emergency details: photo, name, Student ID, admission number, class/section, guardian name, approved contact, manually entered home address/location and default school address/location.
- Aadhaar and private uploaded documents must never be exposed publicly.

## Attendance
### Student Attendance
- Overview totals: total students, present, absent, attendance percentage.
- Class and section filters.
- Class cards showing total/present/absent/percentage.
- Student table with name, Student ID, status and arrival time.
- Date, class, section, status and student search filters.
- Individual and historical attendance views.

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
- Production must enforce the rule server-side as well as in the UI.

## Academics
- Classes and sections.
- Subjects and teacher assignment.
- Homework with image/PDF attachments.
- Exams/assessments.
- Nursery/KG observation-based assessment.
- Class 1-8 marks/grade-based results.

## Teacher Exam Results
- Select exam, class/section and student.
- Enter subject-wise obtained marks against configured maximum marks.
- Save result.
- Automatically calculate total, percentage and configured grade.
- Teacher cannot manually enter the calculated percentage.
- Published results appear in the linked parent's portal.

## Timetable
- View/filter timetable.
- Add Timetable action.
- Edit and delete timetable entries.
- Class, section, day, period, start/end time, subject and teacher fields.
- Assigned timetable appears in relevant teacher and parent views.

## Parent portal
- No separate student portal.
- Parent accesses linked child data.
- Child profile and QR.
- Attendance.
- Homework.
- Exam results with subject-wise marks, total, percentage and grade.
- Timetable and notices.

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
- Future AI Support Assistant may classify issues, suggest priority and prefill ticket context, but cannot resolve/close tickets.

## Notifications, Search and Audit
- Role-appropriate notification center.
- Global search for students, teachers, Student ID and Admission Number.
- Developer audit log for important actions.
- Profile, account and security settings per role.

## Optional future AI
- AI Support Assistant.
- Teacher homework/question/notice helper.
- Student progress summaries from approved data.
- Parent-friendly result summaries.
- Developer read-only system insights.
- No AI authority to perform destructive actions without explicit authorization.

## Infrastructure boundary
- This repository must never connect to or modify Skylark infrastructure.
- Supabase and Netlify are intentionally deferred to the separate environment/account.
- Current prototype may use local browser storage only until the separate production database/auth environment is connected.
