# Google Sheets & Google Apps Script Setup Guide

This guide explains how to connect your IEEE Proctored Examination System directly to a Google Sheet so that candidate details, attempts, scores, and awarded gifts are stored automatically.

---

## 1. Rules Enforced
1. **Primary Key**: `Enrollment Number *`
2. **Attempt Enforcement**: Each student can take at most **2 attempts** (`Attempt 1` and `Attempt 2`).
   - A 3rd attempt is automatically blocked by both the Google Apps Script and the Exam Client.
3. **Gift Tiers**:
   - **Above 75%** (and $\le$ 80%): **IEEE Tech Sticker Pack** ("only get sticker")
   - **Above 80%** (and $<$ 90%): **Executive IEEE Metallic Pen** ("only get pen")
   - **90% or above**: **IEEE Ceramic Coffee Mug** ("get coffee mug")
   - **75% or below**: None

---

## 2. Quick 4-Step Setup

### Step 1: Create a Google Sheet
1. Open the configured [IEEE Examination Submissions spreadsheet](https://docs.google.com/spreadsheets/d/148XWlxoJUWV-Ah-U2Sf-KStq69oPNtLWQMYLF_hhIQ0/edit).
2. The Apps Script writes to its `Exam_Submissions` tab.

### Step 2: Open Apps Script Editor
1. In your Google Sheet, click the top menu: **Extensions** > **Apps Script**.
2. A code editor will open in a new tab.

### Step 3: Paste the Code
1. Select and delete any default code (`function myFunction() { ... }`).
2. Copy the full contents of `src/google-apps-script/Code.gs` from this project.
3. Paste it into the editor.
4. Click the **Save** (floppy disk) icon or press `Ctrl + S` / `Cmd + S`.

### Step 4: Deploy as a Web App
1. At the top right of the Apps Script editor, click the blue **Deploy** button > **New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Fill in the fields:
   - **Description**: `IEEE Exam Submissions API`
   - **Execute as**: `Me (your_email@gmail.com)`
   - **Who has access**: `Anyone` *(Crucial: This allows student browsers to submit records without requiring Google sign-in)*
4. Click **Deploy**.
5. Grant permissions if prompted by Google ("Authorize access" > Choose your account > Advanced > Go to Untitled project).
6. Copy the **Web app URL** (it looks like: `https://script.google.com/macros/s/.../exec`).

---

## 3. Connect the Web App in the Exam System
1. Set the **Web app URL** as `GOOGLE_SHEET_WEBAPP_URL` on the exam server.
2. Restart the local server or redeploy the Vercel app.
3. In the exam application, use **Verify & Test** to check the Apps Script endpoint.

The exam server, not the candidate browser, owns the active submission URL. For local development, copy `.env.example` to `.env`, set `GOOGLE_SHEET_WEBAPP_URL`, and restart the server. On Vercel, add the same variable under Project Settings > Environment Variables and redeploy. The URL entered in the browser can be tested or used for an explicit sample/bulk sync, but it does not change the server's destination for new exam submissions.

The Apps Script code is explicitly bound to spreadsheet ID `148XWlxoJUWV-Ah-U2Sf-KStq69oPNtLWQMYLF_hhIQ0`; it does not depend on the active spreadsheet. After changing the script, save and deploy a new Web App version for the change to take effect.

---

## 4. Sheet Column Structure
The Apps Script will automatically format the sheet with frozen, styled navy-blue headers:

| Col | Header | Description |
|---|---|---|
| A | Timestamp | Date & time of submission |
| B | **Enrollment Number** | **PRIMARY KEY** (Used to enforce 2 attempts) |
| C | Attempt Number | `1` or `2` |
| D | Candidate Name | Full Name entered during registration |
| E | Roll Number | Candidate Roll Number |
| F | Department | e.g., Computer Science & Engineering |
| G | Section | e.g., Section A |
| H | Email | Student email address |
| I | Score | Correct answers count |
| J | Total Questions | Total number of questions (20) |
| K | Percentage (%) | Candidate final percentage |
| L | Gift Awarded | Sticker Pack / Metallic Pen / Coffee Mug / None |
| M | Submission Reason | AUTO_NETWORK_DETECTED / TIMER_EXPIRED / MANUAL |
| N | Time Spent (s) | Seconds taken |
| O | Submission ID | Unique cryptographic receipt ID |
