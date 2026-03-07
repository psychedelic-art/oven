'use client';

import React, { useRef, useState } from 'react';
import { cn } from '../../lib/utils';

export interface FileUploadProps {
  label?: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  onChange?: (files: FileList | null) => void;
  error?: string;
  accept?: string;
  maxSize?: number;
  multiple?: boolean;
  className?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export function FileUpload({
  label,
  name,
  required,
  disabled,
  onChange,
  error,
  accept,
  maxSize,
  multiple = false,
  className,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [sizeError, setSizeError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = (files: FileList | null) => {
    setSizeError(null);

    if (!files || files.length === 0) {
      setSelectedFiles([]);
      onChange?.(null);
      return;
    }

    if (maxSize) {
      for (let i = 0; i < files.length; i++) {
        if (files[i].size > maxSize) {
          setSizeError(
            `File "${files[i].name}" exceeds max size of ${formatFileSize(maxSize)}`
          );
          return;
        }
      }
    }

    setSelectedFiles(Array.from(files));
    onChange?.(files);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!disabled) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleRemoveFile = (index: number) => {
    const updated = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(updated);
    if (updated.length === 0) {
      onChange?.(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const displayError = sizeError || error;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label className="text-sm font-medium text-gray-700">
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={cn(
          'flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-gray-300 bg-white px-6 py-8 text-center cursor-pointer transition-colors',
          'hover:border-blue-400 hover:bg-blue-50/50',
          isDragging && 'border-blue-500 bg-blue-50',
          disabled && 'cursor-not-allowed opacity-50 hover:border-gray-300 hover:bg-white',
          displayError && 'border-red-500'
        )}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-8 w-8 text-gray-400"
        >
          <path d="M9.25 13.25a.75.75 0 0 0 1.5 0V4.636l2.955 3.129a.75.75 0 0 0 1.09-1.03l-4.25-4.5a.75.75 0 0 0-1.09 0l-4.25 4.5a.75.75 0 1 0 1.09 1.03L9.25 4.636v8.614Z" />
          <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
        </svg>
        <div className="flex flex-col gap-1">
          <p className="text-sm text-gray-600">
            <span className="font-medium text-blue-600">Click to upload</span>{' '}
            or drag and drop
          </p>
          {accept && (
            <p className="text-xs text-gray-400">
              Accepted: {accept}
            </p>
          )}
          {maxSize && (
            <p className="text-xs text-gray-400">
              Max size: {formatFileSize(maxSize)}
            </p>
          )}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        name={name}
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={handleChange}
        className="sr-only"
        tabIndex={-1}
      />

      {selectedFiles.length > 0 && (
        <ul className="flex flex-col gap-1">
          {selectedFiles.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
            >
              <span className="truncate text-gray-700">{file.name}</span>
              <div className="flex items-center gap-2 ml-2 shrink-0">
                <span className="text-xs text-gray-400">
                  {formatFileSize(file.size)}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFile(index);
                  }}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                  aria-label={`Remove ${file.name}`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-4 w-4"
                  >
                    <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                  </svg>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {displayError && <p className="text-sm text-red-500">{displayError}</p>}
    </div>
  );
}

export default FileUpload;
