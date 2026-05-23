import { Link, useNavigate } from 'react-router-dom';
import { Scissors, AlertTriangle, ArrowLeft, Home, HelpCircle } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4 transition-colors duration-300 relative overflow-hidden">
      {/* Decorative premium gradients in the background */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-500/10 dark:bg-indigo-500/5 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-purple-500/10 dark:bg-purple-500/5 blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-gray-200/50 dark:border-slate-700/50 p-8 sm:p-10 rounded-3xl shadow-2xl relative z-10 transition-all duration-300">
        
        {/* Animated Icon header */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-indigo-500/20 dark:bg-indigo-500/30 blur-xl rounded-full scale-125 animate-pulse"></div>
            <div className="p-4 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white rounded-2xl relative shadow-lg hover:scale-105 hover:rotate-6 transition-all duration-300">
              <Scissors size={40} className="animate-wiggle" />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-amber-500 text-white p-1 rounded-lg shadow-md border border-white dark:border-slate-800">
              <AlertTriangle size={14} />
            </div>
          </div>

          <span className="px-3 py-1 text-[11px] font-black uppercase tracking-widest bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-full mb-3 border border-indigo-150 dark:border-indigo-900/30">
            Erro 404 • Página Não Encontrada
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-center text-gray-900 dark:text-white tracking-tight">
            Caminho Inexistente
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-2.5 text-center max-w-md leading-relaxed">
            A URL acessada não corresponde a nenhuma rota ativa no ecossistema StyleFlow.
          </p>
        </div>

        {/* Helpful URL diagnosis container */}
        <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 mb-8">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-400 dark:text-slate-500 flex items-center gap-1.5 mb-3">
            <HelpCircle size={14} className="text-indigo-500" />
            Dica de Endereço (URL)
          </h3>
          
          <div className="space-y-3.5 text-xs sm:text-sm text-gray-600 dark:text-slate-350">
            <p className="leading-relaxed">
              O StyleFlow separa links administrativos de vitrines públicas usando <strong className="text-gray-900 dark:text-white font-bold">Slugs Dinâmicos</strong>:
            </p>
            
            <ul className="space-y-2.5 pl-1.5 border-l-2 border-indigo-500/30">
              <li className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
                <span className="font-bold text-gray-800 dark:text-slate-200 min-w-[130px] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Vitrine Pública:
                </span>
                <code className="px-2 py-0.5 bg-slate-200/50 dark:bg-slate-800/80 rounded font-mono text-[11px] sm:text-xs text-indigo-600 dark:text-indigo-400 select-all">
                  /app/nome-do-salao
                </code>
              </li>
              <li className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
                <span className="font-bold text-gray-800 dark:text-slate-200 min-w-[130px] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                  Painel da Equipe:
                </span>
                <code className="px-2 py-0.5 bg-slate-200/50 dark:bg-slate-800/80 rounded font-mono text-[11px] sm:text-xs text-indigo-600 dark:text-indigo-400 select-all">
                  /admin/nome-do-salao
                </code>
              </li>
            </ul>

            <p className="text-[11px] text-amber-600 dark:text-amber-400 leading-relaxed font-medium mt-2">
              ⚠️ Se você incluiu barras adicionais ou parâmetros extras (ex: <code className="px-1 bg-amber-50 dark:bg-amber-950/20 rounded font-mono">/app/:salonSlug/outro-texto</code>), o roteador não conseguirá processar a URL.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex-1 px-5 py-3 rounded-xl border border-gray-250 dark:border-slate-700 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-850 text-gray-700 dark:text-slate-200 font-bold text-sm transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowLeft size={16} />
            Voltar
          </button>
          
          <Link
            to="/login"
            className="flex-1 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 transition-all active:scale-95 flex items-center justify-center gap-2 text-center decoration-transparent"
          >
            <Home size={16} />
            Página de Login
          </Link>
        </div>
        
        {/* Footer info */}
        <div className="mt-8 pt-6 border-t border-gray-150/60 dark:border-slate-700/50 text-center">
          <p className="text-[11px] text-gray-400 dark:text-slate-500">
            StyleFlow SaaS • Precisa de ajuda? Entre em contato com o suporte técnico.
          </p>
        </div>

      </div>
    </div>
  );
}
