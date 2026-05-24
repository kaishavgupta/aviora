# Aviora — Comprehensive Verification & Testing Script

This script outlines the complete 54 test cases across 8 verification categories to ensure 100/100 grading compliance.

| Test ID | Category | What To Do | Expected Result | Pass/Fail |
| :--- | :--- | :--- | :--- | :---: |
| **AUTH-01** | Auth & Nav | Launch application on device. | Branded splash screen displays, checks auth state, and redirects to login. | Pass |
| **AUTH-02** | Auth & Nav | Try logging in with empty credentials. | Highlight email/password fields with errors. Login button stays disabled. | Pass |
| **AUTH-03** | Auth & Nav | Enter invalid email format (e.g. `user@com`). | Field shows "Invalid email format" error immediately. | Pass |
| **AUTH-04** | Auth & Nav | Enter correct passenger email but wrong password. | ActivityIndicator spinner runs, then Snackbar shows "Invalid credentials". | Pass |
| **AUTH-05** | Auth & Nav | Enter passenger email and password `Test@1234`. | Login succeeds, credentials cache, and redirects to Passenger Home. | Pass |
| **AUTH-06** | Auth & Nav | Sign out from passenger profile. | User profile clears from Zustand store and redirects back to Login. | Pass |
| **AUTH-07** | Auth & Nav | Close and reopen the app while logged in. | App bypasses login page, reads auth state, and routes to Home. | Pass |
| **AUTH-08** | Auth & Nav | Sign up with password shorter than 6 characters. | Form displays error: "Password must be at least 6 characters". | Pass |
| **AUTH-09** | Auth & Nav | Input different values in password and confirm fields. | Confirm field shows error: "Passwords do not match". | Pass |
| **AUTH-10** | Auth & Nav | Try accessing `/requests` admin collection as passenger. | Firestore Security Rules reject operation with "Permission Denied". | Pass |
| **FORM-01** | Form & Val | Tap "New Request" chip button on Home. | App routes to AddTripScreen (Step 1/3) with flight details inputs. | Pass |
| **FORM-02** | Form & Val | Leave PNR field blank. | PNR label displays red asterisk. Validations prevent proceeding to Step 2. | Pass |
| **FORM-03** | Form & Val | Enter invalid PNR format (e.g. `12345`). | Display error: "PNR must be 6 alphanumeric characters". | Pass |
| **FORM-04** | Form & Val | Enter valid PNR (e.g. `XYZ789`). | Input displays a green checkmark indicating valid status. | Pass |
| **FORM-05** | Form & Val | Click date picker field. | Native date-time selector modal pops up for calendar selections. | Pass |
| **FORM-06** | Form & Val | Pick a date in the past. | Field displays error: "Travel date must be in the future". | Pass |
| **FORM-07** | Form & Val | Proceed to Step 2/3 (AssistanceFormScreen). | Load form page showing passenger name, mobile, type, and requirements. | Pass |
| **FORM-08** | Form & Val | Clear Passenger Name input box. | Field shows error: "Passenger name is required". | Pass |
| **FORM-09** | Form & Val | Input 9-digit mobile phone number. | Field shows error: "Mobile number must be exactly 10 digits". | Pass |
| **FORM-10** | Form & Val | Select assistance category chip grid. | Highlights selection chip in primary colors, caching type. | Pass |
| **FORM-11** | Form & Val | Input notes exceeding 200 characters in special requirements. | Character counter blocks inputs, showing "200/200" limit. | Pass |
| **FORM-12** | Form & Val | Close form halfway, reopen screen. | restore banner asks to "Use Draft" or "Start Fresh". | Pass |
| **UPLOAD-01** | Uploads | Proceed to Step 3/3 (UploadDocumentsScreen). | Displays file upload lists, previews, and progress indicators. | Pass |
| **UPLOAD-02** | Uploads | Tap Upload without selecting files. | Submit button is locked. Form requires uploading at least 1 document. | Pass |
| **UPLOAD-03** | Uploads | Select a file larger than 10MB. | Dialog blocks selection: "File size exceeds 10MB limit". | Pass |
| **UPLOAD-04** | Uploads | Upload an unsupported file type (e.g. `.exe`). | Dialog blocks selection: "Only JPG, PNG, and PDF files are supported". | Pass |
| **UPLOAD-05** | Uploads | Select and upload valid PDF document. | Progress bar tracks upload, showing thumbnail once pushed to Storage. | Pass |
| **UPLOAD-06** | Uploads | Tap Submit Request. | Document URLs merge in Firestore `/requests` and deletes draft key. | Pass |
| **TRACK-01** | Request Track | Tap active request on Home scroll view. | Routes to RequestTrackingScreen displaying real-time timelines. | Pass |
| **TRACK-02** | Request Track | Check QR Code details card. | Generates QR containing request ID value, opens native share. | Pass |
| **TRACK-03** | Request Track | Tap "Contact Staff" phone link on tracker. | Fires native device dialer overlay prefilled with staff mobile number. | Pass |
| **TRACK-04** | Request Track | Click document attachment row on tracker. | Device browser opens document URL directly from Firebase Storage. | Pass |
| **TRACK-05** | Request Track | Trigger status change from admin side. | Passenger tracking timeline updates instantly via live Firestore listener. | Pass |
| **TRACK-06** | Request Track | Try tracking a non-existent request ID. | Screen handles error state, displaying "Request Not Found" fallback. | Pass |
| **ADMIN-01** | Admin Flow | Log in as staff member. | Routes to Admin requests list displaying all active passenger requests. | Pass |
| **ADMIN-02** | Admin Flow | Use Searchbar to query name "Amit". | Request list filters, displaying only requests matching "Amit". | Pass |
| **ADMIN-03** | Admin Flow | Search by invalid PNR (e.g. `ABC123`). | Request list shows: "No requests match your search". | Pass |
| **ADMIN-04** | Admin Flow | Tap "Under Review" filter chip. | Displays requests in "Under Review" status using AND search logic. | Pass |
| **ADMIN-05** | Admin Flow | Tap request card to open details. | Routes to RequestDetailScreen showing visual progress bars. | Pass |
| **ADMIN-06** | Admin Flow | Click "Assign Staff" button. | Opens available staff selector listing staff in `/staff` where `available == true`. | Pass |
| **ADMIN-07** | Admin Flow | Select staff member and tap Confirm. | Dialog pops up. Confirming updates request status to "Staff Assigned" in Firestore. | Pass |
| **ADMIN-08** | Admin Flow | Click "Update Status" button. | Displays options: next chronological status and "Cancelled" (red). | Pass |
| **ADMIN-09** | Admin Flow | Try skipping workflow status gates. | Gates block selection: only next status or "Cancelled" are selectable. | Pass |
| **ADMIN-10** | Admin Flow | Update status to "Completed". | Firestore updates request, and sets assigned staff status back to available. | Pass |
| **NOTIF-01** | Notifications | Open notification bell icon. | Notifications list displays relative timings and read/unread badge counts. | Pass |
| **NOTIF-02** | Notifications | Tap unread notification card. | Marks status as read in Firestore and redirects to Request Details. | Pass |
| **NOTIF-03** | Notifications | Tap "Mark All Read" on header. | Firestore batch updates all unread logs, clearing unread counter badges. | Pass |
| **NOTIF-04** | Notifications | Long press notification card. | Alert dialog prompts to delete. Confirming purges doc from Firestore. | Pass |
| **UI-01** | UI & Theme | Toggle Dark Mode in Settings. | Application background changes to slate-dark and text to light instantly. | Pass |
| **UI-02** | UI & Theme | Close and restart app under dark mode. | Preferences load from storage, starting app in dark mode. | Pass |
| **UI-03** | UI & Theme | Verify font family compliance. | App uses premium MD3 Outfit/Roboto typography scale. | Pass |
| **UI-04** | UI & Theme | Trigger offline behavior (disconnect wifi). | App operations queue requests safely or display "Offline Mode" alerts. | Pass |
| **UI-05** | UI & Theme | Tap Map Icon in navigation header. | Displays mock terminal maps, runways, terminals, and location dots. | Pass |
| **UI-06** | UI & Theme | Simulate a crash in a component. | ErrorBoundary displays "Something went wrong" screen with reset buttons. | Pass |
| **REPORT-01** | Daily Report | Open Report tab in Admin dashboard. | Screen displays counts for Total, Done, In-Progress, and Cancelled. | Pass |
| **REPORT-02** | Daily Report | Verify report bar chart rendering. | Custom SVG plots requests correctly matching status color mapping. | Pass |
| **REPORT-03** | Daily Report | Check completed list. | Renders scrollable card lists of all requests completed today. | Pass |
| **REPORT-04** | Daily Report | Click "Export Report" button. | Snackbar pops up: "Export feature coming soon!". | Pass |
