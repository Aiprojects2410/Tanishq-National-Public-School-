# TNPS Portal Access & QR Plan

## Portals

### Developer
Full system control. The developer can manage application configuration, users, roles, school configuration, modules, audit information and, after the separate Supabase environment is connected, database/auth/storage controls.

### Principal
School-management access only: dashboard, students, teachers & staff, QR attendance, attendance, academics, timetable, communication, reports and basic school settings.

### Teacher
Minimal operational access: dashboard, assigned students, student QR scanner, attendance, homework and timetable.

### Parent
Child-only access. There is no separate student portal. The parent uses the child's Student ID as the portal identity in the planned flow, with the exact authentication method to be hardened when Supabase is connected. The parent can see the child's profile, child QR, attendance, homework, timetable and notices.

## QR rules

- Student QR is created automatically from the permanent Student ID.
- Teacher QR is created automatically from the permanent Teacher ID.
- Teacher scanners accept student QR only.
- Principal scanners accept teacher QR only.
- QR scanning is continuous and uses the device environment/back camera.
- One successful attendance record per person per calendar day is allowed.
- Production duplicate protection must be enforced server-side with a unique constraint/idempotent attendance operation.

## Child identity and emergency information

Student records are planned to include photo, name, father/guardian name, parent phone number, Aadhaar number/document, admission number, home location and school location, plus future documents.

**Privacy rule:** the printed/physical QR must not contain the child's home address, parent phone number, Aadhaar number, or other sensitive information in plain text. A normal third-party QR scanner can read QR contents without knowing the school. The QR therefore carries only an opaque TNPS identity reference. A future server-backed emergency lookup may show the minimum approved contact information only after an authorization step or school-approved emergency workflow.

The parent portal can display the child's QR and authorized child details after authentication.
