type ClientPageLoaderProps = {
  label?: string;
  primaryColor?: string;
};

export default function ClientPageLoader({
  label = 'Carregando...',
  primaryColor = '#d5a85c',
}: ClientPageLoaderProps) {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4"
      style={{ background: '#0b0d0e', color: '#f5f5f4' }}
    >
      <div
        className="relative mb-6 h-14 w-14 rounded-full border"
        style={{ borderColor: `${primaryColor}55`, boxShadow: `0 0 24px ${primaryColor}18` }}
      >
        <div
          className="absolute inset-1 rounded-full border-2 border-t-transparent motion-safe:animate-spin"
          style={{ borderColor: `${primaryColor} transparent transparent transparent` }}
        />
      </div>
      <p
        className="text-xs font-semibold uppercase tracking-[0.22em]"
        style={{ color: '#a1a1aa' }}
      >
        {label}
      </p>
    </div>
  );
}
