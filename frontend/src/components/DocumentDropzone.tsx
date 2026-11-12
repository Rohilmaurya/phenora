import React, { useState, useRef } from "react";
import { UploadCloud, CheckCircle2, AlertCircle, FileText, Download } from "lucide-react";
import { ThinkingOrb } from "thinking-orbs";
import { extractDocumentText } from "../lib/api";

interface DocumentDropzoneProps {
  onTextExtracted: (text: string, filename: string) => void;
  theme?: "light" | "dark";
}

export const DocumentDropzone: React.FC<DocumentDropzoneProps> = ({
  onTextExtracted,
  theme = "light",
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileProcess = async (file: File) => {
    setIsUploading(true);
    setErrorMessage(null);
    setUploadStatus(`Reading ${file.name} into volatile RAM…`);

    try {
      const response = await extractDocumentText(file);
      onTextExtracted(response.extracted_text, file.name);
      setUploadStatus(
        `Parsed ${response.page_count} page(s) via ${
          response.extraction_method === "native_pdf_stream"
            ? "native digital PDF stream"
            : "local air-gapped OCR"
        }`
      );
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to parse document");
      setUploadStatus(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileProcess(e.target.files[0]);
    }
  };

  const handleLoadSamplePdf = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsUploading(true);
    setErrorMessage(null);
    setUploadStatus("Loading sample_pediatric_consultation.pdf into volatile RAM…");

    try {
      const res = await fetch("/sample_pediatric_consultation.pdf");
      if (!res.ok) throw new Error("Sample PDF file not found on local server");
      const blob = await res.blob();
      const file = new File([blob], "sample_pediatric_consultation.pdf", { type: "application/pdf" });
      await handleFileProcess(file);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load sample PDF");
      setUploadStatus(null);
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept=".pdf,.txt,.png,.jpg,.jpeg,.tiff"
        className="hidden"
      />

      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick();
          }
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
        className={`border border-dashed rounded-xl px-3.5 py-2.5 cursor-pointer transition-[border-color,background-color,box-shadow] duration-150 flex flex-wrap items-center justify-between gap-2 ${
          isDragging
            ? "border-teal-600 bg-teal-50/70 dark:border-teal-400 dark:bg-teal-950/40 shadow-xs"
            : "border-[#cfcfc8] bg-[#fafaf8] hover:border-teal-600/70 hover:bg-white dark:border-[#363631] dark:bg-[#181816] dark:hover:border-teal-400/70 dark:hover:bg-[#1e1e1b]"
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {isUploading ? (
            <ThinkingOrb state="working" size={20} theme={theme} aria-hidden="true" />
          ) : (
            <div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-950/60 border border-teal-200/80 dark:border-teal-800/70 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0">
              <UploadCloud className="w-3.5 h-3.5" />
            </div>
          )}

          <div className="text-xs leading-tight">
            <span className="font-semibold text-[#111] dark:text-[#f3f3ee]">Drop PDF/scan</span>
            <span className="text-[#66665f] dark:text-[#a1a196]"> or browse (RAM-only)</span>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px] shrink-0">
          <button
            type="button"
            onClick={handleLoadSamplePdf}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200/80 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800 dark:hover:bg-blue-900/60 cursor-pointer"
          >
            <FileText className="w-3 h-3" />
            <span>Load test PDF</span>
          </button>
          <a
            href="/sample_pediatric_consultation.pdf"
            download="sample_pediatric_consultation.pdf"
            onClick={(e) => e.stopPropagation()}
            className="p-1 rounded text-[#66665f] hover:text-[#111] hover:bg-[#efefeb] dark:text-[#a1a196] dark:hover:text-[#f3f3ee] dark:hover:bg-[#262622] transition-colors"
            title="Download sample consultation PDF"
            aria-label="Download sample consultation PDF"
          >
            <Download className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {uploadStatus && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-1.5 text-[11px] text-teal-800 dark:text-teal-300 font-mono bg-teal-50/80 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 px-2.5 py-1 rounded-lg"
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400 shrink-0" />
          <span>{uploadStatus}</span>
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="flex items-center gap-1.5 text-[11px] text-rose-800 dark:text-rose-300 font-mono bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 px-2.5 py-1 rounded-lg"
        >
          <AlertCircle className="w-3.5 h-3.5 text-rose-700 dark:text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
