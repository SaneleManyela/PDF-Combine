import { useState } from 'react';
import { Upload, FileText, X, Download, Loader2 } from 'lucide-react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

interface PDFFile {
  id: string;
  name: string;
  file: File;
}

function App() {
  const [pdfFiles, setPdfFiles] = useState<PDFFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [mergedPdfUrl, setMergedPdfUrl] = useState<string | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(
      (file) => file.type === 'application/pdf'
    );
    addFiles(files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      addFiles(files);
    }
  };

  const addFiles = (files: File[]) => {
    const newPdfFiles = files.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      file,
    }));
    setPdfFiles((prev) => [...prev, ...newPdfFiles]);
    setMergedPdfUrl(null);
  };

  const removeFile = (id: string) => {
    setPdfFiles((prev) => prev.filter((pdf) => pdf.id !== id));
  };

  const mergePDFs = async () => {
    if (pdfFiles.length === 0) return;

    setIsMerging(true);
    try {
      const mergedPdf = await PDFDocument.create();
      const font = await mergedPdf.embedFont(StandardFonts.HelveticaBold);

      for (const pdfFile of pdfFiles) {
        const headingPage = mergedPdf.addPage();
        const { width, height } = headingPage.getSize();
        const text = pdfFile.name.replace(/\.pdf$/i, '');
        const fontSize = 36;
        const textWidth = font.widthOfTextAtSize(text, fontSize);
        const maxWidth = width - 80;
        const scale = textWidth > maxWidth ? maxWidth / textWidth : 1;
        headingPage.drawText(text, {
          x: (width - textWidth * scale) / 2,
          y: height / 2,
          size: fontSize * scale,
          font,
          color: rgb(0.15, 0.23, 0.33),
        });

        const arrayBuffer = await pdfFile.file.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }

      const mergedPdfBytes = await mergedPdf.save();
      const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setMergedPdfUrl(url);
    } catch (error) {
      console.error('Error merging PDFs:', error);
      alert('Failed to merge PDFs. Please ensure all files are valid PDF documents.');
    } finally {
      setIsMerging(false);
    }
  };

  const downloadMergedPDF = () => {
    if (!mergedPdfUrl) return;

    const link = document.createElement('a');
    link.href = mergedPdfUrl;
    link.download = 'merged-document.pdf';
    link.click();
  };

  const clearAll = () => {
    setPdfFiles([]);
    if (mergedPdfUrl) {
      URL.revokeObjectURL(mergedPdfUrl);
      setMergedPdfUrl(null);
    }
  };

  return (
    <div className="app-shell">
      <div className="theme-layout">
        <div className="theme-card">
          <div className="mb-8 text-center">
            <h1 className="theme-title">PDF Merger</h1>
            <p className="theme-subtitle">Upload multiple PDFs and combine them into one document</p>
          </div>

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`theme-upload ${isDragging ? 'is-dragging' : ''}`}
          >
            <Upload className="theme-upload-icon" />
            <p className="theme-upload-copy">Drop PDF files here or click to browse</p>
            <p className="theme-helper-text">You can upload multiple PDF files at once</p>
            <input
              type="file"
              accept=".pdf,application/pdf"
              multiple
              onChange={handleFileInput}
              className="hidden"
              id="file-input"
            />
            <label htmlFor="file-input" className="theme-button-primary theme-button-inline">
              Select PDFs
            </label>
          </div>

          {pdfFiles.length > 0 && (
            <div className="theme-files-wrap">
              <div className="theme-files-header">
                <h2 className="theme-section-title">Uploaded Files ({pdfFiles.length})</h2>
                <button onClick={clearAll} className="theme-clear-button">
                  Clear All
                </button>
              </div>

              <div className="space-y-3">
                {pdfFiles.map((pdf, index) => (
                  <div key={pdf.id} className="theme-file-item">
                    <div className="theme-file-meta">
                      <span className="theme-file-badge">{index + 1}</span>
                      <FileText className="theme-file-icon" />
                      <span className="theme-file-name">{pdf.name}</span>
                    </div>
                    <button onClick={() => removeFile(pdf.id)} className="theme-remove-button">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="theme-actions">
                <button
                  onClick={mergePDFs}
                  disabled={isMerging || pdfFiles.length === 0}
                  className="theme-button-primary theme-button-wide"
                >
                  {isMerging ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Merging PDFs...
                    </>
                  ) : (
                    'Merge PDFs'
                  )}
                </button>

                {mergedPdfUrl && (
                  <button onClick={downloadMergedPDF} className="theme-button-secondary theme-button-wide">
                    <Download className="w-5 h-5" />
                    Download Merged PDF
                  </button>
                )}
              </div>
            </div>
          )}

          {pdfFiles.length === 0 && (
            <div className="theme-empty-state">
              <p>No PDFs uploaded yet. Start by adding some files above.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
