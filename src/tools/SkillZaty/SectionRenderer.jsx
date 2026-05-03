import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { 
  FileText, Music, Image as ImageIcon, Globe, FileStack, Video, 
  ChevronDown, ChevronUp, ZoomIn, ZoomOut, X, ChevronLeft, ChevronRight 
} from 'lucide-react';

// Setup worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// Enhanced PDF Viewer using react-pdf
const PDFViewer = ({ fileUrl }) => {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
  }

  return (
    <div className="flex flex-col border border-gray-200 rounded-2xl overflow-hidden bg-gray-100 shadow-sm transition-all">
      <div className="p-4 bg-white border-b border-gray-200 flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
          <FileStack size={20} className="text-blue-500" />
          <span>Interactive Document</span>
        </div>
        
        <div className="flex items-center gap-3 bg-gray-50 p-1.5 rounded-xl border border-gray-100">
          <button 
            onClick={() => setPageNumber(prev => Math.max(prev - 1, 1))}
            disabled={pageNumber <= 1}
            className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg text-gray-500 disabled:opacity-30 transition-all"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-xs font-bold text-gray-600 min-w-[60px] text-center">
            {pageNumber} <span className="text-gray-300 mx-1">/</span> {numPages || '--'}
          </span>
          <button 
            onClick={() => setPageNumber(prev => Math.min(prev + 1, numPages || prev))}
            disabled={pageNumber >= numPages}
            className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg text-gray-500 disabled:opacity-30 transition-all"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setScale(prev => Math.max(prev - 0.2, 0.5))}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
            title="Zoom Out"
          >
            <ZoomOut size={18} />
          </button>
          <span className="text-[10px] font-bold text-gray-400 w-10 text-center uppercase">{Math.round(scale * 100)}%</span>
          <button 
            onClick={() => setScale(prev => Math.min(prev + 0.2, 3.0))}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
            title="Zoom In"
          >
            <ZoomIn size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-8 flex justify-center bg-gray-200/50 min-h-[500px] border-y border-gray-200 custom-scrollbar">
        <div className="shadow-2xl">
          <Document
            file={fileUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={
              <div className="flex flex-col items-center py-12">
                <Loader2 size={32} className="animate-spin text-blue-500 mb-2" />
                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Loading PDF...</p>
              </div>
            }
            error={
              <div className="p-8 text-center text-red-500">
                <p className="font-bold">Failed to load PDF</p>
                <p className="text-xs mt-1">Please check your network or file URL.</p>
              </div>
            }
          >
            <Page 
              pageNumber={pageNumber} 
              scale={scale} 
              renderAnnotationLayer={false}
              renderTextLayer={false}
              className="rounded-sm border border-gray-300"
            />
          </Document>
        </div>
      </div>
      
      <div className="p-3 bg-gray-50 text-[10px] text-gray-400 font-bold uppercase tracking-widest text-center">
        Secure Inline Read Mode — Downloads Restricted
      </div>
    </div>
  );
};

const Loader2 = ({ size, className }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

const AudioPlayer = ({ fileUrl, title }) => {
  return (
    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600">
          <Music size={20} />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-gray-900">{title || 'Audio Lesson'}</h4>
          <p className="text-xs text-gray-500">Audio Player</p>
        </div>
      </div>
      <audio controls controlsList="nodownload" className="w-full h-10">
        <source src={fileUrl} type="audio/mpeg" />
        Your browser does not support the audio element.
      </audio>
    </div>
  );
};

const ImageRenderer = ({ fileUrl, caption }) => {
  const [isZoomed, setIsZoomed] = useState(false);

  return (
    <div className="space-y-2">
      <div 
        className="relative group cursor-zoom-in rounded-lg overflow-hidden border border-gray-200 shadow-sm"
        onClick={() => setIsZoomed(true)}
      >
        <img src={fileUrl} alt={caption || 'Content'} className="w-full h-auto block" />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="bg-white/90 p-2 rounded-full shadow-lg">
            <ZoomIn size={20} className="text-gray-700" />
          </div>
        </div>
      </div>
      {caption && <p className="text-sm text-gray-500 text-center italic">{caption}</p>}

      {/* Lightbox */}
      {isZoomed && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setIsZoomed(false)}
        >
          <button className="absolute top-6 right-6 text-white hover:text-gray-300">
            <X size={32} />
          </button>
          <img 
            src={fileUrl} 
            alt={caption || 'Zoomed Content'} 
            className="max-w-full max-h-full object-contain shadow-2xl" 
          />
        </div>
      )}
    </div>
  );
};

const VideoRenderer = ({ videoUrl }) => {
  // Convert youtu.be or watch?v= to /embed/
  const getEmbedUrl = (url) => {
    if (!url) return '';
    let id = '';
    if (url.includes('youtube.com/watch?v=')) {
      id = url.split('v=')[1]?.split('&')[0];
    } else if (url.includes('youtu.be/')) {
      id = url.split('youtu.be/')[1]?.split('?')[0];
    } else if (url.includes('youtube.com/embed/')) {
      return url;
    }
    
    if (id) return `https://www.youtube.com/embed/${id}`;
    
    // Handle Vimeo
    if (url.includes('vimeo.com/')) {
      const vimeoId = url.split('vimeo.com/')[1]?.split('?')[0];
      if (vimeoId) return `https://player.vimeo.com/video/${vimeoId}`;
    }
    
    return url;
  };

  const embedUrl = getEmbedUrl(videoUrl);

  return (
    <div className="aspect-video w-full rounded-xl overflow-hidden border border-gray-200 shadow-lg bg-black">
      <iframe
        src={embedUrl}
        title="Training Video"
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
};

const ActiveCard = ({ title, color, collapsible, defaultOpen, children_blocks }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen !== false);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm mb-6 transition-all duration-300">
      <div 
        className="px-4 py-3 flex items-center justify-between cursor-pointer"
        style={{ backgroundColor: `${color}15` }}
        onClick={() => collapsible && setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: color || '#f97316' }}></div>
          <h3 className="font-bold text-gray-900">{title}</h3>
        </div>
        {collapsible && (
          <div className="text-gray-500">
            {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
        )}
      </div>
      
      {(!collapsible || isOpen) && (
        <div className="p-5 bg-white space-y-6">
          {children_blocks?.map(child => (
            <div key={child.id}>
              <SectionRenderer section={child} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const SectionRenderer = ({ section }) => {
  if (!section) return null;

  switch (section.type) {
    case 'rich-text':
      return (
        <div 
          className="prose prose-sm md:prose-base max-w-none 
            prose-h2:text-gray-900 prose-h2:font-bold prose-h2:mb-4 
            prose-p:text-gray-700 prose-p:leading-relaxed 
            prose-strong:text-gray-900 prose-li:text-gray-700"
          dangerouslySetInnerHTML={{ __html: section.content }}
        />
      );

    case 'pdf':
      return <PDFViewer fileUrl={section.fileUrl} />;

    case 'audio':
      return <AudioPlayer fileUrl={section.fileUrl} title={section.title} />;

    case 'image':
      return <ImageRenderer fileUrl={section.fileUrl} caption={section.caption} />;

    case 'html':
      return (
        <div 
          className="skillzaty-html-container bg-white"
          dangerouslySetInnerHTML={{ __html: section.htmlContent }}
        />
      );

    case 'video':
      return <VideoRenderer videoUrl={section.videoUrl} />;

    case 'active-card':
      return (
        <ActiveCard 
          title={section.title}
          color={section.color}
          collapsible={section.collapsible}
          defaultOpen={section.defaultOpen}
          children_blocks={section.children}
        />
      );

    default:
      return (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm italic">
          Unknown section type: {section.type}
        </div>
      );
  }
};

export default SectionRenderer;
