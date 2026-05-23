import { StrictMode, Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Catch any unhandled exceptions during runtime and display a premium diagnostic UI
window.addEventListener('error', (event) => {
  renderCrashReport(event.error || new Error(event.message));
});

window.addEventListener('unhandledrejection', (event) => {
  renderCrashReport(event.reason || new Error('Unhandled Promise Rejection'));
});

function renderCrashReport(error: Error) {
  // Evita renderizações duplicadas do relatório de erros
  if (document.getElementById('styleflow-crash-report')) return;

  const container = document.createElement('div');
  container.id = 'styleflow-crash-report';
  container.className = 'fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-md overflow-y-auto text-white';
  
  container.innerHTML = `
    <div class="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-2xl w-full shadow-2xl animate-in zoom-in-95 duration-200">
      <div class="flex items-center gap-4 mb-6">
        <div class="p-3 bg-rose-500/10 text-rose-500 rounded-2xl">
          <svg class="w-8 h-8 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
          </svg>
        </div>
        <div>
          <h2 class="text-2xl font-black tracking-tight text-white">Ops! Ocorreu um erro no StyleFlow 🛠️</h2>
          <p class="text-slate-400 text-sm mt-0.5">Nosso painel de diagnóstico detectou um erro de tempo de execução.</p>
        </div>
      </div>

      <div class="bg-slate-950 rounded-2xl p-5 mb-6 border border-slate-900 font-mono text-xs overflow-x-auto text-rose-400 max-h-72 overflow-y-auto leading-relaxed">
        <div class="font-bold text-sm text-rose-500 mb-2">${error?.name || 'Error'}: ${error?.message || 'Erro desconhecido'}</div>
        <div class="text-slate-450 whitespace-pre">${error?.stack || 'Sem rastreamento de pilha disponível.'}</div>
      </div>

      <div class="flex flex-col sm:flex-row gap-3 justify-end pt-4 border-t border-slate-800">
        <button id="crash-clear-btn" class="px-5 py-2.5 rounded-xl text-xs font-bold text-rose-450 border border-rose-500/20 hover:bg-rose-500/10 transition-all cursor-pointer">
          Limpar Sessão e Sair
        </button>
        <button id="crash-reload-btn" class="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20 active:scale-95 transition-all cursor-pointer">
          Recarregar Sistema
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  document.getElementById('crash-clear-btn')?.addEventListener('click', () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/login';
  });

  document.getElementById('crash-reload-btn')?.addEventListener('click', () => {
    window.location.reload();
  });
}

// React Error Boundary para capturar erros na árvore de componentes
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary detectou um erro crítico:", error, errorInfo);
    renderCrashReport(error);
  }

  render() {
    if (this.state.hasError) {
      // Retorna nulo pois o renderCrashReport cuidará de injetar o elemento full-screen na página
      return null;
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

