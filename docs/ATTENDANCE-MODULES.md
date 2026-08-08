# Tanishq ERP Attendance Modules

The Principal portal intentionally separates attendance into four clear modules:

1. **Student Attendance**
   - Shows student attendance records.
   - Student QR scans are performed by the Teacher scanner.
   - One successful scan per student per school day.

2. **Teacher Attendance**
   - Shows teacher attendance records.
   - Teacher QR scans are performed by the Principal scanner.
   - One successful scan per teacher per school day.

3. **QR Center**
   - Separate Student and Teacher sections.
   - Generate/view QR cards automatically from Student ID or Teacher ID.
   - All Cards and Remaining Cards views.
   - Printed tag tracking.
   - Print and Save PDF actions.

4. **Scanner**
   - A separate navigation module, not hidden inside QR Center.
   - Opens the device camera once and supports continuous scanning.
   - Uses the back/environment camera where available.
   - Principal scanner accepts Teacher QR only.
   - Teacher scanner accepts Student QR only.
   - Invalid QR types are rejected.
   - Duplicate scans for the same person on the same day are rejected.

## Portal access

### Principal
- Student Attendance
- Teacher Attendance
- QR Center
- Scanner

### Teacher
- Student Attendance
- Scanner

### Parent
- View own child's attendance and Child QR. No attendance scanner.

### Developer
- Full access to all attendance modules and system controls.

## Important implementation rule

The current prototype can use local storage because Supabase is intentionally not connected yet. Once the separate Supabase project is connected, duplicate attendance must be enforced server-side with a unique person/date rule, not only in the browser.
