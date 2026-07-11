import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, ZoomIn, ZoomOut, RotateCw, Download, Loader2 } from 'lucide-react';

interface VisualizadorDocumentosProps {
  nome: string;
  path: string;
  tipo: string;
  onClose: () => void;
}

export const VisualizadorDocumentos: React.FC<VisualizadorDocumentosProps> = ({
  nome,
  path,
  tipo,
  onClose
}) => {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Image states
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    const fetchSignedUrl = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Since bucket is private, we must create a signed URL
        const { data, error: signedError } = await supabase.storage
          .from('DOUTORTEC-DOCUMENTOS')
          .createSignedUrl(path, 120); // 2 minutes expiry

        if (signedError) throw signedError;
        
        setUrl(data.signedUrl);
      } catch (err: any) {
        console.error('Erro ao gerar URL assinada:', err.message || err);
        setError('Não foi possível carregar o arquivo médico com segurança.');
      } finally {
        setLoading(false);
      }
    };

    fetchSignedUrl();
  }, [path]);

  const handleZoomIn = () => {
    if (zoom < 200) setZoom(prev => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    if (zoom > 50) setZoom(prev => Math.max(prev - 25, 50));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const isPdf = tipo === 'application/pdf' || nome.toLowerCase().endsWith('.pdf');
  const isImage = tipo.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(nome);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-xs select-none">
      {/* Toolbar */}
      <header className="flex h-14 items-center justify-between border-b border-gray-800 bg-gray-900/80 px-4 text-white">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold" title={nome}>
            {nome}
          </h3>
          <p className="text-[10px] text-gray-400 uppercase tracking-wider">
            Visualização Segura
          </p>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-2">
          {isImage && !loading && !error && (
            <>
              <button
                onClick={handleZoomOut}
                disabled={zoom <= 50}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white disabled:opacity-30 transition"
                title="Reduzir Zoom"
              >
                <ZoomOut className="h-5 w-5" />
              </button>
              <span className="text-xs text-gray-450 w-10 text-center font-mono">
                {zoom}%
              </span>
              <button
                onClick={handleZoomIn}
                disabled={zoom >= 200}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white disabled:opacity-30 transition"
                title="Aumentar Zoom"
              >
                <ZoomIn className="h-5 w-5" />
              </button>
              <button
                onClick={handleRotate}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white transition"
                title="Rotacionar 90°"
              >
                <RotateCw className="h-5 w-5" />
              </button>
            </>
          )}

          {url && (
            <a
              href={url}
              download={nome}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white transition"
              title="Download Direto"
            >
              <Download className="h-5 w-5" />
            </a>
          )}

          <div className="h-6 w-px bg-gray-800 mx-1" />

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white transition"
            title="Fechar Visualizador"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Viewport Content */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-4 relative">
        {loading && (
          <div className="flex flex-col items-center space-y-2 text-gray-450">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            <span className="text-xs font-semibold uppercase tracking-wider">Descriptografando arquivo...</span>
          </div>
        )}

        {error && (
          <div className="text-center text-red-500 max-w-sm px-4">
            <p className="font-semibold text-sm">{error}</p>
          </div>
        )}

        {!loading && !error && url && (
          <div className="w-full h-full flex items-center justify-center">
            {isImage ? (
              <img
                src={url}
                alt={nome}
                style={{
                  transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                  transition: 'transform 0.2s ease-in-out',
                  maxHeight: '80vh',
                  maxWidth: '90vw',
                  objectFit: 'contain'
                }}
                className="shadow-2xl rounded-sm"
              />
            ) : isPdf ? (
              <iframe
                src={`${url}#toolbar=0`}
                title={nome}
                className="w-full h-full max-w-5xl rounded-lg shadow-2xl bg-white border border-gray-800"
              />
            ) : (
              <div className="text-center text-gray-400">
                <p className="text-sm font-semibold mb-4">Tipo de arquivo não suportado para visualização direta.</p>
                <a
                  href={url}
                  download={nome}
                  className="rounded-lg bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-xs font-semibold text-white transition inline-flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Baixar Arquivo
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
