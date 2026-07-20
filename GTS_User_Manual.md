# GTS – GARMENT SAMPLE TRACKER
## USER MANUAL

**Track Every Garment. Every Step.**

---

## DOCUMENT INFORMATION

| Item | Details |
|------|---------|
| **Application Name** | GTS – Garment Sample Tracker |
| **Version** | 1.0 |
| **Document Date** | May 2026 |
| **Prepared For** | Factory Managers, Merchandisers, QA Teams, Production Staff |
| **Platform** | Mobile Application (Android/iOS) |

---

## TABLE OF CONTENTS

1. Introduction
2. System Overview
3. User Roles & Access Levels
4. Getting Started
   - 4.1 Login
   - 4.2 Password Reset
5. Admin Dashboard
6. Sample Management
   - 6.1 View Samples
   - 6.2 Create New Sample
   - 6.3 Edit Sample
   - 6.4 Import Samples (Bulk)
   - 6.5 Generate Barcode Labels
7. Employee Management
   - 7.1 View Employees
   - 7.2 Add New Employee
   - 7.3 Edit Employee
8. Sample Transfer Workflow
   - 8.1 Initiate Transfer
   - 8.2 Barcode Scanning
9. Employee Workspace
   - 9.1 Pending Transfers
   - 9.2 Accept Transfer (Scan Verification)
   - 9.3 Manual Accept
   - 9.4 Reject Transfer
10. Live Tracking
11. Sample Timeline & History
12. Notifications
13. Reports & Export
14. Troubleshooting
15. FAQ
16. Support Information

---


## 1. INTRODUCTION

### 1.1 About GTS

GTS (Garment Sample Tracker) is a mobile-first application designed to digitize and streamline the tracking of garment samples across departments and employees in manufacturing facilities. The system replaces manual register-based tracking with real-time digital workflows, ensuring complete accountability and traceability.

### 1.2 Key Features

- **Real-Time Tracking**: Monitor sample location and status instantly
- **Verified Handovers**: Two-step barcode verification prevents fraudulent transfers
- **Role-Based Access**: Separate interfaces for Admins and Employees
- **Complete Audit Trail**: Full movement history with timestamps
- **Barcode Integration**: Generate and scan Code128 barcodes
- **Bulk Operations**: Import multiple samples via Excel
- **Email Reports**: Export data and send via email

### 1.3 Benefits

✓ Eliminate manual paperwork  
✓ Prevent sample loss  
✓ Instant accountability  
✓ Reduce handover disputes  
✓ Complete transparency  
✓ Faster sample movement  

---

## 2. SYSTEM OVERVIEW

### 2.1 Architecture

The GTS application consists of:

- **Mobile App**: React Native application for Android/iOS
- **Backend Server**: Node.js API server
- **Database**: MariaDB/MySQL for data storage
- **Firebase**: Authentication and notifications

### 2.2 Workflow Overview

```
Create Sample
    ↓
Assign to Employee
    ↓
Transfer Sample (Pending Status)
    ↓
Employee Scans Barcode
    ↓
Transfer Accepted (Verified)
    ↓
Track Sample Movement
```

---

## 3. USER ROLES & ACCESS LEVELS

### 3.1 Admin Role

**Access Rights:**
- ✅ Dashboard with global statistics
- ✅ Create, edit, and manage samples
- ✅ Create, edit, and manage employees
- ✅ Initiate sample transfers
- ✅ View live tracking
- ✅ Access complete audit trails
- ✅ Generate and email reports

**Navigation Tabs:**
① Home (Dashboard)  
② Samples  
③ Transfers  
④ Tracking  
⑤ Employees  

### 3.2 Employee Role

**Access Rights:**
- ✅ Personal workspace (inbox)
- ✅ Accept/reject incoming transfers
- ✅ Initiate sample transfers
- ✅ View samples in possession
- ✅ View live tracking
- ✅ Access sample timelines

**Navigation Tabs:**
① Home (Workspace)  
② Transfers  
③ Tracking  

---


## 4. GETTING STARTED

### 4.1 Login Screen

**Figure 4.1 – Login Screen**  
*[Insert loginpage.jpeg Screenshot Here]*

**Screen Components:**

① **GTS Logo**: Application branding  
② **Work Email Field**: Enter your company email  
③ **Password Field**: Enter your password  
④ **Show/Hide Password**: Toggle password visibility  
⑤ **Forgot Password Link**: Reset password option  
⑥ **Sign In Button**: Submit credentials  
⑦ **How to Get Access**: Information for new users  

**Purpose:**  
Secure authentication to access the GTS system using Firebase-based login.

**Procedure:**

**Step 1:** Open the GTS application on your mobile device.

**Step 2:** Enter your work email address in the "Work Email" field.  
*Example: rahul@company.com*

**Step 3:** Enter your password in the "Password" field.

**Step 4:** (Optional) Tap the eye icon to show/hide your password.

**Step 5:** Tap the **Sign In** button.

**Expected Result:**  
- Successful login redirects you to your role-specific home screen
- Admin users see the Dashboard
- Employee users see their Workspace

**Notes:**
- Default password for new employees is `1234`
- Passwords are case-sensitive
- Contact your Admin if you don't have login credentials

---

### 4.2 Password Reset

**Figure 4.2 – Password Reset Modal**  
*[Insert resetpage.jpeg Screenshot Here]*

**Purpose:**  
Allow users to reset forgotten passwords via email link.

**Procedure:**

**Step 1:** On the Login screen, tap **"Forgot Password?"**

**Step 2:** A modal will appear titled "Reset Password".

**Step 3:** Enter your work email address.

**Step 4:** Tap **"Send Reset Link"**.

**Step 5:** Check your email inbox for the password reset link.

**Step 6:** Click the link in the email and follow instructions to set a new password.

**Expected Result:**  
You receive an email with subject "Password Reset Request" containing a secure link to reset your password.

**Troubleshooting:**
- If email doesn't arrive within 5 minutes, check your spam folder
- Ensure you entered the correct email address
- Contact IT support if issues persist

---


## 5. ADMIN DASHBOARD

**Figure 5.1 – Admin Dashboard**  
*[Insert admindashbaord.jpeg Screenshot Here]*

**Screen Components:**

① **Welcome Header**: Displays admin name and role  
② **Notification Bell**: Shows unread notification count  
③ **Logout Button**: Sign out of the application  
④ **Total Samples**: Count of all samples in system  
⑤ **Total Employees**: Count of registered employees  
⑥ **In Transit**: Samples currently being transferred  
⑦ **QA Pending**: Samples awaiting quality approval  
⑧ **Email Report Button**: Send daily report via email  
⑨ **Email Excel Button**: Export and email Excel report  
⑩ **Quick Actions**: Shortcuts to common tasks  
⑪ **Recent Samples**: Last 3 samples with details  

**Purpose:**  
Provides administrators with a high-level overview of system activity and quick access to key functions.

**Understanding the Statistics:**

**Total Samples**  
- Shows the complete count of samples in the database
- Tap to navigate to the Samples module

**Total Employees**  
- Shows the number of registered staff members
- Tap to navigate to the Employee Master

**In Transit**  
- Samples with "In Production" status
- Indicates active movement in the production floor

**QA Pending**  
- Samples awaiting quality inspection
- Requires immediate attention from QA team

**Quick Actions:**

**New Sample**  
Tap to create a new sample entry

**Add Staff**  
Tap to register a new employee

**Handover**  
Tap to initiate a sample transfer

**Track**  
Tap to view live tracking of all samples

**Email Reports:**

**Email Report**  
- Sends a formatted daily report to your email
- Contains summary of all samples and their current status

**Email Excel**  
- Generates a CSV file with complete sample data
- Emails the file as an attachment
- Can be opened in Excel or Google Sheets

**Recent Samples Section:**

Displays the 3 most recently created samples with:
- Sample name and style number
- Brand/developed for
- Current status badge
- Current holder name
- Department location

Tap any sample card to view its complete timeline.

---


## 6. SAMPLE MANAGEMENT

### 6.1 View Samples

**Figure 6.1 – Samples Page**  
*[Insert samplespage.jpeg Screenshot Here]*

**Screen Components:**

① **Page Header**: "Samples" title with count  
② **Import Button**: Bulk import from Excel  
③ **New Button**: Create new sample  
④ **Search Bar**: Search by name or style number  
⑤ **Table Header**: Column labels (#, Sample, Brand, Label, Edit)  
⑥ **Sample Rows**: List of all samples  
⑦ **Label Button**: Generate barcode label  
⑧ **Edit Icon**: Modify sample details  

**Purpose:**  
Central repository to view, search, and manage all garment samples in the system.

**Procedure:**

**Step 1:** From the Dashboard, tap the **Samples** tab in the bottom navigation.

**Step 2:** The Samples page displays all samples in a scrollable table format.

**Step 3:** Use the search bar to filter samples by:
- Sample name
- Style number

**Step 4:** Tap any row to view more details or tap the edit icon to modify.

**Expected Result:**  
A complete list of samples with their style numbers and brands is displayed.

---

### 6.2 Create New Sample

**Figure 6.2 – New Sample Form**  
*[Insert editsample.jpeg Screenshot Here]*

**Purpose:**  
Add a new garment sample to the tracking system.

**Procedure:**

**Step 1:** On the Samples page, tap the **New** button (top right).

**Step 2:** A modal form appears titled "New Sample".

**Step 3:** Fill in the required fields:

**Sample Name** (Required)  
Enter a descriptive name for the garment.  
*Example: Ocean Blue Denim Jacket*

**Style Number** (Required)  
Enter the unique style/SKU code.  
*Example: DN-2024-BLU*  
*Note: This will be encoded in the barcode*

**Developed For (Brand)** (Optional)  
Enter the brand or client name.  
*Example: Zara*  
*Tip: Start typing to see suggestions from existing brands*

**Step 4:** As you type the style number, a barcode preview appears at the bottom of the form.

**Step 5:** Tap **"Add Sample & Generate Barcode"**.

**Expected Result:**  
- Sample is created successfully
- A barcode label modal appears automatically
- You can download/print the label immediately

**Notes:**
- Style numbers must be unique
- The barcode preview uses Code128 format
- Brand suggestions help maintain consistency

---

### 6.3 Edit Sample

**Purpose:**  
Modify existing sample details.

**Procedure:**

**Step 1:** On the Samples page, tap the **edit icon** (pencil) next to any sample.

**Step 2:** The edit modal appears with pre-filled data.

**Step 3:** Modify any field as needed.

**Step 4:** Tap **"Update Sample"**.

**Expected Result:**  
Sample details are updated in the database.

**Warning:**  
Changing the style number will affect barcode scanning. Ensure physical labels are updated accordingly.

---


### 6.4 Import Samples (Bulk)

**Purpose:**  
Import multiple samples at once from an Excel file.

**Procedure:**

**Step 1:** Prepare an Excel file (.xlsx or .xls) with the following columns:

| Sample Name | Style Number | Developed For |
|-------------|--------------|---------------|
| Ocean Blue | DN-2024-BLU | Zara |
| Midnight Bloom | MB-2024-001 | H&M |

**Step 2:** On the Samples page, tap the **Import** button.

**Step 3:** Select your Excel file from your device.

**Step 4:** The system reads the file and shows a confirmation:  
*"Found 25 samples. Import them all?"*

**Step 5:** Tap **Import** to proceed.

**Expected Result:**  
- System imports all valid samples
- Shows summary: "Imported: 23, Skipped (Duplicates): 2"
- Duplicate style numbers are automatically skipped

**Excel File Requirements:**
- Column headers must match exactly: `Sample Name`, `Style Number`, `Developed For`
- Style Number is mandatory
- Sample Name is mandatory
- Developed For is optional

**Tips:**
- Download a sample template from your admin
- Ensure no duplicate style numbers in your file
- Remove any empty rows

---

### 6.5 Generate Barcode Labels

**Figure 6.3 – Barcode Label**  
*[Insert sampleslabel_barcode.jpeg Screenshot Here]*

**Label Components:**

① **Brand Header**: "GTS — Garment Tracker"  
② **Sample Name**: Large, bold text  
③ **Developed For**: Brand/client name  
④ **Barcode**: Code128 barcode graphic  
⑤ **Style Number**: Human-readable text below barcode  

**Purpose:**  
Generate printable barcode labels for physical garment tags.

**Procedure (Single Label):**

**Step 1:** On the Samples page, tap the **Label** button next to any sample.

**Step 2:** A preview modal appears showing the label design.

**Step 3:** Tap **"Download / Print Label"**.

**Step 4:** On Android:
- Choose a folder to save the PDF
- Label is saved as `Label_[StyleNumber].pdf`

**Step 5:** On iOS:
- Share sheet appears
- Choose "Save to Files" or "Print"

**Expected Result:**  
A professional PDF label is generated and saved/shared.

**Procedure (Bulk Labels):**

**Step 1:** On the Samples page, **long-press** any sample row.

**Step 2:** Selection mode activates with checkboxes.

**Step 3:** Tap multiple samples to select them.

**Step 4:** Tap **"Generate PDF"** button at the top.

**Step 5:** A multi-page PDF is created with one label per page.

**Expected Result:**  
All selected labels are combined into a single PDF file for batch printing.

**Printing Tips:**
- Use adhesive label paper (2" x 3" recommended)
- Print at 100% scale (no fit-to-page)
- Use a laser printer for durability
- Laminate labels for long-term use

---


## 7. EMPLOYEE MANAGEMENT

### 7.1 View Employees

**Figure 7.1 – Employees Page**  
*[Insert employeespage.jpeg Screenshot Here]*

**Screen Components:**

① **Page Header**: "Employees" title with count  
② **New Button**: Add new employee  
③ **Search Bar**: Search by name or department  
④ **Filter Icon**: Filter by department  
⑤ **Table Header**: Column labels (#, Name, Dept, Role)  
⑥ **Employee Rows**: List of all staff  
⑦ **Role Badge**: Shows "Admin" or "Employee"  
⑧ **Edit Icon**: Modify employee details  

**Purpose:**  
Manage employee master data and login accounts.

**Procedure:**

**Step 1:** From the Dashboard, tap the **Employees** tab.

**Step 2:** View the complete list of registered employees.

**Step 3:** Use the search bar to find specific employees by:
- Name
- Department

**Step 4:** Tap the **filter icon** to filter by department:
- All
- Production
- QA
- Merchandising
- Sampling
- (Other departments)

**Step 5:** Tap any employee row to view/edit details.

**Expected Result:**  
A filterable, searchable list of all employees is displayed.

---

### 7.2 Add New Employee

**Figure 7.2 – New Employee Form**  
*[Insert editemployee.jpeg Screenshot Here]*

**Purpose:**  
Register a new employee and create their login account.

**Procedure:**

**Step 1:** On the Employees page, tap the **New** button.

**Step 2:** Fill in the employee details:

**Full Name** (Required)  
*Example: Rahul Sharma*

**Department** (Required)  
*Example: Production*

**Designation** (Optional)  
*Example: Floor Supervisor*

**Phone Number** (Optional)  
*Example: 9876543210*

**Work Email** (Required)  
*Example: rahul@company.com*  
*Note: This will be used for login*

**Password** (Optional)  
*Leave blank to use default password: 1234*

**Enable Email Reports** (Toggle)  
*Turn ON to allow this employee to receive email reports*

**Step 3:** Tap **"Add Employee"**.

**Expected Result:**  
- Employee is added to the database
- A Firebase authentication account is automatically created
- Employee can now log in using their email and password

**Important Notes:**
- Email addresses must be unique
- Default password is `1234` if not specified
- Employees should change their password after first login
- Email reports are optional and can be enabled per employee

---

### 7.3 Edit Employee

**Purpose:**  
Update employee information or view samples in their possession.

**Procedure:**

**Step 1:** On the Employees page, tap any employee row.

**Step 2:** The edit modal appears with:
- Pre-filled employee details
- **"Holding X Sample(s)"** section showing current samples
- Email report toggle
- **Delete Employee** button (Admin only)

**Step 3:** Modify any field as needed.

**Step 4:** Tap **"Update Employee"**.

**Expected Result:**  
Employee details are updated.

**Viewing Employee Samples:**

The edit modal shows all samples currently held by this employee:
- Sample name
- Style number and brand
- Current status

This helps admins quickly see workload distribution.

**Deleting an Employee:**

**Warning:** This action is permanent and will:
- Remove the employee from the database
- Delete their Firebase login account
- Set their samples' holder to "Unassigned"

**Step 1:** Scroll to the bottom of the edit modal.

**Step 2:** Tap the red **"Delete Employee"** button.

**Step 3:** Confirm the deletion in the alert dialog.

**Expected Result:**  
Employee is permanently removed from the system.

---


## 8. SAMPLE TRANSFER WORKFLOW

### 8.1 Initiate Transfer

**Figure 8.1 – Handover Screen**  
*[Insert Employeeshandover.jpeg Screenshot Here]*

**Screen Components:**

① **Select Sample**: Search and choose sample  
② **Scan Button**: Quick barcode scan to select sample  
③ **Current Holder Info**: Shows who currently has the sample  
④ **Transfer To**: Search and choose recipient employee  
⑤ **Department**: Auto-filled from selected employee  
⑥ **Remarks**: Optional notes about the transfer  
⑦ **Complete Transfer Button**: Submit the transfer request  

**Purpose:**  
Initiate a sample handover from one employee to another with pending verification.

**Procedure:**

**Step 1:** Navigate to the **Transfers** tab.

**Step 2:** Tap the **"Select Sample"** field.

**Step 3:** A searchable modal appears. Type to filter samples by:
- Sample name
- Style number

**Alternative:** Tap the **Scan** button to scan a barcode and auto-select the sample.

**Step 4:** Select the sample from the list.

**Step 5:** The "Current Holder" information appears, showing:
- Who currently has the sample
- Their department

**Step 6:** Tap the **"Transfer To"** field.

**Step 7:** Search and select the recipient employee.

**Step 8:** The **Department** field auto-fills with the recipient's department.

**Step 9:** (Optional) Enter remarks in the **Remarks** field.  
*Example: "Sent for quality review"*

**Step 10:** Tap **"Complete Transfer"**.

**Expected Result:**  
- Transfer is created with status **"Pending"**
- Sample remains with the sender until accepted
- Recipient sees the transfer in their Workspace inbox
- A notification is sent to the recipient

**Important Notes:**
- The sample does NOT change ownership until the recipient accepts
- Transfers can be cancelled by the sender while pending
- Barcode scanning speeds up sample selection

---

### 8.2 Barcode Scanning

**Purpose:**  
Quickly locate samples by scanning their barcode tags.

**Procedure:**

**Step 1:** On the Handover screen, tap the **Scan** button.

**Step 2:** Camera permission prompt appears (first time only). Tap **"Grant Permission"**.

**Step 3:** Point your camera at the barcode on the garment tag.

**Step 4:** The app automatically detects and reads the barcode.

**Step 5:** If a matching sample is found:
- You are redirected back to the Handover screen
- The sample is pre-selected

**Step 6:** If no match is found:
- Alert shows: "No sample found for barcode: [value]"
- Tap "Scan Again" to retry

**Expected Result:**  
Sample is instantly selected without manual searching.

**Supported Barcode Formats:**
- QR Code
- EAN-13, EAN-8
- Code128, Code39, Code93
- UPC-A, UPC-E
- ITF14, Codabar

**Scanning Tips:**
- Ensure good lighting
- Hold camera steady 6-12 inches from barcode
- Align barcode within the scan frame
- Clean the barcode if dirty or damaged

---


## 9. EMPLOYEE WORKSPACE

### 9.1 Employee Dashboard

**Figure 9.1 – Employee Workspace**  
*[Insert employeedashboard.jpeg Screenshot Here]*

**Screen Components:**

① **Welcome Header**: Employee name and designation  
② **Notification Bell**: Unread notifications count  
③ **Logout Button**: Sign out  
④ **My Samples Count**: Total samples in possession  
⑤ **Pending Count**: Transfers awaiting acceptance  
⑥ **Email Excel Button**: Export report (if enabled)  
⑦ **Pending Acceptance Section**: Incoming transfer requests  
⑧ **My Samples Section**: Samples currently held  

**Purpose:**  
Personal workspace for employees to manage incoming transfers and view their samples.

**Understanding the Statistics:**

**My Samples**  
Shows the number of samples currently in your possession.

**Pending**  
Shows the number of transfers awaiting your acceptance.  
*Red color indicates urgent action required.*

---

### 9.2 Pending Transfers

**Screen Components (Per Transfer Card):**

① **Sample Icon**: Visual indicator  
② **Sample Name**: Name of the garment  
③ **Style Number & Brand**: Identification details  
④ **"PENDING" Badge**: Status indicator  
⑤ **From**: Sender's name  
⑥ **Department**: Destination department  
⑦ **Remarks**: Transfer notes (if any)  
⑧ **Reject Button**: Decline the transfer  
⑨ **Manual Button**: Accept without scanning  
⑩ **Scan Button**: Accept with barcode verification  

**Purpose:**  
Review and respond to incoming sample transfer requests.

**Procedure:**

**Step 1:** Log in as an Employee.

**Step 2:** Your Workspace displays all pending transfers at the top.

**Step 3:** Review each transfer card:
- Check the sample name and style number
- See who sent it
- Read any remarks

**Step 4:** Choose an action:
- **Scan**: Verify with barcode (recommended)
- **Manual**: Accept without scanning
- **Reject**: Decline the transfer

---

### 9.3 Accept Transfer (Scan Verification)

**Purpose:**  
Accept a transfer by scanning the physical garment's barcode to prove possession.

**Procedure:**

**Step 1:** On a pending transfer card, tap the **Scan** button.

**Step 2:** The camera opens with a verification screen.

**Step 3:** An info banner shows:  
*"Scan the barcode on [Sample Name] to prove you have the garment"*

**Step 4:** Point your camera at the barcode on the physical garment tag.

**Step 5:** The system compares the scanned barcode with the expected style number.

**If Match:**
- ✅ Transfer is accepted
- Sample ownership transfers to you
- Alert shows: "✓ Verified & Accepted"
- Timestamp is recorded

**If Mismatch:**
- ❌ Alert shows: "Barcode Mismatch"
- Details: "Scanned [X] but expected [Y]"
- Transfer remains pending
- You can try again

**Expected Result:**  
Sample is officially transferred to you with verified proof of possession.

**Why Scan Verification?**  
This prevents fraudulent transfers. An employee cannot claim they received a garment without physically scanning its barcode tag. Every acceptance is timestamped and verifiable in the audit trail.

---

### 9.4 Manual Accept

**Purpose:**  
Accept a transfer without barcode scanning (use only when garment has no barcode).

**Procedure:**

**Step 1:** On a pending transfer card, tap the **Manual** button.

**Step 2:** A confirmation alert appears:  
*"Accept [Sample Name] without scanning? Use this only when the garment has no barcode."*

**Step 3:** Tap **Accept** to confirm.

**Expected Result:**  
Transfer is accepted without barcode verification.

**Warning:**  
Manual acceptance bypasses the verification step. Use only when:
- The garment has no barcode label
- The barcode is damaged or unreadable
- You have physically received the garment

---

### 9.5 Reject Transfer

**Purpose:**  
Decline a transfer if you did not receive the physical garment.

**Procedure:**

**Step 1:** On a pending transfer card, tap the **Reject** button.

**Step 2:** A modal appears titled "Reject Transfer".

**Step 3:** (Optional) Enter a reason in the **Reason** field.  
*Example: "Not the correct sample" or "Never received the garment"*

**Step 4:** Tap **"Confirm Reject"**.

**Expected Result:**  
- Transfer status changes to "Rejected"
- Sample remains with the original sender
- Rejection reason is logged in the timeline
- Sender is notified

**When to Reject:**
- You did not receive the physical garment
- Wrong sample was sent
- Sample is damaged
- Any discrepancy in the transfer

---


## 10. LIVE TRACKING

**Figure 10.1 – Live Tracking Screen**  
*[Insert trackingpage.jpeg and livetrackingpage.jpeg Screenshots Here]*

**Screen Components:**

① **Page Header**: "Live Tracking" with sample count  
② **Scan Button**: Quick barcode search  
③ **Search Bar**: Multi-field search  
④ **Filter Chips**: Status filters  
⑤ **Table Header**: Column labels  
⑥ **Sample Rows**: Real-time sample data  
⑦ **Status Dot**: Color-coded status indicator  
⑧ **Chevron Icon**: Tap to view timeline  

**Purpose:**  
Monitor the real-time location and status of all samples in the system.

**Procedure:**

**Step 1:** Tap the **Tracking** tab from the bottom navigation.

**Step 2:** The Live Tracking screen displays all samples in a table format.

**Step 3:** Use the **search bar** to filter by:
- Sample name
- Style number
- Current holder name
- Department

**Step 4:** Use **filter chips** to show only specific statuses:
- All
- In Development
- In Production
- QA Pending
- Approved
- Dispatched

**Step 5:** Tap any row to view the complete timeline for that sample.

**Expected Result:**  
A real-time view of all samples with their current holders and statuses.

**Status Indicators:**

| Status | Color | Meaning |
|--------|-------|---------|
| In Development | Gray | Sample being created |
| In Production | Blue | Active on production floor |
| QA Pending | Yellow | Awaiting quality check |
| Approved | Green | Passed quality inspection |
| Dispatched | Purple | Sent to client |

**Quick Barcode Search:**

**Step 1:** Tap the **Scan** button (top right).

**Step 2:** Scan any garment barcode.

**Step 3:** If found, you are instantly taken to that sample's timeline.

**Expected Result:**  
Instant access to sample details without manual searching.

---

## 11. SAMPLE TIMELINE & HISTORY

**Figure 11.1 – Sample Timeline**  
*[Insert sampletracking.jpeg Screenshot Here]*

**Screen Components:**

① **Back Button**: Return to previous screen  
② **Sample Details Card**: Master data  
③ **Current Holder Card**: Who has it now  
④ **Transfer Button**: Quick handover  
⑤ **Movement History**: Complete audit trail  
⑥ **Timeline Dots**: Visual movement indicator  
⑦ **Transfer Status Badges**: Verified/Pending/Rejected  
⑧ **Timestamps**: Sent and accepted times  
⑨ **Cancel Transfer Button**: For pending transfers  

**Purpose:**  
View the complete movement history of a sample with verification status.

**Procedure:**

**Step 1:** From Live Tracking or Dashboard, tap any sample.

**Step 2:** The Timeline screen opens showing:

**Sample Information:**
- Sample name
- Style number
- Developed for (brand)
- Current status

**Current Holder:**
- Employee name
- Department
- Quick "Transfer" button

**Movement History:**
- Every handover event in chronological order
- Most recent at the top

**Step 3:** Review each timeline entry:

**For Each Transfer:**
- **From → To**: Sender and receiver names
- **Department**: Destination department
- **Remarks**: Transfer notes
- **Status Badge**:
  - ✓ Verified (green): Accepted with barcode scan
  - ⏳ Pending (yellow): Awaiting acceptance
  - ✗ Rejected (red): Declined by receiver
  - 🚫 Cancelled (red): Cancelled by sender
- **Sent**: Date and time transfer was initiated
- **Accepted**: Date and time transfer was verified (if accepted)

**Step 4:** Tap the **Transfer** button to initiate a new handover.

**Expected Result:**  
Complete transparency of sample movement with verification proof.

**Cancelling a Pending Transfer:**

If you initiated a transfer that is still pending:

**Step 1:** Locate the pending transfer in the timeline (yellow badge).

**Step 2:** Tap the **"Cancel Transfer"** button below it.

**Step 3:** Confirm the cancellation.

**Expected Result:**  
- Transfer status changes to "Cancelled"
- Sample remains with you
- Recipient's inbox is updated

---


## 12. NOTIFICATIONS

**Purpose:**  
Receive real-time alerts about sample transfers and system events.

**Notification Types:**

**Transfer Received**  
When someone sends you a sample transfer.  
*"You have a new transfer: [Sample Name]"*

**Transfer Accepted**  
When someone accepts your transfer.  
*"[Employee Name] accepted [Sample Name]"*

**Transfer Rejected**  
When someone rejects your transfer.  
*"[Employee Name] rejected [Sample Name]"*

**Transfer Cancelled**  
When a sender cancels a pending transfer.  
*"Transfer of [Sample Name] was cancelled"*

**Accessing Notifications:**

**Step 1:** Tap the **bell icon** in the top right of your Dashboard/Workspace.

**Step 2:** The Notifications screen opens showing all recent alerts.

**Step 3:** Unread notifications are highlighted.

**Step 4:** Tap any notification to view details or navigate to the relevant screen.

**Expected Result:**  
Stay informed about all sample movements involving you.

---

## 13. REPORTS & EXPORT

### 13.1 Email Daily Report

**Purpose:**  
Send a formatted summary report via email.

**Procedure:**

**Step 1:** On the Admin Dashboard, tap **"Email Report"**.

**Step 2:** A confirmation alert shows:  
*"Sending to [your-email@company.com]"*

**Step 3:** The system generates and emails the report.

**Expected Result:**  
You receive an email with:
- Summary of all samples
- Current holders
- Status breakdown
- Formatted for easy reading

---

### 13.2 Email Excel Report

**Purpose:**  
Export complete sample data as a CSV file and email it.

**Procedure:**

**Step 1:** On the Dashboard, tap **"Email Excel"**.

**Step 2:** Alert shows: *"Generating Excel... Fetching samples for export..."*

**Step 3:** The system creates a CSV file with columns:
- Sample Name
- Style Number
- Brand
- Status
- Current Holder
- Department
- Created Date

**Step 4:** The file is emailed to your registered email address.

**Expected Result:**  
You receive an email with a CSV attachment that can be opened in:
- Microsoft Excel
- Google Sheets
- Any spreadsheet application

**Use Cases:**
- Monthly reporting
- Data analysis
- Backup records
- Sharing with management

---


## 14. TROUBLESHOOTING

### 14.1 Login Issues

**Problem:** Cannot log in with email and password

**Solutions:**
1. Verify you are using your work email (not personal email)
2. Check that Caps Lock is off (passwords are case-sensitive)
3. Try the "Forgot Password" option to reset
4. Ensure you have an active internet connection
5. Contact your Admin to verify your account exists

---

**Problem:** "Invalid email or password" error

**Solutions:**
1. Double-check your email address for typos
2. If you're a new employee, ask Admin if your account was created
3. Use the password reset feature
4. Default password for new accounts is `1234`

---

### 14.2 Barcode Scanning Issues

**Problem:** Camera not opening or "Permission Denied"

**Solutions:**
1. Go to your phone's Settings → Apps → GTS → Permissions
2. Enable Camera permission
3. Restart the app
4. If still not working, reinstall the app

---

**Problem:** Barcode not scanning or "Not Found" error

**Solutions:**
1. Ensure good lighting conditions
2. Clean the barcode label if dirty
3. Hold camera 6-12 inches from the barcode
4. Try different angles
5. Verify the barcode matches the style number in the system
6. If barcode is damaged, use Manual Accept option

---

### 14.3 Transfer Issues

**Problem:** Transfer stuck in "Pending" status

**Solutions:**
1. Contact the recipient to accept the transfer
2. Check if recipient has the app installed and logged in
3. Verify recipient received the notification
4. If urgent, recipient can use Manual Accept
5. Sender can cancel and resend the transfer

---

**Problem:** Cannot accept transfer - "Barcode Mismatch"

**Solutions:**
1. Verify you are scanning the correct garment
2. Check if the physical tag matches the expected style number
3. If barcode is wrong, contact Admin to update the sample
4. Use Manual Accept if you have the correct garment but wrong barcode

---

### 14.4 App Performance Issues

**Problem:** App is slow or freezing

**Solutions:**
1. Close and restart the app
2. Clear app cache: Settings → Apps → GTS → Clear Cache
3. Ensure you have a stable internet connection
4. Update to the latest app version
5. Restart your phone

---

**Problem:** Data not refreshing or outdated

**Solutions:**
1. Pull down on any list screen to refresh
2. Log out and log back in
3. Check your internet connection
4. Contact IT support if issue persists

---

### 14.5 Email Report Issues

**Problem:** Not receiving email reports

**Solutions:**
1. Check your spam/junk folder
2. Verify your email address is correct in your profile
3. Ask Admin to enable "Email Reports" for your account
4. Check if your email server is blocking automated emails
5. Contact IT support to whitelist the GTS email sender

---


## 15. FREQUENTLY ASKED QUESTIONS (FAQ)

### General Questions

**Q1: What is GTS?**  
A: GTS (Garment Sample Tracker) is a mobile application that digitally tracks the movement of garment samples across employees and departments in manufacturing facilities.

**Q2: Do I need internet to use GTS?**  
A: Yes, GTS requires an active internet connection to sync data in real-time.

**Q3: Is my data secure?**  
A: Yes, GTS uses Firebase authentication and encrypted connections. Only authorized users can access the system.

**Q4: Can I use GTS on both Android and iOS?**  
A: Yes, GTS is available for both Android and iOS devices.

---

### Account & Login

**Q5: How do I get a GTS account?**  
A: Contact your Admin or HR department. They will create an account for you and provide your login credentials.

**Q6: What is the default password?**  
A: The default password for new accounts is `1234`. You should change it after your first login.

**Q7: I forgot my password. What should I do?**  
A: On the login screen, tap "Forgot Password?" and follow the instructions to reset via email.

**Q8: Can I change my email address?**  
A: Contact your Admin to update your email address in the system.

---

### Sample Management

**Q9: Who can create samples?**  
A: Only Admin users can create, edit, and delete samples.

**Q10: Can I create samples without barcodes?**  
A: Yes, but barcodes are highly recommended for verification. You can still use Manual Accept for transfers.

**Q11: What happens if I enter a duplicate style number?**  
A: The system will reject it. Style numbers must be unique across all samples.

**Q12: Can I edit a sample after creating it?**  
A: Yes, Admins can edit sample details at any time. However, changing the style number will affect barcode scanning.

---

### Transfers & Handovers

**Q13: Why do transfers need to be accepted?**  
A: The two-step verification ensures that the recipient physically has the garment before ownership transfers. This prevents disputes and fraud.

**Q14: What if the recipient never accepts my transfer?**  
A: You can cancel the pending transfer and resend it, or contact the recipient directly.

**Q15: Can I transfer a sample to multiple people at once?**  
A: No, a sample can only be transferred to one person at a time.

**Q16: What happens if I reject a transfer?**  
A: The sample remains with the sender, and your rejection reason is logged in the timeline.

**Q17: Can I cancel a transfer after sending it?**  
A: Yes, you can cancel any transfer that is still in "Pending" status.

---

### Barcode Scanning

**Q18: What barcode formats are supported?**  
A: QR Code, EAN-13, EAN-8, Code128, Code39, Code93, UPC-A, UPC-E, ITF14, and Codabar.

**Q19: Do I need a special barcode scanner?**  
A: No, GTS uses your phone's camera. No additional hardware is required.

**Q20: What if the barcode is damaged or unreadable?**  
A: Use the "Manual Accept" option to accept the transfer without scanning.

**Q21: Can I scan barcodes in low light?**  
A: Scanning works best in good lighting. Use your phone's flashlight if needed.

---

### Roles & Permissions

**Q22: What's the difference between Admin and Employee roles?**  
A: Admins can create/edit samples and employees, view global statistics, and access all features. Employees can only manage their own transfers and view samples.

**Q23: Can an Employee become an Admin?**  
A: Yes, contact your system administrator to change user roles.

**Q24: Can I see samples held by other employees?**  
A: Yes, all users can view the Live Tracking screen to see who holds which samples.

---

### Reports & Data

**Q25: How often should I generate reports?**  
A: It depends on your organization's needs. Daily or weekly reports are common.

**Q26: Can I export data to Excel?**  
A: Yes, use the "Email Excel" feature to receive a CSV file that opens in Excel.

**Q27: Is there a limit to how many samples I can create?**  
A: No, there is no limit. The system can handle thousands of samples.

---

### Technical

**Q28: Why is the app slow?**  
A: Check your internet connection. If the problem persists, try clearing the app cache or restarting your phone.

**Q29: Can I use GTS offline?**  
A: No, GTS requires an internet connection to function.

**Q30: How do I update the app?**  
A: Check your device's app store (Google Play or App Store) for updates.

---


## 16. SUPPORT INFORMATION

### Technical Support

For technical issues, app bugs, or system errors:

**Email:** support@gts-tracker.com  
**Phone:** +1 (555) 123-4567  
**Hours:** Monday - Friday, 9:00 AM - 6:00 PM

**Before Contacting Support:**
1. Note the exact error message
2. Take a screenshot if possible
3. Note what you were doing when the error occurred
4. Check the Troubleshooting section first

---

### Admin Support

For account creation, role changes, or permissions:

**Contact:** Your facility's GTS Administrator  
**Internal Extension:** [Your company's extension]

---

### Training & Onboarding

For new user training or refresher sessions:

**Email:** training@gts-tracker.com  
**Schedule:** Contact HR to arrange group training sessions

---

### Feedback & Suggestions

We value your feedback to improve GTS:

**Email:** feedback@gts-tracker.com  
**Online Form:** [Your company's feedback portal]

---

### Emergency Contact

For urgent issues affecting production:

**24/7 Hotline:** +1 (555) 999-8888  
**Email:** emergency@gts-tracker.com

---

## APPENDIX A: KEYBOARD SHORTCUTS & TIPS

### Mobile App Tips

**Pull to Refresh**  
On any list screen, pull down to refresh the data.

**Long Press for Selection**  
Long-press any sample in the Samples list to enter bulk selection mode.

**Swipe Gestures**  
Swipe left/right on some screens for quick actions (if enabled).

---

## APPENDIX B: BARCODE LABEL SPECIFICATIONS

### Recommended Label Specifications

**Label Size:** 2" x 3" (50mm x 75mm)  
**Material:** Adhesive paper or synthetic material  
**Printer:** Laser printer recommended  
**Resolution:** 300 DPI minimum  
**Barcode Type:** Code128  
**Barcode Height:** 0.5" (12mm)  

### Label Placement

- Attach to garment hang tag
- Ensure barcode is flat and unobstructed
- Avoid folding or creasing the barcode area
- Keep away from seams and stitching
- Laminate for durability in harsh environments

---

## APPENDIX C: SYSTEM REQUIREMENTS

### Mobile Device Requirements

**Android:**
- Android 8.0 (Oreo) or higher
- 2GB RAM minimum
- Camera with autofocus
- 100MB free storage

**iOS:**
- iOS 12.0 or higher
- iPhone 6 or newer
- Camera with autofocus
- 100MB free storage

**Network:**
- WiFi or 4G/5G mobile data
- Minimum 1 Mbps connection speed

---

## APPENDIX D: GLOSSARY

**Admin** - User with full system access and management capabilities

**Barcode** - Machine-readable code printed on garment labels

**Code128** - Barcode format used by GTS for sample identification

**Current Holder** - Employee currently in possession of a sample

**Department** - Organizational unit (e.g., Production, QA, Sampling)

**Employee** - Standard user with limited access to personal workspace

**Handover** - Process of transferring a sample from one employee to another

**Manual Accept** - Accepting a transfer without barcode verification

**Pending** - Transfer status awaiting recipient acceptance

**Sample** - Garment prototype being tracked in the system

**Style Number** - Unique identifier for each sample (encoded in barcode)

**Timeline** - Complete movement history of a sample

**Transfer** - Record of sample movement from one employee to another

**Verified** - Transfer accepted with barcode scan confirmation

**Workspace** - Employee's personal dashboard showing their samples and pending transfers

---

## DOCUMENT REVISION HISTORY

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | May 2026 | Initial release | GTS Documentation Team |

---

## ACKNOWLEDGMENTS

This user manual was prepared for the GTS – Garment Sample Tracker application to assist factory managers, merchandisers, QA teams, and production staff in effectively using the system.

For the latest version of this manual, visit your company's internal documentation portal or contact your GTS Administrator.

---

**END OF DOCUMENT**

---

© 2026 GTS – Garment Sample Tracker. All rights reserved.

This document is confidential and intended for authorized users only. Unauthorized distribution or reproduction is prohibited.
