import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import './PDFUpload.css';
import { FileUp, FileText, X, Loader2 } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

interface PDFUploadProps {
  onUpload: (text: string, fileName: string) => void;
  onRemove: () => void;
}

export default function PDFUpload({ onUpload, onRemove }: PDFUploadProps) {
  const [isExtracting, setIsExtracting] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRemove = () => {
    setFileName(null);
    setError(null);
    onRemove();
  };

  const extractText = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      setError('File is too large. Please upload a PDF smaller than 10MB.');
      return;
    }

    setIsExtracting(true);
    setFileName(file.name);
    setError(null);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
        useWorkerFetch: true,
        isEvalSupported: false,
      });

      const pdf = await loadingTask.promise;
      let fullText = '';

      for (let i = 1; i <= pdf.numPages; i++) {
        try {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item: any) => item.str).join(' ');
          fullText += pageText + '\n';
        } catch (pageError) {
          console.warn(`Failed to extract text from page ${i}:`, pageError);
        }
      }

      if (!fullText.trim()) {
        throw new Error('No text content found in PDF. It might be an image-only scan.');
      }

      onUpload(fullText, file.name);
    } catch (err: any) {
      console.error('PDF extraction failed:', err);
      const message = err.message || 'Failed to read PDF. Please try another file.';
      setError(message.includes('worker') ? 'PDF engine error. Please refresh and try again.' : message);
      setFileName(null);
    } finally {
      setIsExtracting(false);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      extractText(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false,
  } as any);

  if (fileName) {
    return (
      <div className="pdf-upload-loaded">
        <div className="pdf-upload-icon">
          {isExtracting ? <Loader2 size={20} className="pdf-spin" /> : <FileText size={20} />}
        </div>
        <div className="pdf-upload-meta">
          <p>{fileName}</p>
          <span>{isExtracting ? 'Analyzing module...' : 'Module loaded'}</span>
        </div>
        <button type="button" className="pdf-upload-remove" onClick={handleRemove}>
          <X size={18} />
        </button>
      </div>
    );
  }

  return (
    <div className="pdf-upload">
      <div
        {...getRootProps()}
        className={`pdf-upload-zone ${isDragActive ? 'pdf-upload-zone--active' : ''}`}
      >
        <input {...getInputProps()} />
        <div className="pdf-upload-drop-icon">
          <FileUp size={32} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <h3>Upload Study Module</h3>
          <p>PDF only. Max 10MB.</p>
        </div>
      </div>
      {error && <p className="pdf-upload-error">{error}</p>}
    </div>
  );
}
