import React, { useState, useEffect } from "react";
import { 
  X, 
  Copy, 
  Check, 
  ExternalLink, 
  FileSpreadsheet, 
  Code2, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  Lock,
  Sparkles,
  HelpCircle,
  KeyRound,
  Send,
  AlertTriangle,
  Layers
} from "lucide-react";
import { 
  getGoogleSheetUrl, 
  testGoogleSheetConnection,
  validateWebAppUrl,
  syncAllServerSubmissions,
} from "../utils/googleSheetsSync";

interface GoogleSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const APPS_SCRIPT_CODE = `/**
 * =========================================================================
 * GOOGLE APPS SCRIPT FOR IEEE PROCTORED EXAMINATION SYSTEM
 * =========================================================================
 * Instructions:
 * 1. Go to sheets.new and name your spreadsheet.
 * 2. Click Extensions > Apps Script.
 * 3. Delete existing code, paste this entire file, and click Save.
 * 4. Click Deploy > New deployment.
 * 5. Select type: "Web app"
 * 6. Set "Execute as: Me"
 * 7. Set "Who has access: Anyone"  <-- CRITICAL! (DO NOT choose "Only myself")
 * 8. Click Deploy, Authorize access, and copy the URL ending with /exec.
 * =========================================================================
 */

const SHEET_NAME = "Exam_Submissions";
const SPREADSHEET_ID = "148XWlxoJUWV-Ah-U2Sf-KStq69oPNtLWQMYLF_hhIQ0";
const MAX_ATTEMPTS = 2;

const HEADERS = [
  "Timestamp", "Enrollment Number", "Attempt Number", "Candidate Name", 
  "Roll Number", "Department", "Section", "Email", "Score", 
  "Total Questions", "Percentage (%)", "Gift Awarded", "Submission Reason", 
  "Time Spent (seconds)", "Submission ID", "Phone Number"
];

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
  
  // Bring this sheet to the front active tab
  try { ss.setActiveSheet(sheet); } catch (e) {}

  // If first row is empty, initialize styled headers
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
    headerRange.setBackground("#1e3a8a").setFontColor("#ffffff")
      .setFontWeight("bold").setFontSize(11);
    sheet.setFrozenRows(1);
    for (var i = 1; i <= HEADERS.length; i++) {
      try { sheet.autoResizeColumn(i); } catch (err) {}
    }
  } else if (sheet.getLastColumn() < HEADERS.length) {
    sheet.getRange(1, HEADERS.length).setValue(HEADERS[HEADERS.length - 1]);
  }
  return sheet;
}

function determineGift(percentage) {
  var pct = Number(percentage);
  if (pct >= 90) return "IEEE Ceramic Coffee Mug";
  if (pct > 80) return "Executive IEEE Metallic Pen";
  if (pct > 75) return "IEEE Tech Sticker Pack";
  return "None (Below 75%)";
}

function getAttemptsByEnrollment(enrollmentNumber) {
  if (!enrollmentNumber) return [];
  const sheet = getOrCreateSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];
  const search = String(enrollmentNumber).trim().toUpperCase();
  const values = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
  const attempts = [];
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][1]).trim().toUpperCase() === search) {
      attempts.push({
        row: i + 2, timestamp: values[i][0], enrollmentNumber: values[i][1],
        attemptNumber: Number(values[i][2]) || (attempts.length + 1),
        candidateName: values[i][3], rollNumber: values[i][4],
        score: values[i][8], percentage: values[i][10], giftAwarded: values[i][11]
      });
    }
  }
  return attempts;
}

function doGet(e) {
  try {
    const params = e && e.parameter ? e.parameter : {};
    const action = params.action || "ping";
    
    if (action === "ping") {
      return ContentService.createTextOutput(JSON.stringify({
        status: "ok", message: "Google Sheet Exam API is connected and online",
        sheetName: SHEET_NAME, maxAttemptsPerStudent: MAX_ATTEMPTS,
        timestamp: new Date().toISOString()
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === "checkAttempts") {
      const enrollment = String(params.enrollmentNumber || "").trim().toUpperCase();
      if (!enrollment) return ContentService.createTextOutput(JSON.stringify({
        status: "error", message: "Parameter 'enrollmentNumber' required"
      })).setMimeType(ContentService.MimeType.JSON);
      
      const attempts = getAttemptsByEnrollment(enrollment);
      const count = attempts.length;
      const canAttempt = count < MAX_ATTEMPTS;
      return ContentService.createTextOutput(JSON.stringify({
        status: "success", enrollmentNumber: enrollment,
        attemptCount: count, maxAttempts: MAX_ATTEMPTS,
        canAttempt: canAttempt, remainingAttempts: Math.max(0, MAX_ATTEMPTS - count),
        pastAttempts: attempts
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "submit") {
      var data = {};
      if (params.data) {
        try { data = JSON.parse(params.data); } catch(x) { data = params; }
      } else { data = params; }
      return processSubmission(data);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "error", message: "Unknown action"
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error", message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  var data = {};
  if (e && e.postData && e.postData.contents) {
    try { data = JSON.parse(e.postData.contents); } catch(x) { data = e.parameter || {}; }
  } else if (e && e.parameter) {
    data = e.parameter;
  }
  return processSubmission(data);
}

function processSubmission(data) {
  const lock = LockService.getScriptLock();
  try { lock.waitLock(10000); } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error", message: "Server busy, please retry"
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  try {
    const student = data.student || data;
    const enrollment = String(student.enrollmentNumber || data.enrollmentNumber || "").trim().toUpperCase();
    if (!enrollment) return ContentService.createTextOutput(JSON.stringify({
      status: "error", message: "Missing Enrollment Number (Primary Key)"
    })).setMimeType(ContentService.MimeType.JSON);

    const submissionId = String(data.submissionId || data.id || "").trim();
    const sheet = getOrCreateSheet();
    if (submissionId && sheet.getLastRow() > 1) {
      const existingIds = sheet.getRange(2, 15, sheet.getLastRow() - 1, 1).getDisplayValues().flat();
      const existingRow = existingIds.indexOf(submissionId);
      if (existingRow >= 0) return ContentService.createTextOutput(JSON.stringify({
        status: "success", message: "This submission was already saved to Google Sheets.",
        sheetName: SHEET_NAME, rowNumber: existingRow + 2, submissionId, duplicate: true
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    const existing = getAttemptsByEnrollment(enrollment);
    if (existing.length >= MAX_ATTEMPTS) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error", code: "MAX_ATTEMPTS_EXCEEDED",
        message: "Attempt limit exceeded: Enrollment Number " + enrollment + " has used all " + MAX_ATTEMPTS + " attempts."
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    const attemptNumber = existing.length + 1;
    const pct = Number(data.percentage !== undefined ? data.percentage : 0);
    const gift = data.giftAwarded || determineGift(pct);
    
    sheet.appendRow([
      new Date(), enrollment, attemptNumber, student.name || "",
      student.roll || "", student.department || "", student.section || "",
      student.email || "", Number(data.score || 0), Number(data.totalQuestions || 20),
      pct, gift, data.submissionReason || "MANUAL", Number(data.timeSpentSeconds || 0),
      submissionId || ("sub_" + Date.now()), String(student.phone || "").trim()
    ]);
    
    const newLastRow = sheet.getLastRow();
    if (pct >= 90) sheet.getRange(newLastRow, 11, 1, 2).setBackground("#f3e8ff");
    else if (pct > 80) sheet.getRange(newLastRow, 11, 1, 2).setBackground("#dbeafe");
    else if (pct > 75) sheet.getRange(newLastRow, 11, 1, 2).setBackground("#dcfce7");

    return ContentService.createTextOutput(JSON.stringify({
      status: "success", message: "Exam record successfully saved to Google Sheet!",
      sheetName: SHEET_NAME, rowNumber: newLastRow, attemptNumber: attemptNumber,
      maxAttempts: MAX_ATTEMPTS, percentage: pct, giftAwarded: gift
    })).setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error", message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    try { lock.releaseLock(); } catch(e) {}
  }
}`;

export const GoogleSheetModal: React.FC<GoogleSheetModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  const [sendingTestRow, setSendingTestRow] = useState(false);
  const [testResult, setTestResult] = useState<{
    tested: boolean;
    success: boolean;
    message: string;
  } | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"setup" | "diagnose" | "code" | "policy">("setup");

  useEffect(() => {
    if (isOpen) {
      setUrl(getGoogleSheetUrl());
      setTestResult(null);
      setActionFeedback(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const urlValidation = url ? validateWebAppUrl(url) : { valid: true };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(APPS_SCRIPT_CODE);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error("Failed to copy code:", err);
    }
  };

  const handleSaveUrl = () => {
    if (!urlValidation.valid) {
      setActionFeedback(urlValidation.error || "Enter a valid Apps Script Web App URL.");
      return;
    }
    setActionFeedback("This URL is not saved by the browser. Set GOOGLE_SHEET_WEBAPP_URL in the server environment, then restart or redeploy the app.");
  };

  const handleTestConnection = async () => {
    if (!url.trim()) {
      setTestResult({
        tested: true,
        success: false,
        message: "Please enter a Google Apps Script Web App URL first.",
      });
      return;
    }
    setTesting(true);
    setTestResult(null);
    const result = await testGoogleSheetConnection(url);
    setTesting(false);
    setTestResult({
      tested: true,
      success: result.success,
      message: result.message,
    });
  };

  const handleSyncAllToSheet = async () => {
    if (!url.trim()) {
      alert("Please configure and save your Google Apps Script URL first.");
      return;
    }
    setSyncingAll(true);
    setActionFeedback(null);
    try {
      const res = await syncAllServerSubmissions(url);
      if (res.success) {
        setActionFeedback(`Successfully synced ${res.syncedCount} of ${res.total} submission(s) to your Google Sheet! Check the "Exam_Submissions" tab.`);
      } else {
        setActionFeedback(`Sync encountered an error: ${res.message}`);
      }
    } catch (e: any) {
      setActionFeedback(`Sync failed: ${e.message}`);
    } finally {
      setSyncingAll(false);
    }
  };

  const handleSendSampleRow = async () => {
    if (!url.trim()) {
      alert("Please configure your Google Apps Script URL first.");
      return;
    }
    setSendingTestRow(true);
    setActionFeedback(null);
    try {
      const dummySubmission: any = {
        id: "test_" + Date.now(),
        student: {
          name: "Test Candidate",
          email: "test.candidate@ieee.org",
          department: "Computer Science",
          section: "A",
          roll: "TEST-01",
          enrollmentNumber: "TEST-ENROLL-" + Math.floor(1000 + Math.random() * 9000),
        },
        score: 18,
        totalQuestions: 20,
        percentage: 90,
        timeSpentSeconds: 120,
        totalDurationSeconds: 1200,
        submissionReason: "MANUAL_SUBMISSION",
        submittedAt: new Date().toISOString(),
        isSubmittedOnNetwork: true,
        attemptNumber: 1,
      };

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          student: { ...dummySubmission.student, phone: "5550100000" },
          score: dummySubmission.score,
          totalQuestions: dummySubmission.totalQuestions,
          percentage: dummySubmission.percentage,
          giftAwarded: "None",
          attemptNumber: dummySubmission.attemptNumber,
          submissionReason: dummySubmission.submissionReason,
          timeSpentSeconds: dummySubmission.timeSpentSeconds,
          submissionId: dummySubmission.id,
          submittedAt: dummySubmission.submittedAt,
        }),
      });
      const result = await response.json();
      if (response.ok && result.status === "success") {
        setActionFeedback(`Success! Sample test row was written to your Google Sheet (Row #${result.rowNumber || "New"}). Open your Google Sheet to verify.`);
      } else {
        setActionFeedback(`Failed to write test row: ${result.message || `HTTP ${response.status}`}`);
      }
    } catch (e: any) {
      setActionFeedback(`Error sending test row: ${e.message}`);
    } finally {
      setSendingTestRow(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600/30 border border-emerald-500/40 rounded-xl text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base flex items-center gap-2">
                Google Sheet & Apps Script Integration
              </h3>
              <p className="text-xs text-slate-300">
                Automatic exam responses sync · Primary Key: <strong>Enrollment Number</strong> · Max 2 Attempts
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-200 bg-slate-50 px-5 pt-2 gap-2 text-xs font-semibold overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("setup")}
            className={`pb-2.5 px-3 border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 shrink-0 ${
              activeTab === "setup"
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Setup & Connection URL
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("diagnose")}
            className={`pb-2.5 px-3 border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 shrink-0 ${
              activeTab === "diagnose"
                ? "border-amber-600 text-amber-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
            Why Data Not Visible? (Guide)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("code")}
            className={`pb-2.5 px-3 border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 shrink-0 ${
              activeTab === "code"
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            Apps Script Code (Code.gs)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("policy")}
            className={`pb-2.5 px-3 border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 shrink-0 ${
              activeTab === "policy"
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            Rules & Attempt Policy
          </button>
        </div>

        {/* Action feedback toast */}
        {actionFeedback && (
          <div className="bg-blue-600 text-white px-5 py-2 text-xs font-semibold flex items-center justify-between">
            <span>{actionFeedback}</span>
            <button 
              type="button" 
              onClick={() => setActionFeedback(null)} 
              className="text-white/80 hover:text-white ml-2 text-xs underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 text-xs">
          {activeTab === "setup" && (
            <>
              {/* Web App URL Input Box */}
              <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label htmlFor="input-webapp-url" className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                    <KeyRound className="w-4 h-4 text-blue-600" />
                    Google Apps Script Web App URL
                  </label>
                  {url && urlValidation.valid && (
                    <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                      Ready to Sync
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    id="input-webapp-url"
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleTestConnection}
                      disabled={testing}
                      className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {testing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      <span>{testing ? "Testing..." : "Verify & Test"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveUrl}
                      className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      Save Instructions
                    </button>
                  </div>
                </div>

                {/* Validation Warning if user copied /edit URL */}
                {!urlValidation.valid && (
                  <div className="p-3 bg-rose-50 border border-rose-300 rounded-lg flex items-start gap-2 text-rose-800 text-xs">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">Invalid URL Detected:</span>
                      <p className="mt-0.5 text-[11px] leading-relaxed">{urlValidation.error || urlValidation.warning}</p>
                    </div>
                  </div>
                )}

                {/* Test Feedback Notice */}
                {testResult && testResult.tested && (
                  <div className={`p-3 rounded-lg flex items-start gap-2 text-xs ${
                    testResult.success
                      ? "bg-emerald-50 border border-emerald-300 text-emerald-800"
                      : "bg-rose-50 border border-rose-300 text-rose-800"
                  }`}>
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="font-semibold">{testResult.success ? "Connection Verified!" : "Connection Failed"}</p>
                      <p className="text-[11px] mt-0.5 leading-relaxed">{testResult.message}</p>
                    </div>
                  </div>
                )}

                {/* Quick Action Buttons */}
                <div className="pt-2 border-t border-blue-200/80 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSyncAllToSheet}
                    disabled={syncingAll || !url.trim()}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {syncingAll ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    <span>{syncingAll ? "Syncing Past Submissions..." : "Sync All Past Submissions Now"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSendSampleRow}
                    disabled={sendingTestRow || !url.trim()}
                    className="px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {sendingTestRow ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Layers className="w-3.5 h-3.5" />}
                    <span>{sendingTestRow ? "Writing Test Row..." : "Write 1 Sample Row to Sheet"}</span>
                  </button>
                </div>
              </div>

              {/* Step-by-Step Instructions */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Step-by-Step Setup in 2 Minutes:
                </h4>

                <div className="grid grid-cols-1 gap-2.5">
                  <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">1</span>
                    <div>
                      <h5 className="font-bold text-slate-900">Create a New Google Sheet</h5>
                      <p className="text-slate-600 text-[11px] mt-0.5">
                        Open <a href="https://sheets.new" target="_blank" rel="noreferrer" className="text-blue-600 underline font-medium">sheets.new</a> in your browser.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">2</span>
                    <div>
                      <h5 className="font-bold text-slate-900">Open Apps Script Editor</h5>
                      <p className="text-slate-600 text-[11px] mt-0.5">
                        In your sheet top menu, click <strong>Extensions &gt; Apps Script</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">3</span>
                    <div>
                      <div className="flex items-center justify-between">
                        <h5 className="font-bold text-slate-900">Paste Apps Script Code</h5>
                        <button
                          type="button"
                          onClick={handleCopyCode}
                          className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>{copied ? "Copied!" : "Copy Code Now"}</span>
                        </button>
                      </div>
                      <p className="text-slate-600 text-[11px] mt-0.5">
                        Delete any existing sample lines, paste the code from the <strong>Apps Script Code</strong> tab, and click <strong>Save</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">4</span>
                    <div>
                      <h5 className="font-bold text-slate-900">Deploy as Web App (CRITICAL SETTINGS)</h5>
                      <p className="text-slate-600 text-[11px] mt-0.5">
                        Click <strong>Deploy &gt; New deployment</strong> &gt; Select <strong>Web app</strong>.
                      </p>
                      <ul className="list-disc pl-4 mt-1 text-[11px] space-y-0.5 text-slate-700">
                        <li>Execute as: <strong>Me</strong></li>
                        <li>Who has access: <strong className="text-rose-600">Anyone</strong> (Do NOT leave as "Only myself")</li>
                      </ul>
                      <p className="text-slate-600 text-[11px] mt-1">
                        Click Deploy, authorize permissions, and copy the <strong>Web App URL</strong> (ends in <code>/exec</code>). To make this the exam submission destination, set <code>GOOGLE_SHEET_WEBAPP_URL</code> in the server environment and restart or redeploy the app.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === "diagnose" && (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl">
                <h4 className="font-bold text-amber-900 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  Why is the submitted data not visible in your Google Sheet?
                </h4>
                <p className="text-amber-800 text-xs mt-1">
                  Here are the 4 most common causes and how to fix them in 30 seconds:
                </p>
              </div>

              <div className="space-y-3">
                {/* Issue 1 */}
                <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-500 text-white font-bold flex items-center justify-center text-xs">1</span>
                    <h5 className="font-bold text-slate-900">Check the Tab at the Bottom of Your Google Sheet</h5>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    By default, Google Sheets opens on the tab named <strong>"Sheet1"</strong>. The Apps Script writes submissions to the tab named <strong className="text-blue-700 font-mono">"Exam_Submissions"</strong>.
                  </p>
                  <p className="text-slate-600 text-[11px] font-medium bg-slate-50 p-2 rounded-lg border border-slate-200">
                    👉 Look at the bottom navigation tabs of your spreadsheet and click on the <strong>"Exam_Submissions"</strong> tab to see your recorded candidates!
                  </p>
                </div>

                {/* Issue 2 */}
                <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-rose-500 text-white font-bold flex items-center justify-center text-xs">2</span>
                    <h5 className="font-bold text-slate-900">Script Editor URL vs Deployed Web App URL</h5>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Did you copy the URL from the browser address bar while editing the code?
                  </p>
                  <ul className="text-[11px] space-y-1 text-slate-700">
                    <li className="text-rose-600">❌ <strong>Wrong URL:</strong> <code>https://script.google.com/.../edit</code> (This is just the editor page)</li>
                    <li className="text-emerald-700">✅ <strong>Correct URL:</strong> <code>https://script.google.com/macros/s/.../exec</code> (This is the live Web App)</li>
                  </ul>
                  <p className="text-slate-600 text-[11px]">
                    To get the correct URL: Click <strong>Deploy &gt; Manage deployments</strong> &gt; Copy Web app URL.
                  </p>
                </div>

                {/* Issue 3 */}
                <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-500 text-white font-bold flex items-center justify-center text-xs">3</span>
                    <h5 className="font-bold text-slate-900">Permission Setting: "Who has access" must be "Anyone"</h5>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    If "Who has access" was left as <strong>"Only myself"</strong>, Google will block submissions and redirect them to a Google Account login page instead of saving the data.
                  </p>
                  <p className="text-slate-600 text-[11px] bg-slate-50 p-2 rounded-lg border border-slate-200">
                    👉 Go to Apps Script &gt; <strong>Deploy &gt; Manage deployments</strong> &gt; Click the pencil (Edit) icon &gt; Change "Who has access" to <strong>"Anyone"</strong> &gt; Click Deploy.
                  </p>
                </div>

                {/* Issue 4 */}
                <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-purple-500 text-white font-bold flex items-center justify-center text-xs">4</span>
                    <h5 className="font-bold text-slate-900">Updated Code Needs a "New Deployment"</h5>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Whenever you update or re-paste the Apps Script code, Google does not automatically push changes to the existing URL. You must click <strong>Deploy &gt; New deployment</strong> so the latest version is live.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-bold text-emerald-900 block text-xs">Ready to sync your recorded exams?</span>
                  <span className="text-[11px] text-emerald-700">Click below to push all submissions to your spreadsheet right now.</span>
                </div>
                <button
                  type="button"
                  onClick={handleSyncAllToSheet}
                  disabled={syncingAll || !url.trim()}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {syncingAll ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>Push All Submissions Now</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === "code" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 text-xs font-semibold">
                  Copy this complete Google Apps Script code to paste into <code>Code.gs</code>:
                </span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer text-xs"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "Copied to Clipboard!" : "Copy Full Code"}</span>
                </button>
              </div>

              <pre className="p-4 bg-slate-900 text-emerald-300 rounded-xl font-mono text-[11px] overflow-x-auto max-h-96 border border-slate-800 leading-relaxed select-all">
                {APPS_SCRIPT_CODE}
              </pre>
            </div>
          )}

          {activeTab === "policy" && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Lock className="w-4 h-4 text-blue-600" />
                  Primary Key & Attempt Limit Rules
                </h4>
                <p className="text-slate-600 leading-relaxed">
                  The examination system strictly tracks each student using their <strong>Enrollment Number *</strong> as the unique Primary Key:
                </p>
                <div className="space-y-2">
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 block">Attempt 1 of 2</span>
                      <span className="text-[11px] text-slate-500">First initial attempt for a fresh enrollment number</span>
                    </div>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-md text-[10px]">
                      ALLOWED
                    </span>
                  </div>

                  <div className="p-2.5 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 block">Attempt 2 of 2</span>
                      <span className="text-[11px] text-slate-500">Second and final permitted attempt</span>
                    </div>
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold rounded-md text-[10px]">
                      FINAL ATTEMPT
                    </span>
                  </div>

                  <div className="p-2.5 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 block">Attempt 3 or more</span>
                      <span className="text-[11px] text-slate-500">Blocked by registration and rejected by Google Apps Script</span>
                    </div>
                    <span className="px-2 py-0.5 bg-rose-100 text-rose-800 font-bold rounded-md text-[10px]">
                      BLOCKED / REJECTED
                    </span>
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-100 px-5 py-3 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            {url ? "Sync target active" : "No Google Sheet URL connected yet"}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-lg transition-colors cursor-pointer text-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
