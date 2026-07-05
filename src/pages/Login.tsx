import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scissors } from 'lucide-react';
import { useAppContextOptional } from '../context/AppContext';
import { apiUrl } from '../config/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const appContext = useAppContextOptional();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const response = await fetch(apiUrl('/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'E-mail ou senha incorretos.');
      }
      
      const user = data.user;
      
      // Se for cliente final, barramos o login no painel corporativo geral
      if (user.role === 'CUSTOMER') {
        throw new Error('Acesso negado. Este portal é exclusivo para donos e profissionais da equipe.');
      }
      
      // Salva o token de segurança, refresh token e os dados do usuário no navegador
      sessionStorage.setItem('token', data.token);
      sessionStorage.setItem('refreshToken', data.refreshToken);
      sessionStorage.setItem('user', JSON.stringify(user));
      appContext?.setSession(user, data.token, data.refreshToken);
      
      if (user.role === 'SUPER_ADMIN') {
        navigate('/admin/super');
      } else if (user.role === 'OWNER') {
        if (user.salons && user.salons.length > 0) {
          navigate(`/admin/${user.salons[0].slug}`);
        } else {
          navigate('/admin/novo');
        }
      } else if (user.role === 'PROFESSIONAL') {
        const salonSlug = user.professionalProfile?.salon?.slug || user.salons?.[0]?.slug;
        if (salonSlug) {
          navigate(`/admin/${salonSlug}`);
        } else {
          setError('Você não está associado a nenhum salão. Contate o administrador.');
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-muted dark:bg-slate-900 transition-colors px-4">
      <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100 dark:border-slate-700">
        
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl mb-4">
            <Scissors size={32} />
          </div>
          <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-white">
            Painel StyleFlow
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-2 text-center">
            Área administrativa e de equipe de atendimento.
          </p>
        </div>
        
        {error && (
          <div className="p-3 rounded-lg mb-6 text-sm text-center font-medium bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">E-mail</label>
            <input 
              required 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
              placeholder="voce@exemplo.com" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Senha</label>
            <input 
              required 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
              placeholder="••••••••" 
            />
          </div>
          
          <button 
            disabled={loading} 
            type="submit" 
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg font-medium transition-all shadow-sm hover:shadow-md mt-4 disabled:opacity-70"
          >
            {loading ? 'Carregando...' : 'Entrar no Painel'}
          </button>
        </form>
        
        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-slate-700 text-center">
          <p className="text-xs text-gray-450 dark:text-slate-500">
            Para controle de acesso e segurança, as credenciais são auditadas eletronicamente de acordo com as diretrizes da LGPD.
          </p>
        </div>
      </div>
    </div>
  );
}
