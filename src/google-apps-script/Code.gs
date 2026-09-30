/**
 * =========================================================================
 * GOOGLE APPS SCRIPT FOR IEEE PROCTORED EXAMINATION SYSTEM
 * =========================================================================
 * 
 * Instructions to Deploy:
 * 1. Open Google Sheets (https://sheets.new)
 * 2. Click on "Extensions" > "Apps Script"
 * 3. Delete any existing code in the editor, and paste this entire code.
 * 4. Click the "Save" (disk) icon.
 * 5. Click "Deploy" > "New deployment"
 * 6. Click the Gear icon (Select type) -> Select "Web app"
 * 7. Configuration (CRITICAL):
 *    - Description: "IEEE Exam Submissions API"
 *    - Execute as: "Me" (your Google account)
 *    - Who has access: "Anyone" (VERY IMPORTANT: MUST be "Anyone" so candidate submissions are allowed)
 * 8. Click "Deploy", review permissions, and click "Allow".
 * 9. Copy the resulting "Web app URL" (it ends with /exec).
 *    NOTE: Do NOT copy the URL from the browser address bar (which ends in /edit).
 * 10. Paste the Web app URL in the Exam System's "Google Sheet Settings" modal.
 * 
 * Rules Enforced:
 * - Primary Key: "Enrollment Number *"
 * - Attempt Limit: Exactly 2 attempts per Enrollment Number (Attempt 1 and Attempt 2)
 * - Gifts Computed:
 *   * Above 75% (and <= 80%): IEEE Tech Sticker Pack
 *   * Above 80% (and < 90%): Executive IEEE Metallic Pen
 *   * 90% or above: IEEE Ceramic Coffee Mug
 * =========================================================================
 */

const SHEET_NAME = "Exam_Submissions";
const SPREADSHEET_ID = "148XWlxoJUWV-Ah-U2Sf-KStq69oPNtLWQMYLF_hhIQ0";
const MAX_ATTEMPTS = 2;

// Column Headers
const HEADERS = [
  "Timestamp",            // Col 1 (A)
  "Enrollment Number",    // Col 2 (B) - PRIMARY KEY
  "Attempt Number",       // Col 3 (C)
  "Candidate Name",       // Col 4 (D)
  "Roll Number",          // Col 5 (E)
  "Department",           // Col 6 (F)
  "Section",              // Col 7 (G)
  "Email",                // Col 8 (H)
  "Score",                // Col 9 (I)
  "Total Questions",      // Col 10 (J)
  "Percentage (%)",       // Col 11 (K)
  "Gift Awarded",         // Col 12 (L)
  "Submission Reason",    // Col 13 (M)
  "Time Spent (seconds)", // Col 14 (N)
  "Submission ID",        // Col 15 (O)
  "Phone Number"          // Col 16 (P)
];

/**
 * Helper to get or create the submissions sheet with proper styling and headers.
 * If the active spreadsheet contains default "Sheet1" or an empty sheet, it automatically
 * renames it to "Exam_Submissions" so data is immediately visible on the main screen!
 */
function getOrCreateSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    const allSheets = ss.getSheets();
    // If the spreadsheet only has one sheet and it's empty or named "Sheet1", use and rename it
    if (allSheets.length === 1 && (allSheets[0].getLastRow() === 0 || allSheets[0].getName().toLowerCase().indexOf("sheet") >= 0)) {
      sheet = allSheets[0];
      sheet.setName(SHEET_NAME);
    } else {
      sheet = ss.insertSheet(SHEET_NAME);
    }
  }
  
  // Bring this sheet to the front active tab so user sees it right away
  try {
    ss.setActiveSheet(sheet);
  } catch (e) {}

  // If first row is empty, initialize headers
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
    headerRange.setBackground("#1e3a8a"); // Navy Blue
    headerRange.setFontColor("#ffffff");
    headerRange.setFontWeight("bold");
    headerRange.setFontSize(11);
    sheet.setFrozenRows(1);
    
    // Auto-fit columns
    for (var i = 1; i <= HEADERS.length; i++) {
      try {
        sheet.autoResizeColumn(i);
      } catch (err) {}
    }
  } else if (sheet.getLastColumn() < HEADERS.length) {
    sheet.getRange(1, HEADERS.length).setValue(HEADERS[HEADERS.length - 1]);
  }
  
  return sheet;
}

/**
 * Determine the gift according to the exact rules:
 * - Above 75%: Only Sticker
 * - Above 80%: Only Pen
 * - 90% or above: Coffee Mug
 */
function determineGift(percentage) {
  var pct = Number(percentage);
  if (pct >= 90) {
    return "IEEE Ceramic Coffee Mug";
  } else if (pct > 80) {
    return "Executive IEEE Metallic Pen";
  } else if (pct > 75) {
    return "IEEE Tech Sticker Pack";
  } else {
    return "None (Below 75%)";
  }
}

/**
 * Search all past attempts for a given Enrollment Number (Primary Key)
 */
function getAttemptsByEnrollment(enrollmentNumber) {
  if (!enrollmentNumber) return [];
  
  const sheet = getOrCreateSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];
  
  const searchEnrollment = String(enrollmentNumber).trim().toUpperCase();
  const values = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
  
  const attempts = [];
  for (var i = 0; i < values.length; i++) {
    var row = values[i];
    var rowEnrollment = String(row[1]).trim().toUpperCase();
    if (rowEnrollment === searchEnrollment) {
      attempts.push({
        rowNumber: i + 2,
        timestamp: row[0],
        enrollmentNumber: row[1],
        attemptNumber: Number(row[2]) || (attempts.length + 1),
        candidateName: row[3],
        rollNumber: row[4],
        score: row[8],
        totalQuestions: row[9],
        percentage: row[10],
        giftAwarded: row[11],
        submissionId: row[14]
      });
    }
  }
  return attempts;
}

/**
 * Handles HTTP GET requests
 * Used for:
 * 1. Ping / Test connection: ?action=ping
 * 2. Check candidate attempts by Enrollment Number: ?action=checkAttempts&enrollmentNumber=XYZ
 * 3. Fallback direct submission: ?action=submit&data={...}
 */
function doGet(e) {
  try {
    const params = e && e.parameter ? e.parameter : {};
    const action = params.action || "ping";
    
    if (action === "ping") {
      return createJsonResponse({
        status: "ok",
        message: "Google Sheet Exam API is connected and online",
        sheetName: SHEET_NAME,
        maxAttemptsPerStudent: MAX_ATTEMPTS,
        timestamp: new Date().toISOString()
      });
    }
    
    if (action === "checkAttempts") {
      const enrollmentNumber = params.enrollmentNumber;
      if (!enrollmentNumber || !enrollmentNumber.trim()) {
        return createJsonResponse({
          status: "error",
          message: "Parameter 'enrollmentNumber' is required."
        });
      }
      
      const cleanEnrollment = String(enrollmentNumber).trim().toUpperCase();
      const attempts = getAttemptsByEnrollment(cleanEnrollment);
      const attemptCount = attempts.length;
      const canAttempt = attemptCount < MAX_ATTEMPTS;
      const remainingAttempts = Math.max(0, MAX_ATTEMPTS - attemptCount);
      
      return createJsonResponse({
        status: "success",
        enrollmentNumber: cleanEnrollment,
        attemptCount: attemptCount,
        maxAttempts: MAX_ATTEMPTS,
        canAttempt: canAttempt,
        remainingAttempts: remainingAttempts,
        isBlocked: !canAttempt,
        message: canAttempt 
          ? "Enrollment Number eligible to take exam. Attempt " + (attemptCount + 1) + " of " + MAX_ATTEMPTS + "."
          : "Maximum attempts reached (" + MAX_ATTEMPTS + "/" + MAX_ATTEMPTS + "). Further attempts are restricted for Enrollment Number: " + cleanEnrollment + ".",
        pastAttempts: attempts
      });
    }

    if (action === "submit") {
      var data = {};
      if (params.data) {
        try {
          data = JSON.parse(params.data);
        } catch (je) {
          data = params;
        }
      } else {
        data = params;
      }
      return processSubmission(data);
    }
    
    return createJsonResponse({
      status: "error",
      message: "Unknown action: " + action
    });
  } catch (err) {
    return createJsonResponse({
      status: "error",
      message: err.toString()
    });
  }
}

/**
 * Handles HTTP POST requests
 */
function doPost(e) {
  var data = {};
  if (e && e.postData && e.postData.contents) {
    try {
      data = JSON.parse(e.postData.contents);
    } catch (jsonErr) {
      data = e.parameter || {};
    }
  } else if (e && e.parameter) {
    data = e.parameter;
  }
  return processSubmission(data);
}

/**
 * Core submission recording logic
 */
function processSubmission(data) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (lockError) {
    return createJsonResponse({
      status: "error",
      message: "Server busy, please try submitting again in a moment."
    });
  }
  
  try {
    const student = data.student || data;
    const enrollmentNumber = String(student.enrollmentNumber || data.enrollmentNumber || "").trim().toUpperCase();
    
    if (!enrollmentNumber) {
      return createJsonResponse({
        status: "error",
        message: "Validation Error: 'Enrollment Number *' (Primary Key) is required."
      });
    }

    const submissionId = String(data.submissionId || data.id || "").trim();
    const sheet = getOrCreateSheet();
    if (submissionId && sheet.getLastRow() > 1) {
      const existingIds = sheet.getRange(2, 15, sheet.getLastRow() - 1, 1).getDisplayValues().flat();
      const existingRow = existingIds.indexOf(submissionId);
      if (existingRow >= 0) {
        return createJsonResponse({
          status: "success",
          message: "This submission was already saved to Google Sheets.",
          sheetName: SHEET_NAME,
          rowNumber: existingRow + 2,
          submissionId: submissionId,
          duplicate: true
        });
      }
    }
    
    // 1. Check existing attempts for this Enrollment Number
    const existingAttempts = getAttemptsByEnrollment(enrollmentNumber);
    const existingCount = existingAttempts.length;
    
    if (existingCount >= MAX_ATTEMPTS) {
      return createJsonResponse({
        status: "error",
        code: "MAX_ATTEMPTS_EXCEEDED",
        enrollmentNumber: enrollmentNumber,
        attemptCount: existingCount,
        maxAttempts: MAX_ATTEMPTS,
        canAttempt: false,
        message: "Attempt rejected: Enrollment Number " + enrollmentNumber + " has already completed all " + MAX_ATTEMPTS + " allowed attempts.",
        pastAttempts: existingAttempts
      });
    }
    
    // 2. Prepare submission details
    const attemptNumber = existingCount + 1; // Attempt 1 or 2
    const candidateName = String(student.name || data.name || "").trim();
    const rollNumber = String(student.roll || data.roll || "").trim();
    const department = String(student.department || data.department || "").trim();
    const section = String(student.section || data.section || "").trim();
    const email = String(student.email || data.email || "").trim();
    
    const score = Number(data.score !== undefined ? data.score : 0);
    const totalQuestions = Number(data.totalQuestions !== undefined ? data.totalQuestions : 20);
    const percentage = Number(data.percentage !== undefined ? data.percentage : Math.round((score / totalQuestions) * 100));
    
    // Gift logic
    const giftAwarded = data.giftAwarded || determineGift(percentage);
    const submissionReason = String(data.submissionReason || "MANUAL_SUBMISSION");
    const timeSpent = Number(data.timeSpentSeconds || 0);
    const finalSubmissionId = submissionId || ("sub_" + new Date().getTime());
    const timestamp = new Date();
    
    // 3. Append row to sheet
    sheet.appendRow([
      timestamp,
      enrollmentNumber,
      attemptNumber,
      candidateName,
      rollNumber,
      department,
      section,
      email,
      score,
      totalQuestions,
      percentage,
      giftAwarded,
      submissionReason,
      timeSpent,
      finalSubmissionId,
      String(student.phone || data.phone || "").trim()
    ]);
    
    // Soft styling highlights for awards
    const newLastRow = sheet.getLastRow();
    if (percentage >= 90) {
      sheet.getRange(newLastRow, 11, 1, 2).setBackground("#f3e8ff"); // soft purple for mug
    } else if (percentage > 80) {
      sheet.getRange(newLastRow, 11, 1, 2).setBackground("#dbeafe"); // soft blue for pen
    } else if (percentage > 75) {
      sheet.getRange(newLastRow, 11, 1, 2).setBackground("#dcfce7"); // soft green for sticker
    }
    
    return createJsonResponse({
      status: "success",
      message: "Exam record successfully saved to Google Sheet!",
      sheetName: SHEET_NAME,
      rowNumber: newLastRow,
      enrollmentNumber: enrollmentNumber,
      attemptNumber: attemptNumber,
      maxAttempts: MAX_ATTEMPTS,
      remainingAttempts: MAX_ATTEMPTS - attemptNumber,
      score: score,
      percentage: percentage,
      giftAwarded: giftAwarded,
      submissionId: finalSubmissionId,
      timestamp: timestamp.toISOString()
    });
    
  } catch (err) {
    return createJsonResponse({
      status: "error",
      message: "Execution failure: " + err.toString()
    });
  } finally {
    try {
      lock.releaseLock();
    } catch (e) {}
  }
}

/**
 * Helper to build JSON responses with proper CORS headers for browser requests
 */
function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
