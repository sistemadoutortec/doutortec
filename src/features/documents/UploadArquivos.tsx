import React, { useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Upload, X, FileText, Image, Loader2 } from 'lucide-react';

export interface UploadedFileMetadata {
  id: string;
  nome: string;
  path: string;
  tipo: string;
  tamanho: number;
}

interface UploadArquivosProps {
  onUploadSuccess: (files: UploadedFileMetadata[]) => void;
  maxFiles?: number;
  initialFiles?: UploadedFileMetadata[];
}

export const UploadArquivos: React.FC<UploadArquivosProps> = ({ onUploadSuccess, maxFiles = 5, initialFiles = [] }) => {
  const { user } = useAuth();
  const [uploadedList, setUploadedList] = useState<UploadedFileMetadata[]>(initialFiles);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (initialFiles && initialFiles.length > 0) {
      setUploadedList(initialFiles);
    }
  }, [initialFiles]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const validateFile = (file: File): boolean => {
    const limit = 15 * 1024 * 1024; // 15MB
    if (file.size > limit) {
      setError(`O arquivo "${file.name}" ultrapassa o limite máximo de 15MB.`);
      return false;
    }

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError(`O tipo do arquivo "${file.name}" não é suportado. Envie imagens ou PDFs.`);
      return false;
    }

    return true;
  };

  const uploadFileToStorage = async (file: File) => {
    if (!user) {
      setError('Necessário estar autenticado para realizar uploads.');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const fileExt = file.name.split('.').pop();
      const uniqueId = crypto.randomUUID();
      const fileName = `${uniqueId}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('doutortec-documentos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const newUploaded: UploadedFileMetadata = {
        id: uniqueId,
        nome: file.name,
        path: filePath,
        tipo: file.type,
        tamanho: file.size
      };

      const updatedList = [...uploadedList, newUploaded];
      setUploadedList(updatedList);
      onUploadSuccess(updatedList);
    } catch (err: any) {
      console.error('Erro de upload:', err.message || err);
      setError(`Falha ao enviar o arquivo "${file.name}": ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (uploadedList.length >= maxFiles) {
      setError(`Limite máximo de ${maxFiles} arquivos atingido.`);
      return;
    }

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (validateFile(file)) {
        await uploadFileToStorage(file);
      }
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (uploadedList.length >= maxFiles) {
      setError(`Limite máximo de ${maxFiles} arquivos atingido.`);
      return;
    }

    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (validateFile(file)) {
        await uploadFileToStorage(file);
      }
    }
  };

  const handleRemove = async (indexToRemove: number) => {
    const fileToRemove = uploadedList[indexToRemove];
    setError(null);

    try {
      const { error: deleteError } = await supabase.storage
        .from('doutortec-documentos')
        .remove([fileToRemove.path]);

      if (deleteError) throw deleteError;

      const updatedList = uploadedList.filter((_, idx) => idx !== indexToRemove);
      setUploadedList(updatedList);
      onUploadSuccess(updatedList);
    } catch (err: any) {
      console.error('Erro ao remover arquivo:', err.message || err);
      setError(`Falha ao remover o arquivo: ${err.message}`);
    }
  };

  const triggerInputClick = () => {
    fileInputRef.current?.click();
  };

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm font-semibold text-gray-750 mb-1">
        Documentos / Exames Anexados
      </label>

      {/* Drag & Drop Area */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={triggerInputClick}
        className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 transition text-center cursor-pointer ${
          dragActive
            ? 'border-indigo-500 bg-indigo-50/50'
            : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50/50'
        } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInput}
          disabled={uploading}
          className="hidden"
          accept="application/pdf,image/*"
        />

        {uploading ? (
          <div className="flex flex-col items-center space-y-2 py-2">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            <span className="text-sm font-medium text-gray-600">Enviando arquivo médico com segurança...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-2">
            <div className="rounded-full bg-indigo-50 p-3 text-indigo-600">
              <Upload className="h-6 w-6" />
            </div>
            <div className="text-sm text-gray-600">
              <span className="font-semibold text-indigo-600">Clique para enviar</span> ou arraste o arquivo aqui
            </div>
            <div className="text-[10px] text-gray-400 uppercase tracking-wider">
              Imagens ou PDFs (Máx. 15MB)
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Uploaded Files List */}
      {uploadedList.length > 0 && (
        <div className="rounded-xl border border-gray-150 bg-white p-3 space-y-2 shadow-xs">
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-1">
            Arquivos prontos para envio ({uploadedList.length})
          </div>
          <div className="divide-y divide-gray-100">
            {uploadedList.map((file, index) => {
              const isPdf = file.tipo === 'application/pdf';
              return (
                <div key={file.id} className="flex items-center justify-between py-2 first:pt-0 last:pb-0 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-1.5 rounded-lg shrink-0 ${isPdf ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                      {isPdf ? <FileText className="h-4 w-4" /> : <Image className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-900 truncate" title={file.nome}>
                        {file.nome}
                      </p>
                      <p className="text-[10px] text-gray-500">
                        {formatSize(file.tamanho)}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(index);
                    }}
                    className="rounded-lg p-1 text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition shrink-0"
                    title="Remover"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
