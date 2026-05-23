import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Scissors, ArrowLeft, Loader2, Sparkles } from 'lucide-react';

interface ClientAuthProps {
  mode: 'login' | 'register';
}

export default function ClientAuth({ mode }: ClientAuthProps) {
  const { salonSlug } = useParams<{ salonSlug: string }>();
  const navigate = useNavigate();

  const [salonName, setSalonName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Se já estiver logado, redireciona para a página do salão diretamente
  useEffect(() => {
    const token = sessionStorage.getItem('client_token');
    const storedUser = sessionStorage.getItem('client_user');
    if (token && storedUser) {
      navigate(`/app/${salonSlug}`);
    }
  }, [salonSlug, navigate]);

  // Busca o nome do salão para carregar a marca no cabeçalho de login
  useEffect(() => {
    const fetchSalonInfo = async () => {
      try {
        const res = await fetch(`http://localhost:3333/api/v1/queue/public/${salonSlug}`);
        if (res.ok) {
          const json = await res.json();
          if (json?.salon?.name) {
            setSalonName(json.salon.name);
          }
        }
      } catch (err) {
        console.error('Erro ao carregar dados do salão:', err);
      }
    };
    
    if (salonSlug) {
      fetchSalonInfo();
    }
  }, [salonSlug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const isLogin = mode === 'login';
    const endpoint = isLogin ? '/api/v1/auth/login' : '/api/v1/auth/register';
    const payload = isLogin 
      ? { email, password } 
      : { 
          name, 
          email, 
          password, 
          role: 'CUSTOMER', // Sempre CLIENTE final nesta rota
          phone: phone.replace(/\D/g, '') 
        };

    try {
      const response = await fetch(`http://localhost:3333${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ocorreu um erro ao processar sua solicitação.');
      }

      if (isLogin) {
        // Login bem sucedido
        sessionStorage.setItem('client_token', data.token);
        sessionStorage.setItem('client_refreshToken', data.refreshToken);
        sessionStorage.setItem('client_user', JSON.stringify(data.user));
        
        setSuccess('Login realizado com sucesso! Redirecionando...');
        setTimeout(() => {
          navigate(`/app/${salonSlug}`);
        }, 1500);
      } else {
        // Cadastro bem sucedido
        setSuccess('Conta criada com sucesso! Carregando painel...');
        
        // Faz o login automático após o cadastro
        const loginRes = await fetch('http://localhost:3333/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const loginData = await loginRes.json();
        
        if (loginRes.ok) {
          sessionStorage.setItem('client_token', loginData.token);
          sessionStorage.setItem('client_refreshToken', loginData.refreshToken);
          sessionStorage.setItem('client_user', JSON.stringify(loginData.user));
          setTimeout(() => {
            navigate(`/app/${salonSlug}`);
          }, 1500);
        } else {
          // Fallback se o auto-login falhar
          setTimeout(() => {
            navigate(`/app/${salonSlug}/login`);
          }, 1500);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 transition-colors duration-300 px-4 relative overflow-hidden">
      
      {/* Botão de Voltar para a Fila Pública */}
      <Link 
        to={`/app/${salonSlug}`} 
        className="absolute top-6 left-6 inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 font-extrabold text-xs rounded-full border border-gray-200 dark:border-slate-700 transition-all shadow-sm hover:scale-105 active:scale-95"
      >
        <ArrowLeft size={16} />
        <span>Ver Fila de Espera</span>
      </Link>

      {/* Container Principal */}
      <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100 dark:border-slate-700 relative z-10">
        
        {/* Cabeçalho */}
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl text-white shadow-lg shadow-indigo-500/20 mb-4 hover:scale-105 transition-all duration-300">
            <Scissors size={32} />
          </div>
          
          <span className="px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest bg-gradient-to-r from-indigo-500 to-pink-500 text-white rounded-md mb-2 flex items-center gap-1 shadow-sm">
            <Sparkles size={10} />
            <span>Área do Cliente</span>
          </span>

          <h1 className="text-2xl font-black text-center text-gray-900 dark:text-white mt-1">
            {mode === 'login' ? 'Entrar no Salão' : 'Criar sua Conta'}
          </h1>
          <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mt-1.5 text-center">
            {salonName || salonSlug}
          </p>
        </div>

        {/* Mensagens de Sucesso ou Erro */}
        {error && (
          <div className="p-3 rounded-lg mb-6 text-sm text-center font-medium bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-950/30">
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 rounded-lg mb-6 text-sm text-center font-medium bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-950/30">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Campo Nome (Apenas no Cadastro) */}
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-1">Seu Nome Completo</label>
              <input 
                required 
                type="text" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                placeholder="Ex: João Silva" 
              />
            </div>
          )}

          {/* Campo Telefone (Apenas no Cadastro) */}
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-1">Telefone / WhatsApp</label>
              <input 
                required 
                type="text" 
                maxLength={15}
                value={phone} 
                onChange={e => {
                  let v = e.target.value.replace(/\D/g, '');
                  if (v.length > 11) v = v.slice(0, 11);
                  if (v.length > 2) v = `(${v.slice(0, 2)}) ${v.slice(2)}`;
                  if (v.length > 9) v = `${v.slice(0, 10)}-${v.slice(10)}`;
                  setPhone(v);
                }} 
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                placeholder="(11) 99999-9999" 
              />
            </div>
          )}

          {/* Campo E-mail */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-1">E-mail</label>
            <input 
              required 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
              placeholder="cliente@exemplo.com" 
            />
          </div>

          {/* Campo Senha */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-1">Senha</label>
            <input 
              required 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
              placeholder="Sua senha secreta" 
            />
          </div>

          <button 
            disabled={loading} 
            type="submit" 
            className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-500/20 hover:shadow-xl hover:shadow-indigo-500/30 transition-all duration-300 mt-6 active:scale-95 disabled:opacity-75 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Processando...</span>
              </>
            ) : (
              <span>{mode === 'login' ? 'Acessar Salão' : 'Cadastrar e Entrar'}</span>
            )}
          </button>
        </form>

        {/* Rodapé do Form com Links Alternativos */}
        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-slate-700 text-center">
          <p className="text-sm font-medium text-gray-600 dark:text-slate-400">
            {mode === 'login' ? 'Novo por aqui?' : 'Já possui uma conta?'}
            <Link 
              to={mode === 'login' ? `/app/${salonSlug}/cadastro` : `/app/${salonSlug}/login`} 
              className="ml-1.5 text-indigo-600 dark:text-indigo-400 font-extrabold hover:underline"
            >
              {mode === 'login' ? 'Crie sua conta' : 'Faça seu login'}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
