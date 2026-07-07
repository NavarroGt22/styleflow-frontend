import { useRef } from 'react';
import { toast } from '../lib/toast';
import { ImagePlus, X } from 'lucide-react';

type ImageFileUploadProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  maxMb?: number;
  accept?: string;
  allowedLabel?: string;
  previewClassName?: string;
};

export function ImageFileUpload({
  label,
  value,
  onChange,
  hint,
  maxMb = 2,
  accept = 'image/png,image/jpeg,image/jpg,image/webp,image/svg+xml',
  allowedLabel = 'PNG, JPG, SVG ou WebP',
  previewClassName = 'object-cover',
}: ImageFileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File | undefined) => {
    if (!file) return;

    const isIco = file.name.toLowerCase().endsWith('.ico');
    const isImage = file.type.startsWith('image/') || isIco;
    if (!isImage) {
      toast.error(`Selecione um arquivo válido (${allowedLabel}).`);
      return;
    }
    if (file.size > maxMb * 1024 * 1024) {
      toast.info(`O arquivo deve ter no máximo ${maxMb}MB.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => onChange(String(reader.result ?? ''));
    reader.readAsDataURL(file);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">{label}</label>

      <div className="flex flex-col sm:flex-row gap-4 items-start">
        <div className="w-24 h-24 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 flex items-center justify-center overflow-hidden shrink-0">
          {value ? (
            <img src={value} alt="Preview" className={`w-full h-full ${previewClassName}`} />
          ) : (
            <ImagePlus className="text-gray-300 dark:text-slate-600" size={28} />
          )}
        </div>

        <div className="flex-1 w-full space-y-2">
          <input
            type="file"
            ref={inputRef}
            accept={accept}
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition-colors"
            >
              Escolher arquivo
            </button>
            {value && (
              <button
                type="button"
                onClick={() => onChange('')}
                className="px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-1"
              >
                <X size={14} /> Remover
              </button>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-slate-400">
            {allowedLabel} — até {maxMb}MB
          </p>
          {hint && <p className="text-xs text-gray-500 dark:text-slate-400">{hint}</p>}
        </div>
      </div>
    </div>
  );
}
