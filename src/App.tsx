import { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { Login } from './features/auth/Login';
import { Register } from './features/auth/Register';
import { DashboardLayout } from './layouts/DashboardLayout';
import { CriarCaso } from './features/cases/CriarCaso';
import { ListaCasos } from './features/cases/ListaCasos';
import { DetalhesCaso } from './features/cases/DetalhesCaso';
import { AprovacaoCadastros } from './features/auth/AprovacaoCadastros';
import { GerenciamentoPerfis } from './features/auth/GerenciamentoPerfis';
import { RankingEspecialistas } from './features/ranking/RankingEspecialistas';
import { PainelFinanceiro } from './features/finance/PainelFinanceiro';
import { Relatorios } from './features/reports/Relatorios';
import { Especialidades } from './features/especialidades/Especialidades';
import { Especialistas } from './features/especialistas/Especialistas';
import { Municipios } from './features/municipios/Municipios';
import { Pacientes } from './features/pacientes/Pacientes';
import { Distribucao } from './features/distribuicao/Distribucao';
import { Dashboard } from './features/dashboard/Dashboard';
import { supabase } from './lib/supabase';
import type { CasoClinico } from './types';

function App() {
  const { user, perfil, loading, signOut } = useAuth();
  const [isRegisterPage, setIsRegisterPage] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedCaso, setSelectedCaso] = useState<CasoClinico | null>(null);

  // Helper to handle tab switching and clean detailed views
  const handleTabChange = (tab: string) => {
    setSelectedCaso(null);
    setActiveTab(tab);
  };

  const handleSelectCasoById = async (casoId: string) => {
    try {
      const { data, error } = await supabase
        .from('casos')
        .select('*')
        .eq('id', casoId)
        .single();
      if (error) throw error;
      if (data) {
        setSelectedCaso(data as CasoClinico);
      }
    } catch (err) {
      console.error('Erro ao abrir caso por notificação:', err);
    }
  };

  // 1. Loading State
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <svg className="animate-spin h-10 w-10 text-indigo-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-gray-600 font-medium text-sm">Carregando informações...</span>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated State
  if (!user) {
    if (isRegisterPage) {
      return (
        <Register
          onSwitchToLogin={() => setIsRegisterPage(false)}
          onRegisterSuccess={() => setIsRegisterPage(false)}
        />
      );
    }
    return (
      <Login
        onSwitchToRegister={() => setIsRegisterPage(true)}
      />
    );
  }

  // 3. Authenticated but Pending/Rejected State
  const isApproved = perfil?.status_cadastro === 'aprovado';
  if (!isApproved) {
    const isRejeitado = perfil?.status_cadastro === 'rejeitado';

    return (
      <div 
        className="flex min-h-screen items-center justify-center px-4 py-12"
        style={{ background: 'radial-gradient(circle, #28ffb2 0%, #0448af 100%)' }}
      >
        <div 
          className="w-full max-w-md space-y-6 rounded-2xl p-8 shadow-2xl text-center"
          style={{ backgroundColor: '#091151' }}
        >
          <div className="flex flex-col items-center gap-3">
            <img src="/Logo-Doutortec.png" alt="Doutortec" className="h-24 w-auto object-contain mb-1" />
          </div>

          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-800 border border-slate-750">
            {isRejeitado ? (
              <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-6 w-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
          </div>
          <div>
            <h2 className="mt-4 text-2xl font-bold text-white">
              {isRejeitado ? 'Acesso Rejeitado' : 'Cadastro em Análise'}
            </h2>
            <p className="mt-2 text-sm text-slate-350">
              Olá, <strong className="text-white">{perfil?.nome || user.email}</strong>.
            </p>
            <p className="mt-4 text-sm text-slate-400 leading-relaxed">
              {isRejeitado
                ? 'Sua solicitação de acesso à plataforma foi rejeitada pela administração. Caso ache que isso seja um erro, entre em contato.'
                : 'Seus dados de registro e credenciais médicas estão sendo avaliados pelo administrador do sistema. Você receberá acesso assim que sua conta for aprovada.'}
            </p>
            <div className="mt-6 p-4 rounded-lg bg-[#000530] text-left border border-slate-700/50 space-y-2 text-xs text-slate-300">
              <div><strong className="text-slate-400">Perfil Solicitado:</strong> {perfil?.role === 'especialista' ? 'Especialista' : 'Solicitante'}</div>
              <div><strong className="text-slate-400">Unidade:</strong> {perfil?.instituicao} - {perfil?.municipio}</div>
              {perfil?.crm_coren && <div><strong className="text-slate-400">Documento:</strong> {perfil.crm_coren}</div>}
              <div><strong className="text-slate-400">Status:</strong> <span className={`font-semibold ${isRejeitado ? 'text-red-400' : 'text-amber-400'}`}>{perfil?.status_cadastro || 'Aguardando sincronização'}</span></div>
            </div>
          </div>
          <div className="mt-6">
            <button
              onClick={() => signOut()}
              className="w-full rounded-lg bg-slate-800 hover:bg-slate-700 px-4 py-2.5 text-sm font-semibold text-white transition border border-slate-700/50"
            >
              Sair da Conta
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Helper to render layout content based on activeTab
  const renderTabContent = () => {
    // If a case has been selected, render details view
    if (selectedCaso) {
      return (
        <DetalhesCaso
          caso={selectedCaso}
          onBack={() => setSelectedCaso(null)}
          onUpdateCaso={() => {
            // Can reload or do something if needed
          }}
        />
      );
    }

    // 1. Create clinical case (exclusive to Solicitante)
    if (activeTab === 'criar-caso' && perfil?.role === 'solicitante') {
      return (
        <CriarCaso
          onSuccess={() => handleTabChange('casos')}
          onCancel={() => handleTabChange('casos')}
          onNavigateToPacientes={() => handleTabChange('pacientes')}
        />
      );
    }

    // 2. Cases list tab (applicable to all approved roles)
    if (activeTab === 'casos' || activeTab === 'meus-casos') {
      return (
        <div className="space-y-5">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#56657c] mb-0.5">Sistema de Teleconsultoria</p>
              <h3 className="text-lg font-bold" style={{ color: '#002157' }}>Casos Clínicos</h3>
              <p className="text-xs text-[#56657c] mt-0.5">Histórico completo e andamento das interconsultas solicitadas</p>
            </div>
            {perfil?.role === 'solicitante' && (
              <button
                onClick={() => handleTabChange('criar-caso')}
                className="rounded-lg px-4.5 py-2.5 text-xs font-bold text-white transition shadow-sm flex items-center gap-1"
                style={{ backgroundColor: '#0ea5e9' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#0284c7'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#0ea5e9'}
              >
                + Novo Caso Clínico
              </button>
            )}
          </div>
          <ListaCasos
            onSelectCaso={(caso) => setSelectedCaso(caso)}
            onCreateCaso={perfil?.role === 'solicitante' ? () => handleTabChange('criar-caso') : undefined}
          />
        </div>
      );
    }

    // 3. Dashboard Tab (Overview and Stats Summary)
    if (activeTab === 'dashboard') {
      return (
        <Dashboard
          onSelectCaso={(caso) => setSelectedCaso(caso)}
          onNavigate={handleTabChange}
        />
      );
    }

    // 4. Admin approval panel
    if (perfil?.role === 'admin' && activeTab === 'aprovacao') {
      return <AprovacaoCadastros />;
    }

    if (perfil?.role === 'admin' && activeTab === 'gerenciamento-perfis') {
      return <GerenciamentoPerfis />;
    }

    // 5. Ranking tab
    if (activeTab === 'ranking') {
      return <RankingEspecialistas />;
    }

    // 6. Finance tab
    if (activeTab === 'financeiro') {
      return <PainelFinanceiro />;
    }

    // 7. Reports tab
    if (activeTab === 'relatorios') {
      return <Relatorios />;
    }

    // 8. Especialidades tab
    if (activeTab === 'especialidades') {
      return <Especialidades />;
    }

    // 9. Especialistas tab
    if (activeTab === 'especialistas') {
      return <Especialistas />;
    }

    // 10. Municípios tab (Admin only)
    if (activeTab === 'municipios') {
      return <Municipios />;
    }

    // 11. Pacientes tab (Admin + Solicitante)
    if (activeTab === 'pacientes') {
      return <Pacientes />;
    }

    // 12. Distribuicao tab (Admin + Telerregulador)
    if (activeTab === 'distribuicao') {
      return <Distribucao />;
    }

    // Default simulation content for other tabs (Financeiro, Ranking, etc.)
    return (
      <div className="rounded-xl bg-white p-8 shadow-xs border border-gray-200">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Sistema de Teleconsultoria</p>
        <h3 className="text-lg font-bold" style={{ color: '#0f2a54' }}>Módulo de {activeTab}</h3>
        <p className="mt-2 text-sm text-gray-500">
          A interface para o módulo de <strong style={{ color: '#0f2a54' }} className="uppercase">{activeTab}</strong> será construída nas próximas etapas funcionais da plataforma.
        </p>
      </div>
    );
  };

  // 4. Authenticated and Approved Dashboard Wrapper
  return (
    <DashboardLayout activeTab={activeTab} setActiveTab={handleTabChange} onSelectCasoId={handleSelectCasoById}>
      {renderTabContent()}
    </DashboardLayout>
  );
}

export default App;
