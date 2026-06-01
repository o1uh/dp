export default function GlobalLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs font-semibold text-gray-400">Загрузка...</span>
          <span className="text-[9px] font-mono text-gray-600 uppercase tracking-widest">Платформа AUDIO.AI</span>
        </div>
      </div>
    </div>
  );
}