import React, { useState, useEffect, useCallback } from "react";
import { NetworkCheckStatus, NetworkMode, StudentDetails } from "../types";
import { checkEnrollmentAttempts, AttemptCheckResult } from "../utils/attemptTracker";
import { getGoogleSheetUrl } from "../utils/googleSheetsSync";
import { PythonAccessGate } from "./PythonAccessGate";
import { 
  User, 
  Mail, 
  Building2, 
  Grid3X3, 
  Hash, 
  IdCard, 
  WifiOff, 
  Wifi,
  Clock, 
  EyeOff, 
  ShieldAlert, 
  CheckCircle2, 
  ArrowRight,
  RotateCw,
  Activity,
  AlertTriangle,
  FileSpreadsheet,
  Lock,
  History,
  AlertOctagon,
  KeyRound,
  Smartphone,
  ShieldCheck,
  Phone
} from "lucide-react";

interface RegistrationFormProps {
  onStartExam: (details: StudentDetails, mode?: NetworkMode) => void;
  isOnline: boolean;
  networkMode?: NetworkMode;
  networkCheckStatus: NetworkCheckStatus;
  isCheckingNetwork: boolean;
  onToggleNetworkMode?: (mode: NetworkMode) => void;
  onCheckNetworkNow: () => void;
  onToggleNetworkSim?: (online: boolean) => void;
}

export const RegistrationForm: React.FC<RegistrationFormProps> = ({
  onStartExam,
  isOnline,
  networkMode,
  networkCheckStatus,
  isCheckingNetwork,
  onToggleNetworkMode,
  onCheckNetworkNow,
  onToggleNetworkSim,
}) => {
  const [formData, setFormData] = useState<StudentDetails>({
    name: "",
    email: "",
    phone: "",
    department: "",
    section: "",
    roll: "",
    enrollmentNumber: "",
  });
  const [gateOpen, setGateOpen] = useState(false);
  const [pendingStudent, setPendingStudent] = useState<StudentDetails | null>(null);

  const [errors, setErrors] = useState<Partial<Record<keyof StudentDetails, string>>>({});
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Attempt verification state
  const [attemptCheck, setAttemptCheck] = useState<AttemptCheckResult | null>(null);
  const [isCheckingAttempts, setIsCheckingAttempts] = useState(false);
  const hasConfiguredSheet = Boolean(getGoogleSheetUrl());

  // Check attempts whenever enrollmentNumber changes (debounced)
  useEffect(() => {
    const raw = formData.enrollmentNumber.trim();
    if (!raw) {
      setAttemptCheck(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsCheckingAttempts(true);
      try {
        const result = await checkEnrollmentAttempts(raw);
        setAttemptCheck(result);
      } catch (err) {
        console.error("Failed to check attempts:", err);
      } finally {
        setIsCheckingAttempts(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [formData.enrollmentNumber]);

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof StudentDetails, string>> = {};

    if (!formData.name.trim()) newErrors.name = "Full name is required";
    if (!formData.email.trim()) {
      newErrors.email = "Email address is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }
    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!/^[+\d\s().-]+$/.test(formData.phone) || formData.phone.replace(/\D/g, "").length < 7 || formData.phone.replace(/\D/g, "").length > 15) {
      newErrors.phone = "Enter a valid phone number";
    }
    if (!formData.department.trim()) newErrors.department = "Department is required";
    if (!formData.section.trim()) newErrors.section = "Section is required";
    if (!formData.roll.trim()) newErrors.roll = "Roll number is required";
    if (!formData.enrollmentNumber.trim()) {
      newErrors.enrollmentNumber = "Enrollment Number (Primary Key) is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    if (attemptCheck && attemptCheck.isBlocked) {
      alert(
        `Access Denied: Enrollment Number "${formData.enrollmentNumber.trim()}" has already completed all 2 allowed attempts.\n\n` +
        "Policy: Exactly two attempts are permitted per student."
      );
      return;
    }

    if (!termsAccepted) {
      alert("Please review and accept the examination rules before proceeding.");
      return;
    }

    if (isOnline) {
      const isMobileNet = networkCheckStatus.isMobileNetwork;
      const netLabel = networkCheckStatus.networkLabel || (isMobileNet ? "Mobile Network / Cellular Data" : "Wi-Fi Network");

      const proceed = confirm(
        `Notice: Real Device Network is currently ONLINE!\n` +
        `Detected Connection: ${netLabel}\n\n` +
        "During the exam, an active network watchdog checks every 1.5 seconds whether your device is connected. " +
        "If you stay connected to Mobile Data or Wi-Fi, it will automatically submit the quiz immediately!\n\n" +
        (isMobileNet
          ? "• Action Required for Mobile Users: Turn OFF Mobile Data (Cellular) or enable Airplane Mode before beginning.\n\n"
          : "• Action Required: Turn OFF Wi-Fi and ensure Mobile Data is also OFF, or turn ON Airplane Mode.\n\n") +
        "Do you want to proceed anyway?"
      );
      if (!proceed) return;
    }

    setPendingStudent({
      ...formData,
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      department: formData.department.trim(),
      section: formData.section.trim(),
      roll: formData.roll.trim(),
      enrollmentNumber: formData.enrollmentNumber.trim().toUpperCase(),
    });
    setGateOpen(true);
  };

  if (gateOpen && pendingStudent) {
    return (
      <PythonAccessGate
        onExamUnlocked={() => {
          onToggleNetworkMode?.("REAL_DEVICE");
          onStartExam(pendingStudent, "REAL_DEVICE");
        }}
      />
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto py-6 px-4">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-5 sm:p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                <ShieldAlert className="w-3.5 h-3.5" />
                IEEE Proctored Examination System
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                <Lock className="w-3 h-3" />
                Max 2 Attempts Policy
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
             IEEE DAY SPECIAL
            </h1>
           
          </div>

          <div className="flex items-center gap-2 flex-wrap self-start sm:self-center">
            <div
              id="badge-sync-status"
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-300 rounded-xl shadow-2xs"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>System Ready</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="System Connected" />
            </div>

          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Column */}
        <div className="lg:col-span-7">
          <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl shadow-xs p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-4 pb-2 border-b border-slate-100 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" />
                Candidate Identity Information
              </span>
              <span className="text-[11px] text-slate-400 font-normal">
                Fields marked * are mandatory
              </span>
            </h2>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5" htmlFor="input-candidate-name">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
                  <input
                    id="input-candidate-name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Subhankar Das Adhikary"
                    className={`w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border rounded-lg focus:outline-hidden focus:ring-2 focus:bg-white transition-all ${
                      errors.name ? "border-rose-400 focus:ring-rose-200" : "border-slate-300 focus:ring-blue-200 focus:border-blue-500"
                    }`}
                  />
                </div>
                {errors.name && <p className="text-xs text-rose-500 mt-1">{errors.name}</p>}
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5" htmlFor="input-candidate-email">
                   Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
                  <input
                    id="input-candidate-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="e.g. subahnakr@gmail.com"
                    className={`w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border rounded-lg focus:outline-hidden focus:ring-2 focus:bg-white transition-all ${
                      errors.email ? "border-rose-400 focus:ring-rose-200" : "border-slate-300 focus:ring-blue-200 focus:border-blue-500"
                    }`}
                  />
                </div>
                {errors.email && <p className="text-xs text-rose-500 mt-1">{errors.email}</p>}
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5" htmlFor="input-candidate-phone">
                  Phone Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
                  <input
                    id="input-candidate-phone"
                    type="tel"
                    autoComplete="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="e.g. +1 555 123 4567"
                    className={`w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border rounded-lg focus:outline-hidden focus:ring-2 focus:bg-white transition-all ${
                      errors.phone ? "border-rose-400 focus:ring-rose-200" : "border-slate-300 focus:ring-blue-200 focus:border-blue-500"
                    }`}
                  />
                </div>
                {errors.phone && <p className="text-xs text-rose-500 mt-1">{errors.phone}</p>}
              </div>

              {/* Department & Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5" htmlFor="select-department">
                    Department <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
                    <input
                      id="input-department"
                      type="text"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      placeholder="Enter your department"
                      className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-200 focus:border-blue-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5" htmlFor="select-section">
                    Section <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Grid3X3 className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
                    <input
                      id="input-section"
                      type="text"
                      value={formData.section}
                      onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                      placeholder="Enter your section"
                      className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-200 focus:border-blue-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Roll Number & Enrollment Number (Primary Key) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5" htmlFor="input-roll-number">
                    Roll Number <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
                    <input
                      id="input-roll-number"
                      type="text"
                      value={formData.roll}
                      onChange={(e) => setFormData({ ...formData, roll: e.target.value })}
                      placeholder="e.g. ECE-3A-52"
                      className={`w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border rounded-lg focus:outline-hidden focus:ring-2 focus:bg-white transition-all ${
                        errors.roll ? "border-rose-400 focus:ring-rose-200" : "border-slate-300 focus:ring-blue-200 focus:border-blue-500"
                      }`}
                    />
                  </div>
                  {errors.roll && <p className="text-xs text-rose-500 mt-1">{errors.roll}</p>}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1" htmlFor="input-enrollment-number">
                      <span>Enrollment Number</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-md border border-blue-200 flex items-center gap-0.5">
                      <KeyRound className="w-3 h-3 text-blue-600" />
                      PRIMARY KEY
                    </span>
                  </div>
                  <div className="relative">
                    <IdCard className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
                    <input
                      id="input-enrollment-number"
                      type="text"
                      value={formData.enrollmentNumber}
                      onChange={(e) => setFormData({ ...formData, enrollmentNumber: e.target.value.toUpperCase() })}
                      placeholder="e.g. EN2024CS089"
                      className={`w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border rounded-lg focus:outline-hidden focus:ring-2 focus:bg-white font-mono uppercase transition-all ${
                        errors.enrollmentNumber || (attemptCheck && attemptCheck.isBlocked)
                          ? "border-rose-400 focus:ring-rose-200 bg-rose-50/40"
                          : "border-slate-300 focus:ring-blue-200 focus:border-blue-500"
                      }`}
                    />
                  </div>
                  {errors.enrollmentNumber && <p className="text-xs text-rose-500 mt-1">{errors.enrollmentNumber}</p>}
                </div>
              </div>

              {/* Attempt Tracker Status Card */}
              {formData.enrollmentNumber.trim() && (
                <div className="mt-2">
                  {isCheckingAttempts ? (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2 text-xs text-slate-500">
                      <RotateCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                      <span>Checking attempt history for <strong>{formData.enrollmentNumber}</strong>...</span>
                    </div>
                  ) : attemptCheck ? (
                    <div className={`p-3.5 rounded-xl border transition-all ${
                      attemptCheck.isBlocked
                        ? "bg-rose-50 border-rose-300 text-rose-900"
                        : attemptCheck.attemptCount === 1
                        ? "bg-amber-50 border-amber-300 text-amber-900"
                        : "bg-emerald-50 border-emerald-300 text-emerald-900"
                    }`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                            attemptCheck.isBlocked 
                              ? "bg-rose-200 text-rose-800" 
                              : attemptCheck.attemptCount === 1 
                              ? "bg-amber-200 text-amber-800" 
                              : "bg-emerald-200 text-emerald-800"
                          }`}>
                            {attemptCheck.isBlocked ? (
                              <AlertOctagon className="w-4 h-4" />
                            ) : (
                              <History className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-xs">
                                {attemptCheck.isBlocked
                                  ? "Attempt Limit Reached (2 of 2 Attempts Completed)"
                                  : attemptCheck.attemptCount === 1
                                  ? "Final Attempt 2 of 2 Available"
                                  : "Fresh Candidate: Attempt 1 of 2 Available"}
                              </h4>
                              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                                attemptCheck.isBlocked
                                  ? "bg-rose-100 text-rose-800 border-rose-300"
                                  : attemptCheck.attemptCount === 1
                                  ? "bg-amber-100 text-amber-800 border-amber-300"
                                  : "bg-emerald-100 text-emerald-800 border-emerald-300"
                              }`}>
                                {attemptCheck.attemptCount} / 2 USED
                              </span>
                            </div>
                            <p className="text-[11px] mt-0.5 leading-relaxed opacity-90">
                              {attemptCheck.message}
                            </p>

                            {/* Past attempt detail */}
                            {attemptCheck.pastAttempts && attemptCheck.pastAttempts.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center gap-3 text-[11px] font-mono">
                                <span>Past Attempt 1: <strong>{attemptCheck.pastAttempts[0].score}/{attemptCheck.pastAttempts[0].totalQuestions} ({attemptCheck.pastAttempts[0].percentage}%)</strong></span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {/* Device Network Readiness & Diagnostics Card */}
              <div className="pt-2 space-y-2.5">
                <div className={`p-4 rounded-xl border transition-all ${
                  isOnline 
                    ? networkCheckStatus.isMobileNetwork
                      ? "bg-rose-50/70 border-rose-200"
                      : "bg-amber-50/60 border-amber-200" 
                    : "bg-emerald-50/60 border-emerald-200"
                }`}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-lg ${
                        isOnline 
                          ? networkCheckStatus.isMobileNetwork
                            ? "bg-rose-100 text-rose-800"
                            : "bg-amber-100 text-amber-800" 
                          : "bg-emerald-100 text-emerald-800"
                      }`}>
                        {isOnline ? (
                          networkCheckStatus.isMobileNetwork ? (
                            <Smartphone className="w-4 h-4 text-rose-700 animate-pulse" />
                          ) : (
                            <Wifi className="w-4 h-4 text-amber-700" />
                          )
                        ) : (
                          <WifiOff className="w-4 h-4 text-emerald-700" />
                        )}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                          <span>Device Network:</span>
                          <span className={
                            isOnline 
                              ? networkCheckStatus.isMobileNetwork 
                                ? "text-rose-700 font-extrabold" 
                                : "text-amber-700 font-extrabold" 
                              : "text-emerald-700 font-extrabold"
                          }>
                            {isOnline 
                              ? networkCheckStatus.isMobileNetwork
                                ? `ONLINE (Mobile Network / Cellular Data${networkCheckStatus.effectiveType ? ` ${networkCheckStatus.effectiveType.toUpperCase()}` : ""})`
                                : `ONLINE (${networkCheckStatus.networkLabel || "Wi-Fi Connected"})`
                              : "OFFLINE (Ready for Examination)"}
                          </span>
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {networkCheckStatus.lastChecked 
                            ? `Active Check: Probed via ${networkCheckStatus.checkMethod === "probe" ? "real server HTTP probe" : "browser network adapter"}`
                            : "Probing network status..."}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={onCheckNetworkNow}
                      disabled={isCheckingNetwork}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg shadow-2xs flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <RotateCw className={`w-3 h-3 ${isCheckingNetwork ? "animate-spin text-blue-600" : ""}`} />
                      <span>{isCheckingNetwork ? "Checking..." : "Re-Check"}</span>
                    </button>
                  </div>

                  {isOnline && networkCheckStatus.isMobileNetwork && (
                    <div className="mb-2 p-2.5 rounded-lg bg-rose-100/70 border border-rose-200 text-rose-900 text-[11px] leading-relaxed">
                      <strong>⚠️ Mobile Network (Cellular Data) Active:</strong> Your smartphone or mobile adapter is currently using cellular data. Please turn OFF <strong>Mobile Data</strong> in your device settings or switch ON <strong>Airplane Mode</strong> before starting.
                    </div>
                  )}

                  <div className="text-[11px] text-slate-600 space-y-1 bg-white/70 p-2.5 rounded-lg border border-slate-200/60">
                    <p className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
                      <span>The exam is designed to be completed strictly in <strong>Offline Mode</strong>.</span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></span>
                      <span>If Mobile Data or Wi-Fi is detected during the exam, the watchdog <strong>auto-submits instantly</strong> to prevent tampering.</span>
                    </p>
                  </div>
                </div>

                {/* Anti-Copy Protection Integrity Notice */}
                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-700">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong>Anti-Cheating Safeguard Active:</strong> Copying, cutting, pasting, right-click, and unauthorized keyboard shortcuts are strictly prohibited and blocked by the proctoring engine.
                  </span>
                </div>
              </div>

              {/* Terms Acceptance */}
              <div className="pt-2">
                <label className="flex items-start gap-3 cursor-pointer group select-none">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-1 w-4 h-4 text-blue-600 rounded-sm border-slate-300 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="text-xs text-slate-600 group-hover:text-slate-900 leading-relaxed">
                    I verify that my <strong>Enrollment Number</strong> is accurate. I understand that I am permitted a maximum of <strong>two attempts</strong> and that my examination result will be securely logged.
                  </span>
                </label>
              </div>

              {/* Action Button */}
              <button
                type="submit"
                id="btn-start-examination"
                disabled={Boolean(attemptCheck && attemptCheck.isBlocked)}
                className={`w-full py-3 px-4 text-white font-semibold rounded-xl text-sm shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  attemptCheck && attemptCheck.isBlocked
                    ? "bg-slate-400 cursor-not-allowed opacity-60"
                    : "bg-blue-600 hover:bg-blue-700 active:bg-blue-800"
                }`}
              >
                {attemptCheck && attemptCheck.isBlocked ? (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Attempts Limit Reached (2/2 Completed)</span>
                  </>
                ) : (
                  <>
                    <span>Continue to Admission Check</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Instructions & Special Rules Column */}
        <div className="lg:col-span-5 space-y-4">
          {/* Rules Card */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              Crucial Examination Protocols
            </h3>

            <div className="space-y-3.5">
              {/* Rule 1: Attempt Limit */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50/60 border border-blue-200/80">
                <div className="p-1.5 bg-blue-100 text-blue-800 rounded-lg shrink-0 mt-0.5">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-blue-900">Strictly 2 Attempts Per Person</h4>
                  <p className="text-xs text-blue-800 mt-0.5 leading-relaxed">
                    <strong>Enrollment Number *</strong> serves as the Primary Key. Each candidate can take at most 2 attempts. All responses are logged securely.
                  </p>
                </div>
              </div>

              {/* Rule 2: Time Limit & Random Selection */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50/60 border border-amber-200/80">
                <div className="p-1.5 bg-amber-100 text-amber-800 rounded-lg shrink-0 mt-0.5">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-amber-900">20 Questions · 20-Minute Session</h4>
                  <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                    A countdown timer starts immediately (1 minute/question). 20 questions are automatically selected randomly from the question bank.
                  </p>
                </div>
              </div>

              {/* Rule 3: Offline Mode & Network Detection Auto-Submit */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-rose-50/70 border border-rose-200/90">
                <div className="p-1.5 bg-rose-100 text-rose-800 rounded-lg shrink-0 mt-0.5">
                  <WifiOff className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-rose-900">Offline Proctoring & Auto-Submit</h4>
                  <p className="text-xs text-rose-800 mt-0.5 leading-relaxed">
                    The exam must be taken offline. <strong>If anyone turns on the network or goes online</strong>, the system triggers instant auto-submission.
                  </p>
                </div>
              </div>

              {/* Rule 4: Toggled Question and Option View */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-indigo-50/70 border border-indigo-200/90">
                <div className="p-1.5 bg-indigo-100 text-indigo-800 rounded-lg shrink-0 mt-0.5">
                  <EyeOff className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-indigo-900">Cognitive Toggled View</h4>
                  <p className="text-xs text-indigo-800 mt-0.5 leading-relaxed">
                    At any time, <strong>either the Question OR the Options are displayed</strong>. When viewing options, only one option is shown at a time in a vertical toggle column.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Checklist */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-xs text-slate-600">
            <h4 className="font-semibold text-slate-800 mb-2.5">Candidate Checklist:</h4>
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Verify Roll number and Enrollment number before submission.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>One person is permitted exactly 2 attempts.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Solutions review unlocked after final submission.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
