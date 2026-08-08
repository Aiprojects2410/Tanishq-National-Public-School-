# Tanishq National Public School ERP

A simple, friendly school ERP for Nursery through Class 8.

## Current scope

- Role-based portal shell: Developer, Principal, Teacher, Parent
- Friendly modern school UI inspired by the selected third visual direction
- QR identity cards for students and teachers
- Continuous QR scanning flow
- Principal scanner accepts teacher QR codes only
- Teacher scanner accepts student QR codes only
- One successful attendance record per person per day
- Attendance records include date and scan time
- Local browser storage is used only as a temporary prototype store

## Intentionally not connected yet

- Supabase
- Netlify
- Production authentication
- Production file storage
- Production database

Those integrations will be added later in the separate environment/account chosen for the project.

## QR attendance rules

1. Student creation will generate a permanent Student ID and QR identity.
2. Teacher creation will generate a permanent Teacher ID and QR identity.
3. A teacher scanner can mark only student attendance.
4. A principal scanner can mark only teacher attendance.
5. The camera requests the device back/environment camera.
6. The scanner stays open for multiple people so the operator does not repeatedly open the camera.
7. A person can receive only one successful QR attendance record per calendar day. Repeated scans are rejected.
8. The final production implementation must enforce the one-scan-per-day rule server-side as well as in the UI.

## Planned next work

- Student/teacher creation forms with automatic IDs
- Photo upload and flexible document records (image/PDF)
- Principal modules kept intentionally minimal
- Teacher and parent portals with minimal permissions
- Developer portal with full system control
- Production Supabase schema, auth, storage and RLS in the separate environment
