import { AlertCircle, CheckCircle, File, Loader2,Upload, X } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { useUploadFileMutation } from "@/features/dashboard/dashboardApi";

interface FileUploaderProps {
  onUploadSuccess: (url: string) => void;
  label?: string;
  accept?: string;
  maxSizeMB?: number;
}

export function FileUploader({
  onUploadSuccess,
  label = "Upload file",
  accept = "*",
  maxSizeMB = 10,
}: FileUploaderProps) {
  const [uploadFile, { isLoading, error }] = useUploadFileMutation();
  const [dragActive, setDragActive] = React.useState(false);
  const [uploadedFile, setUploadedFile] = React.useState<any>(null);
  const [uploadError, setUploadError] = React.useState<string | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processFile(e.target.files[0]);
    }
  };

  const processFile = async (file: File) => {
    setUploadError(null);

    // Check size limit
    if (file.size > maxSizeMB * 1024 * 1024) {
      setUploadError(`File size exceeds the ${maxSizeMB}MB limit.`);
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await uploadFile(formData).unwrap();
      setUploadedFile(response);
      onUploadSuccess(response.url);
    } catch (err: any) {
      setUploadError(err?.data?.message || "Failed to upload file");
    }
  };

  const handleClear = () => {
    setUploadedFile(null);
    setUploadError(null);
  };

  return (
    <div className="w-full">
      {!uploadedFile ? (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-white/50 p-6 text-center transition-all dark:bg-zinc-950/20 ${
            dragActive
              ? "border-neutral-900 bg-neutral-50/50 dark:border-white dark:bg-zinc-900/50"
              : "border-neutral-200 hover:border-neutral-400 dark:border-zinc-800 dark:hover:border-zinc-700"
          }`}
        >
          <input
            type="file"
            accept={accept}
            onChange={handleFileChange}
            disabled={isLoading}
            className="hidden"
            id="file-upload-input"
          />
          <label
            htmlFor="file-upload-input"
            className="flex w-full cursor-pointer flex-col items-center"
          >
            {isLoading ? (
              <Loader2 className="mb-3 h-8 w-8 animate-spin text-neutral-400 dark:text-neutral-500" />
            ) : (
              <Upload className="mb-3 h-8 w-8 text-neutral-400 dark:text-neutral-500" />
            )}
            <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
              {isLoading ? "Uploading..." : label}
            </p>
            <p className="mt-1 text-[10px] text-neutral-400 dark:text-neutral-500">
              Drag & drop or click to browse (Max {maxSizeMB}MB)
            </p>
          </label>

          {(uploadError || error) && (
            <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-rose-500">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>{uploadError || "Upload failed. Please try again."}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white/50 p-3 dark:border-zinc-800 dark:bg-zinc-950/20">
          <div className="rounded-xl bg-neutral-100 p-2 text-neutral-700 dark:bg-zinc-900 dark:text-neutral-300">
            <File className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-neutral-900 dark:text-neutral-100">
              {uploadedFile.originalName}
            </p>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
                {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
              </span>
              <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-500">
                <CheckCircle className="h-3 w-3" /> Ready
              </span>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleClear}
            className="h-8 w-8 cursor-pointer rounded-full hover:bg-neutral-100 dark:hover:bg-zinc-900"
          >
            <X className="h-4 w-4 text-neutral-400 hover:text-neutral-700" />
          </Button>
        </div>
      )}
    </div>
  );
}
