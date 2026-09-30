import React, { useEffect, useRef, useState } from "react";
import { ArrowRight, CheckCircle2, QrCode, RotateCcw, Video } from "lucide-react";

export const ENTRY_QR_CONTENT = "IEEE-PYTHON-GAME";
export const EXAM_QR_CONTENT = "IEEE-EXAM-START";

interface PythonAccessGateProps {
  onExamUnlocked: () => void;
}

type GateStage = "entry-scan" | "python-game" | "room-info" | "exam-scan";

const CODE_BLOCKS = [
  { id: "line-1", code: "value = 2", order: 0 },
  { id: "line-2", code: "value = value + 3", order: 1 },
  { id: "line-3", code: "print(value)", order: 2 },
  { id: "decoy-1", code: "print(value + 3)" },
  { id: "decoy-2", code: "value = 3" },
];

const QRScanner: React.FC<{
  expectedContent: string;
  onMatch: () => void;
  label: string;
}> = ({ expectedContent, onMatch, label }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let active = true;
    let controls: { stop: () => void } | undefined;

    import("@zxing/browser").then(({ BrowserQRCodeReader }) => {
      if (!active) return;
      return new BrowserQRCodeReader().decodeFromVideoDevice(undefined, video, (result, _error, scannerControls) => {
        controls = scannerControls;
        if (!active || !result) return;

        if (result.getText().trim() === expectedContent) {
          active = false;
          scannerControls.stop();
          onMatch();
        } else {
          setError("That is not the required code for this step.");
        }
      });
    }).then((scannerControls) => {
      if (!scannerControls) return;
      controls = scannerControls;
      if (!active) scannerControls.stop();
    }).catch(() => {
      if (active) setError("Camera unavailable. Allow camera access and try again.");
    });

    return () => {
      active = false;
      controls?.stop();
    };
  }, [expectedContent, onMatch]);

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg bg-slate-950 aspect-video">
        <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
      </div>
      <p className="text-sm text-slate-600">Center the {label} in the camera frame.</p>
      {error && <p role="status" className="text-sm text-rose-700">{error}</p>}
    </div>
  );
};

export const PythonAccessGate: React.FC<PythonAccessGateProps> = ({ onExamUnlocked }) => {
  const [stage, setStage] = useState<GateStage>("entry-scan");
  const [selectedBlocks, setSelectedBlocks] = useState<typeof CODE_BLOCKS>([]);
  const [gameError, setGameError] = useState("");

  const finishPythonGame = () => {
    if (selectedBlocks.length === 3 && selectedBlocks.every((block, index) => block.order === index)) {
      setGameError("");
      setStage("room-info");
      return;
    }
    setGameError("Not quite. Arrange the three lines so the program prints 5.");
  };

  const scanEntryQr = () => setStage("python-game");
  const scanExamQr = () => onExamUnlocked();

  return (
    <section className="mx-auto w-full max-w-2xl px-4 py-8">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <header className="border-b border-slate-200 bg-slate-50 px-5 py-4 sm:px-7">
          <p className="text-xs font-semibold uppercase text-slate-500">Admission Check</p>
          <h2 className="mt-1 text-xl font-bold text-slate-900">
            {stage === "entry-scan" && "Scan the entry QR code"}
            {stage === "python-game" && "Build the Python program"}
            {stage === "room-info" && "Python challenge complete"}
            {stage === "exam-scan" && "Scan the examination QR code"}
          </h2>
        </header>

        <div className="space-y-5 p-5 sm:p-7">
          {stage === "entry-scan" && (
            <>
              <p className="text-sm text-slate-600">The Python challenge opens after the correct entry code is scanned.</p>
              <QRScanner expectedContent={ENTRY_QR_CONTENT} onMatch={scanEntryQr} label="entry QR code" />
            </>
          )}

          {stage === "python-game" && (
            <>
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
                Arrange the three Python lines in order so the program prints <strong>5</strong>.
              </div>
              <div className="min-h-28 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3" aria-label="Selected Python lines">
                {selectedBlocks.length === 0 ? (
                  <p className="text-sm text-slate-500">Select code lines below, in order.</p>
                ) : selectedBlocks.map((block, index) => (
                  <div key={block.id} className="flex items-center gap-2 font-mono text-sm text-slate-800">
                    <span className="w-5 text-right text-slate-400">{index + 1}.</span>{block.code}
                  </div>
                ))}
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {CODE_BLOCKS.filter((block) => !selectedBlocks.some((selected) => selected.id === block.id)).map((block) => (
                  <button
                    key={block.id}
                    type="button"
                    onClick={() => setSelectedBlocks((current) => [...current, block])}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-3 text-left font-mono text-sm text-slate-800 hover:border-blue-500 hover:bg-blue-50"
                  >
                    {block.code}
                  </button>
                ))}
              </div>
              {gameError && <p role="alert" className="text-sm text-rose-700">{gameError}</p>}
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={finishPythonGame} disabled={selectedBlocks.length !== 3} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300">
                  Check program <ArrowRight className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => { setSelectedBlocks([]); setGameError(""); }} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  <RotateCcw className="h-4 w-4" /> Reset
                </button>
              </div>
            </>
          )}

          {stage === "room-info" && (
            <>
              <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                <div>
                  <p className="font-semibold text-emerald-950">Room B2LG2.8</p>
                  <p className="mt-1 text-sm text-emerald-900">Scan the second QR code at the room entrance to open the MCQ examination.</p>
                </div>
              </div>
              <button type="button" onClick={() => setStage("exam-scan")} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
                <QrCode className="h-4 w-4" /> Scan room QR code
              </button>
            </>
          )}

          {stage === "exam-scan" && (
            <>
              <p className="text-sm text-slate-600">The examination starts only after the correct room QR code is scanned.</p>
              <QRScanner expectedContent={EXAM_QR_CONTENT} onMatch={scanExamQr} label="room QR code" />
            </>
          )}

          {(stage === "entry-scan" || stage === "exam-scan") && (
            <p className="flex items-center gap-2 text-xs text-slate-500"><Video className="h-4 w-4" />Camera access is required to scan.</p>
          )}
        </div>
      </div>
    </section>
  );
};