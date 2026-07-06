import { useRef } from 'react';
import { ImagePlus, Link2 } from 'lucide-react';

type ImageUrlUploadProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  maxMb?: number;
  placeholder?: string;
};

export function ImageUrlUpload({
  label,
  value,
  onChange,
  hint,
  maxMb = 2,
  placeholder = 'https://...',
}: ImageUrlUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Selecione um arquivo de imagem (PNG, JPG ou SVG).');
      return;
    }
    if (file.size > maxMb * 1024 * 1024) {
      alert(`A imagem deve ter no máximo ${maxMb}MB.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange(String(reader.result ?? ''));
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">{label}</label>

      <div className="flex flex-col sm:flex-row gap-4 items-start">
        <div className="w-24 h-24 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 flex items-center justify-center overflow-hidden shrink-0">
          {value ? (
            <img src={value} alt="Preview" className="w-full h-full object-cover" />
          ) : (
            <ImagePlus className="text-gray-300 dark:text-slate-600" size={28} />
          )}
        </div>

        <div className="flex-1 w-full space-y-2">
          <input
            type="hidden"
            ref={inputRef}
            accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition-colors"
          >
            Escolher imagem
          </button>
          <p className="text-xs text-gray-500 dark:text-slate-400">PNG, JPG, SVG ou WebP — até {maxMb}MB</p>

          <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-slate-500">
            <Link2 size={14} />
            <span>ou cole uma URL</span>
          </div>
          <input
            type="url"
            value={value.startsWith('data:') ? '' : value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary outline-none text-sm"
          />
          {hint && <p className="text-xs text-gray-500 dark:text-slate-400">{hint}</p>}
        </div>
      </div>
    </div>
  );
}
