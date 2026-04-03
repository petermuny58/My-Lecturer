import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import './PDFUpload.css';
import { FileUp, FileText, X, Loader2, BrainCircuit } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { db } from '../lib/firebase';
import { collection, addDoc, query, getDocs, deleteDoc, writeBatch, VectorValue } from 'firebase/firestore';
import { generateEmbedding } from '../lib/gemini';
// @ts-ignore
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface PDFUploadProps {
  uid: string;
  onUpload: (text: string, fileName: string) => void;
  onRemove: () => void;
  initialFileName?: string | null;
}

export default function PDFUpload({ uid, onUpload, onRemove, initialFileName }: PDFUploadProps) {
  const [isExtracting, setIsExtracting] = useState(false);
  const [isIndexing, setIsIndexing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(initialFileName || null);
  const [error, setError] = useState<string | null>(null);

  // Sync initialFileName prop to local state (important for async loading from DB)
  React.useEffect(() => {
    if (initialFileName) {
      setFileName(initialFileName);
    }
  }, [initialFileName]);

  const handleRemove = async () => {
    setFileName(null);
    setError(null);
    onRemove();
    
    // Clear old chunks from Firestore and IndexedDB
    try {
      const q = query(collection(db, 'users', uid, 'chunks'));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();

      const { deleteModule } = await import('../lib/db');
      await deleteModule(uid);
    } catch (err) {
      console.warn("Failed to clear module data:", err);
    }
  };

  const chunkText = (text: string, size: number = 1000) => {
    const chunks: string[] = [];
    const words = text.split(/\s+/);
    let currentChunk = "";

    for (const word of words) {
      if ((currentChunk + word).length > size && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = "";
      }
      currentChunk += word + " ";
    }
    if (currentChunk.trim()) chunks.push(currentChunk.trim());
    return chunks;
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

      setIsExtracting(false);
      setIsIndexing(true);

      // 1. Clear previous chunks
      const q = query(collection(db, 'users', uid, 'chunks'));
      const oldChunks = await getDocs(q);
      const batch = writeBatch(db);
      oldChunks.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();

      // 2. Chunk and Index
      const chunks = chunkText(fullText);
      for (const chunk of chunks) {
        const embedding = await generateEmbedding(chunk);
        await addDoc(collection(db, 'users', uid, 'chunks'), {
          text: chunk,
          // @ts-ignore - VectorValue constructor exists in Firestore 11+ but types might be lagging
          embedding: new VectorValue(embedding),
          fileName: file.name,
          timestamp: new Date()
        });
      }

      // 3. Save to IndexedDB for persistence
      const { saveModule } = await import('../lib/db');
      await saveModule({
        id: uid,
        text: fullText,
        fileName: file.name,
        timestamp: Date.now()
      });

      onUpload(fullText, file.name);
    } catch (err: any) {
      console.error('PDF processing failed:', err);
      const message = err.message || 'Failed to process PDF. Please try another file.';
      setError(message.includes('worker') ? 'PDF engine error. Please refresh and try again.' : message);
      setFileName(null);
    } finally {
      setIsExtracting(false);
      setIsIndexing(false);
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
          {isExtracting || isIndexing ? <Loader2 size={20} className="pdf-spin" /> : <FileText size={20} />}
        </div>
        <div className="pdf-upload-meta">
          <p>{fileName}</p>
          <span>
            {isExtracting ? 'Reading module...' : isIndexing ? 'Building long-term memory...' : 'Module loaded'}
          </span>
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
