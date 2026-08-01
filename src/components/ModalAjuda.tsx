import React, { useState, useMemo } from 'react';
import {
  X,
  Search,
  BookOpen,
  User,
  Stethoscope,
  ShieldAlert,
  ChevronRight,
  ChevronDown,
  PlusCircle,
  FileText,
  Eye,
  CheckCircle2,
  MessageSquare,
  Clock,
  Bell,
  Sparkles,
  TrendingUp,
  Coins,
  ShieldCheck,
  RefreshCw,
  FileBarChart,
  HelpCircle,
  Info
} from 'lucide-react';

interface ModalAjudaProps {
  isOpen: boolean;
  onClose: () => void;
  defaultRole?: 'solicitante' | 'especialista' | 'admin';
}

interface TopicoAjuda {
  id: string;
  titulo: string;
  icon: React.ComponentType<{ className?: string }>;
  tags: string[];
  conteudo: React.ReactNode;
  detalhes?: string[];
}

export const ModalAjuda: React.FC<ModalAjudaProps> = ({
  isOpen,
  onClose,
  defaultRole
}) => {
  const [activeTab, setActiveTab] = useState<'solicitante' | 'especialista' | 'admin'>(
    defaultRole || 'solicitante'
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({});

  // Toggle topics open/close
  const toggleTopic = (id: string) => {
    setExpandedTopics(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Content definition for Aba 1: Solicitante / Clínico
  const solicitanteTopics = useMemo<TopicoAjuda[]>(() => [
    {
      id: 'sol-criar',
      titulo: '1. Criar Solicitação de Interconsulta',
      icon: PlusCircle,
      tags: ['nova solicitação', 'anexo', 'paciente', 'prioridade', 'termo'],
      conteudo: (
        <div className="space-y-3">
          <p className="text-xs text-gray-600 leading-relaxed">
            O fluxo de interconsulta começa com o preenchimento de um caso clínico detalhado para distribuição aos especialistas.
          </p>
          <div className="bg-sky-50 border border-sky-100 rounded-lg p-3 text-xs space-y-2 text-sky-900">
            <h5 className="font-bold flex items-center gap-1">
              <Info className="h-3.5 w-3.5" /> Passo a Passo
            </h5>
            <ol className="list-decimal pl-4 space-y-1">
              <li>Clique no botão <strong>"+ Nova Solicitação"</strong> ou <strong>"+ Novo Caso Clínico"</strong> no Dashboard/Tela de Casos.</li>
              <li>Preencha os dados do paciente (nome, CPF, município, instituição).</li>
              <li>Selecione a <strong>Especialidade</strong> desejada e defina a <strong>Prioridade</strong> (Baixa, Média, Alta ou Crítica).</li>
              <li>Escreva o histórico clínico, conduta médica atual e a dúvida clínica específica.</li>
              <li>Anexe múltiplos documentos de exames com suporte a arrastar-e-soltar (PDF, PNG, JPG de até 15MB por arquivo).</li>
              <li>Aceite formalmente o <strong>termo de responsabilidade legal</strong>.</li>
              <li>Confirme o envio. O caso será distribuído automaticamente ao especialista disponível.</li>
            </ol>
          </div>
        </div>
      ),
      detalhes: [
        'Upload limite de 15MB por arquivo',
        'Aceite obrigatório dos termos de responsabilidade',
        'Campos obrigatórios: Paciente, Especialidade, Dúvida Clínica, Histórico Clínico'
      ]
    },
    {
      id: 'sol-acompanhamento',
      titulo: '2. Acompanhamento e Notificações',
      icon: Clock,
      tags: ['sla', 'notificação', 'chat', 'tempo real', 'mensagens'],
      conteudo: (
        <div className="space-y-3">
          <p className="text-xs text-gray-600 leading-relaxed">
            Após a criação do caso, você pode monitorar todo o ciclo de vida do atendimento e interagir em tempo real com o especialista.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
              <span className="font-bold text-gray-800 flex items-center gap-1 mb-1">
                <Clock className="h-3.5 w-3.5 text-amber-500" /> Indicador de SLA
              </span>
              <p className="text-gray-600 text-[11px] leading-relaxed">
                Cada caso possui um cronômetro visual de SLA exibindo o tempo restante para resposta. Fique atento às cores do badge indicador (Verde = No prazo, Laranja = Próximo ao vencimento, Vermelho = Atrasado).
              </p>
            </div>
            <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
              <span className="font-bold text-gray-800 flex items-center gap-1 mb-1">
                <Bell className="h-3.5 w-3.5 text-red-500 animate-pulse" /> Notificações em Tempo Real
              </span>
              <p className="text-gray-600 text-[11px] leading-relaxed">
                Você receberá alertas instantâneos no header (sinalizados por um badge vermelho pulsante) sempre que um especialista aceitar, responder ou enviar mensagens no caso.
              </p>
            </div>
          </div>
          <div className="bg-sky-50 border border-sky-100 rounded-lg p-3 text-xs text-sky-900">
            <span className="font-bold flex items-center gap-1 mb-1">
              <MessageSquare className="h-3.5 w-3.5" /> Chat de Interconsulta Integrado
            </span>
            <p className="text-[11px] leading-relaxed">
              Use a interface de chat profissional para tirar dúvidas rápidas, receber esclarecimentos ou enviar novos anexos diretamente ao especialista. O chat identifica claramente quem enviou a mensagem (Solicitante vs Especialista) com carimbo de data/hora (timestamps) em português.
            </p>
          </div>
        </div>
      ),
      detalhes: [
        'Indicador visual de SLA em tempo real nos cards e detalhes',
        'Notificações sonoras e badges com contagem de pendências',
        'Chat integrado com suporte para upload de exames adicionais durante a conversa'
      ]
    },
    {
      id: 'sol-visualizador',
      titulo: '3. Visualizador de Documentos',
      icon: Eye,
      tags: ['zoom', 'rotação', 'pdf', 'imagem', 'tela cheia', 'exame'],
      conteudo: (
        <div className="space-y-3">
          <p className="text-xs text-gray-600 leading-relaxed">
            Visualize exames, laudos e documentos anexados diretamente no Doutortec, sem a necessidade de baixar arquivos adicionais ou abrir programas externos.
          </p>
          <div className="bg-gray-905 text-slate-800 rounded-lg p-3.5 text-xs space-y-2.5 border border-[#b2c4d6]">
            <div className="flex items-center justify-between border-b border-gray-200 pb-1.5">
              <span className="font-bold text-[#0ea5e9] flex items-center gap-1.5">
                <FileText className="h-4 w-4" /> Painel de Ferramentas do Visualizador
              </span>
              <span className="text-[10px] text-gray-400 font-mono">Toolbar de Visualização</span>
            </div>
            <ul className="space-y-2 text-[11px] text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-[#0ea5e9] font-bold shrink-0">🔍 Zoom Dinâmico:</span> <span>Ajuste o tamanho da visualização de <strong>50% a 200%</strong> para examinar pequenos detalhes de imagens de raio-x, tomografias ou laudos.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#0ea5e9] font-bold shrink-0">🔄 Rotação 90°:</span> <span>Gire imagens de exames que foram escaneadas em posições incorretas para melhor leitura.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#0ea5e9] font-bold shrink-0">📄 Navegação por Páginas:</span> <span>Para PDFs de múltiplas páginas, navegue sequencialmente usando as setas da toolbar e o indicador de páginas.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#0ea5e9] font-bold shrink-0">🖥️ Modo Tela Cheia:</span> <span>Expanda a janela de visualização para ocupar a tela inteira, otimizando o diagnóstico clínico de imagens de alta resolução.</span>
              </li>
            </ul>
          </div>
        </div>
      ),
      detalhes: [
        'Navegação entre páginas de PDFs complexos',
        'Ferramentas integradas para download seguro',
        'Visualização compatível com formatos PDF, PNG, JPG, JPEG e WEBP'
      ]
    },
    {
      id: 'sol-avaliacao',
      titulo: '4. Avaliação e Encerramento',
      icon: CheckCircle2,
      tags: ['encerrar', 'avaliar', 'satisfação', 'finalizar', 'arquivar'],
      conteudo: (
        <div className="space-y-3">
          <p className="text-xs text-gray-600 leading-relaxed">
            Uma vez que o médico especialista emite o parecer final de interconsulta, cabe ao solicitante finalizar o caso clínico.
          </p>
          <div className="border border-emerald-200 rounded-lg p-3 bg-emerald-50 text-xs text-emerald-950 space-y-2">
            <h5 className="font-bold flex items-center gap-1 text-emerald-800">
              <CheckCircle2 className="h-4 w-4" /> Processo de Arquivamento
            </h5>
            <ol className="list-decimal pl-4 space-y-1.5 text-[11px] leading-relaxed">
              <li>Acesse os detalhes do caso marcado como <strong>"Respondido"</strong>.</li>
              <li>Revise a conduta clínica, o parecer técnico e as referências sugeridas pelo especialista.</li>
              <li>Clique no botão destacado <strong>"Avaliar e Encerrar"</strong>.</li>
              <li>Preencha o formulário obrigatório de avaliação de satisfação (atribua nota e adicione observações sobre a conduta proposta).</li>
              <li>Confirme para finalizar. O caso será arquivado no histórico de interconsultas com o status <strong>"Finalizado"</strong>.</li>
            </ol>
          </div>
        </div>
      ),
      detalhes: [
        'Avaliação de satisfação é obrigatória para encerramento do caso',
        'Casos fechados não podem mais receber mensagens no chat por questões de auditoria médica',
        'Condutas e históricos permanecem salvos em conformidade com a LGPD'
      ]
    }
  ], []);

  // Content definition for Aba 2: Médico Especialista
  const especialistaTopics = useMemo<TopicoAjuda[]>(() => [
    {
      id: 'esp-recebimento',
      titulo: '1. Recebimento e Aceite de Casos',
      icon: Stethoscope,
      tags: ['aceitar', 'dashboard', 'fila', 'histórico', 'em progresso'],
      conteudo: (
        <div className="space-y-3">
          <p className="text-xs text-gray-600 leading-relaxed">
            Especialistas visualizam os casos abertos em suas respectivas especialidades e decidem por realizar o atendimento.
          </p>
          <div className="bg-sky-50 border border-sky-100 rounded-lg p-3 text-xs space-y-2 text-sky-900">
            <ul className="list-disc pl-4 space-y-1.5 text-[11px] leading-relaxed">
              <li><strong>Dashboard de Especialista:</strong> Apresenta os casos pendentes de sua especialidade divididos por prioridade e tempo de SLA.</li>
              <li><strong>Análise Prévia:</strong> Clique em qualquer caso na fila para ler a dúvida, histórico clínico, conduta atual e visualizar todos os documentos e exames médicos anexados através do visualizador seguro do sistema.</li>
              <li><strong>Ação de Aceite:</strong> Se decidir assumir o caso, clique em <strong>"Aceitar Caso"</strong>. O status mudará imediatamente para <strong>'Em Progresso'</strong> e o caso ficará sob sua responsabilidade exclusiva.</li>
            </ul>
          </div>
        </div>
      ),
      detalhes: [
        'Apenas especialistas credenciados na especialidade do caso podem aceitá-lo',
        'O status muda de "Aguardando Especialista" para "Em Progresso" pós-aceite',
        'Notificação em tempo real é enviada ao clínico solicitante assim que o caso é aceito'
      ]
    },
    {
      id: 'esp-parecer',
      titulo: '2. Elaboração e Envio do Parecer',
      icon: FileText,
      tags: ['parecer', 'conduta', 'referência', 'concluir', 'respondido'],
      conteudo: (
        <div className="space-y-3">
          <p className="text-xs text-gray-600 leading-relaxed">
            A resposta formal do especialista deve ser estruturada e baseada em evidências científicas e boas práticas clínicas.
          </p>
          <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 text-xs space-y-2 text-gray-700">
            <h5 className="font-bold text-gray-900">Formulário de Resposta do Especialista</h5>
            <p className="text-[11px] leading-relaxed">
              No painel de detalhes do caso aceito, utilize os campos dedicados para redigir o parecer:
            </p>
            <ul className="list-disc pl-4 space-y-1 text-[11px] text-gray-600">
              <li><strong>Análise Clínica:</strong> Sua avaliação técnica com base nos dados do paciente e exames.</li>
              <li><strong>Conduta Recomendada:</strong> Orientações clínicas práticas para guiar o médico solicitante na ponta.</li>
              <li><strong>Referências Bibliográficas:</strong> Diretrizes médicas e estudos que fundamentam sua conduta.</li>
            </ul>
            <p className="text-[11px] leading-relaxed pt-1 border-t border-gray-150">
              Ao preencher, clique em <strong>"Enviar Parecer"</strong>. O status atualizará automaticamente para <strong>'Respondido'</strong>, o clínico será notificado e o caso contabilizará no seu faturamento de produção.
            </p>
          </div>
        </div>
      ),
      detalhes: [
        'O chat integrado continua aberto até o solicitante finalizar o caso, permitindo esclarecimentos adicionais',
        'O parecer enviado fica registrado de forma imutável no prontuário do caso'
      ]
    },
    {
      id: 'esp-desempenho',
      titulo: '3. Desempenho e Financeiro',
      icon: TrendingUp,
      tags: ['ranking', 'produção', 'faturamento', 'bônus', 'métricas'],
      conteudo: (
        <div className="space-y-3">
          <p className="text-xs text-gray-600 leading-relaxed">
            O Doutortec oferece aos especialistas transparência total sobre a sua produção e indicadores de qualidade.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
              <span className="font-bold text-gray-800 flex items-center gap-1 mb-1">
                <TrendingUp className="h-3.5 w-3.5 text-[#0ea5e9]" /> Ranking de Especialistas
              </span>
              <p className="text-gray-600 text-[11px] leading-relaxed">
                Acompanhe o seu volume de casos atendidos, taxa de resolução (casos resolvidos vs atribuídos) e tempo médio de resposta. Uma pontuação de score de qualidade (0 a 100) é exibida, baseada nas avaliações enviadas pelos solicitantes.
              </p>
            </div>
            <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
              <span className="font-bold text-gray-800 flex items-center gap-1 mb-1">
                <Coins className="h-3.5 w-3.5 text-emerald-600" /> Painel Financeiro de Produção
              </span>
              <p className="text-gray-600 text-[11px] leading-relaxed">
                Acompanhe os ganhos acumulados no mês vigente. O painel lista a quantidade de casos faturados, valores de produção padrão e eventuais bônus manuais creditados pelos administradores (com as respectivas justificativas).
              </p>
            </div>
          </div>
        </div>
      ),
      detalhes: [
        'Score de qualidade influencia no ranking e na elegibilidade para bonificações',
        'O faturamento é atualizado em tempo real a cada parecer enviado com sucesso',
        'Filtros por período (mês/ano) disponíveis no painel financeiro'
      ]
    }
  ], []);

  // Content definition for Aba 3: Administrador / Gestor
  const adminTopics = useMemo<TopicoAjuda[]>(() => [
    {
      id: 'adm-aprovacao',
      titulo: '1. Aprovação de Cadastros de Saúde',
      icon: ShieldCheck,
      tags: ['aprovação', 'cadastro', 'coren', 'crm', 'clínico', 'validar'],
      conteudo: (
        <div className="space-y-3">
          <p className="text-xs text-gray-600 leading-relaxed">
            Como administrador, você controla quem tem acesso ao sistema, garantindo a segurança de dados e a conformidade legal.
          </p>
          <div className="bg-sky-50 border border-sky-100 rounded-lg p-3 text-xs text-sky-900 space-y-2">
            <h5 className="font-bold flex items-center gap-1">
              <ShieldCheck className="h-4 w-4 text-sky-600" /> Fluxo de Homologação de Contas
            </h5>
            <ol className="list-decimal pl-4 space-y-1 text-[11px] leading-relaxed">
              <li>Acesse o menu <strong>"Aprovar Clínicos"</strong> ou módulo de aprovação de cadastros.</li>
              <li>Revise a lista de solicitações pendentes de Clínicos, Enfermeiros e Médicos Generalistas.</li>
              <li>Analise os dados inseridos: CPF, CRM/COREN, município correspondente e instituição vinculada.</li>
              <li>Verifique a documentação profissional antes de clicar em <strong>"Aprovar"</strong> ou <strong>"Rejeitar"</strong>.</li>
              <li>Após sua ação, o profissional recebe uma notificação automática sobre a liberação ou rejeição do acesso ao Doutortec.</li>
            </ol>
          </div>
        </div>
      ),
      detalhes: [
        'Controle rígido para impedir cadastros falsos na plataforma médica',
        'Médicos especialistas também podem passar por homologação cadastral no painel de administração',
        'Status do cadastro passa por Pendente -> Aprovado ou Rejeitado'
      ]
    },
    {
      id: 'adm-reatribuicao',
      titulo: '2. Gestão e Reatribuição de Casos',
      icon: RefreshCw,
      tags: ['reatribuir', 'fila', 'auditoria', 'transferir', 'especialista'],
      conteudo: (
        <div className="space-y-3">
          <p className="text-xs text-gray-600 leading-relaxed">
            Monitore a fila geral de casos clínicos para identificar gargalos e reatribua interconsultas paradas ou com SLA crítico.
          </p>
          <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 text-xs space-y-2 text-gray-700">
            <h5 className="font-bold text-gray-900">Como Reatribuir um Caso Clínico</h5>
            <p className="text-[11px] leading-relaxed">
              Se um especialista aceitar um caso mas não puder responder a tempo, ou em casos de ausência médica:
            </p>
            <ol className="list-decimal pl-4 space-y-1 text-[11px] text-gray-600">
              <li>Abra o caso em andamento a partir da fila geral de monitoramento.</li>
              <li>Clique no botão <strong>"Reatribuir"</strong> localizado nas ações contextuais.</li>
              <li>Selecione outro médico especialista disponível na mesma especialidade.</li>
              <li>Confirme a reatribuição. O sistema atualizará o caso e notificará o novo especialista.</li>
            </ol>
            <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded p-2 text-[10px] mt-2 flex items-start gap-1">
              <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Importante:</strong> Toda reatribuição gera um registro automático no histórico de auditoria do caso, gravando o timestamp da ação, o especialista anterior e o administrador responsável pela troca.
              </span>
            </div>
          </div>
        </div>
      ),
      detalhes: [
        'A reatribuição zera ou mantém o contador de SLA de acordo com as regras institucionais configuradas',
        'Registro de auditoria indelével para transparência de conduta'
      ]
    },
    {
      id: 'adm-financeiro',
      titulo: '3. Painel Financeiro e Bônus',
      icon: Coins,
      tags: ['bônus', 'financeiro', 'pagamento', 'faturamento', 'município'],
      conteudo: (
        <div className="space-y-3">
          <p className="text-xs text-gray-600 leading-relaxed">
            Gerencie o custo total operacional e configure incentivos adicionais aos médicos com base em desempenho ou dedicação.
          </p>
          <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 text-xs text-emerald-950 space-y-2">
            <h5 className="font-bold flex items-center gap-1 text-emerald-800">
              <Coins className="h-4 w-4" /> Controle de Produção e Bônus
            </h5>
            <p className="text-[11px] leading-relaxed">
              O módulo financeiro do gestor consolida a produção total em reais (R$) de todo o sistema. Suas principais ferramentas são:
            </p>
            <ul className="list-disc pl-4 space-y-1.5 text-[11px] text-emerald-900">
              <li><strong>Filtros por Período e Município:</strong> Permite cruzar dados de faturamento entre cidades e datas específicas.</li>
              <li><strong>Tabela de Bônus Registrados:</strong> Lista os bônus ativos de cada especialista na plataforma.</li>
              <li><strong>Adicionar Bônus Manual:</strong> Clique para abrir o modal de bônus, insira o nome do especialista, o valor em R$ e digite a justificativa (ex: atendimento em plantão especial ou SLA crítico atendido).</li>
            </ul>
          </div>
        </div>
      ),
      detalhes: [
        'Justificativa detalhada é obrigatória para lançamento de qualquer bônus financeiro',
        'Possibilidade de editar ou excluir bônus lançados incorretamente antes do fechamento da fatura'
      ]
    },
    {
      id: 'adm-relatorios',
      titulo: '4. Relatórios Gerenciais',
      icon: FileBarChart,
      tags: ['relatório', 'exportar', 'pdf', 'faturamento', 'gráfico'],
      conteudo: (
        <div className="space-y-3">
          <p className="text-xs text-gray-600 leading-relaxed">
            Gere dados estratégicos consolidados para prestação de contas, análises de gargalos e acompanhamento de metas.
          </p>
          <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 text-xs space-y-2 text-gray-700">
            <h5 className="font-bold text-gray-900">Como Gerar e Exportar Relatórios</h5>
            <ol className="list-decimal pl-4 space-y-1 text-[11px] text-gray-600">
              <li>Acesse o menu <strong>"Relatórios"</strong> na barra lateral.</li>
              <li>Selecione o tipo de relatório desejado:
                <ul className="list-disc pl-4 mt-0.5 space-y-0.5">
                  <li><strong>Por Especialista:</strong> Consolida volume de casos, tempos médios, score de qualidade e produção individual.</li>
                  <li><strong>Por Município:</strong> Agrega as solicitações enviadas por cada município com dados de faturamento.</li>
                </ul>
              </li>
              <li>Defina o período desejado (data inicial e final) e filtre por especialista/município específico se necessário.</li>
              <li>O sistema carregará na tela tabelas organizadas e gráficos de distribuição.</li>
              <li>Clique no botão <strong>"Gerar PDF"</strong> para baixar automaticamente o resumo executivo formatado com o logotipo da plataforma.</li>
            </ol>
          </div>
        </div>
      ),
      detalhes: [
        'A exportação de PDF é gerada diretamente no lado do cliente garantindo rapidez',
        'Inclui faturamento de produção, volume absoluto de casos e scores de satisfação ponderados'
      ]
    }
  ], []);

  // Filter content based on activeTab and searchTerm
  const currentTopics = useMemo(() => {
    const topics =
      activeTab === 'solicitante'
        ? solicitanteTopics
        : activeTab === 'especialista'
        ? especialistaTopics
        : adminTopics;

    if (!searchTerm.trim()) return topics;

    const term = searchTerm.toLowerCase();
    return topics.filter(
      topic =>
        topic.titulo.toLowerCase().includes(term) ||
        topic.tags.some(tag => tag.includes(term))
    );
  }, [activeTab, searchTerm, solicitanteTopics, especialistaTopics, adminTopics]);

  // Overall search across all tabs to indicate where matches exist
  const searchCounts = useMemo(() => {
    if (!searchTerm.trim()) return { solicitante: 0, especialista: 0, admin: 0 };
    const term = searchTerm.toLowerCase();

    const countMatches = (list: TopicoAjuda[]) =>
      list.filter(
        t =>
          t.titulo.toLowerCase().includes(term) ||
          t.tags.some(tag => tag.includes(term))
      ).length;

    return {
      solicitante: countMatches(solicitanteTopics),
      especialista: countMatches(especialistaTopics),
      admin: countMatches(adminTopics)
    };
  }, [searchTerm, solicitanteTopics, especialistaTopics, adminTopics]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      {/* Container Principal */}
      <div className="bg-white rounded-2xl border border-[#b2c4d6] shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header do Modal */}
        <header className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-150 shrink-0" style={{ backgroundColor: '#091151' }}>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#0ea5e9]/10 border border-[#0ea5e9]/30 flex items-center justify-center text-[#0ea5e9]">
              <HelpCircle className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Central de Ajuda & Guia do Doutortec
              </h2>
              <p className="text-[10px] text-slate-300">
                Tire dúvidas sobre os fluxos, limites, relatórios e controle financeiro do sistema.
              </p>
            </div>
          </div>

          {/* Barra de Pesquisa */}
          <div className="flex items-center gap-3">
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Pesquisar nos guias..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-slate-800/40 border border-slate-700/60 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-hidden focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9]"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2.5 text-gray-400 hover:text-white text-xs"
                >
                  Limpar
                </button>
              )}
            </div>

            <button
              onClick={onClose}
              className="text-slate-300 hover:text-white rounded-lg p-1.5 transition hover:bg-white/10 shrink-0"
              title="Fechar Guia"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Abas Superiores */}
        <div className="bg-gray-50 border-b border-gray-150 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('solicitante')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'solicitante'
                  ? 'bg-[#0ea5e9] text-white shadow-xs'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <User className="h-4 w-4" />
              Solicitante / Clínico
              {searchTerm && searchCounts.solicitante > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-[9px] rounded-full bg-white text-[#0ea5e9] font-bold">
                  {searchCounts.solicitante}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('especialista')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'especialista'
                  ? 'bg-[#0ea5e9] text-white shadow-xs'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Stethoscope className="h-4 w-4" />
              Médico Especialista
              {searchTerm && searchCounts.especialista > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-[9px] rounded-full bg-white text-[#0ea5e9] font-bold">
                  {searchCounts.especialista}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('admin')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'admin'
                  ? 'bg-[#0ea5e9] text-white shadow-xs'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <ShieldCheck className="h-4 w-4" />
              Administrador / Gestor
              {searchTerm && searchCounts.admin > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-[9px] rounded-full bg-white text-[#0ea5e9] font-bold">
                  {searchCounts.admin}
                </span>
              )}
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-1.5 text-gray-500 text-[10px] uppercase font-bold tracking-wider">
            <BookOpen className="h-3.5 w-3.5 text-[#0ea5e9]" />
            <span>Perfil Ativo: {activeTab === 'solicitante' ? 'Solicitante' : activeTab === 'especialista' ? 'Especialista' : 'Gestor'}</span>
          </div>
        </div>

        {/* Corpo do Modal - Conteúdo do Guia Rolável */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 scrollbar-thin">
          {currentTopics.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-gray-500">
              <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                <Search className="h-6 w-6 text-gray-400" />
              </div>
              <h4 className="font-bold text-sm text-gray-700">Nenhum tópico encontrado</h4>
              <p className="text-xs text-gray-500 mt-1 max-w-sm">
                Não encontramos resultados para "{searchTerm}" no perfil de <strong>{activeTab === 'solicitante' ? 'Solicitante' : activeTab === 'especialista' ? 'Especialista' : 'Administrador'}</strong>. Tente alterar o termo ou trocar de aba.
              </p>
            </div>
          ) : (
            <div className="space-y-4 max-w-4xl mx-auto">
              {currentTopics.map(topic => {
                const IconComponent = topic.icon;
                const isExpanded = expandedTopics[topic.id] ?? true; // Expand by default

                return (
                  <div
                    key={topic.id}
                    className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden transition-all duration-200 hover:shadow-md hover:border-[#b2c4d6]"
                  >
                    {/* Header do Card/Tópico */}
                    <button
                      onClick={() => toggleTopic(topic.id)}
                      className="w-full flex items-center justify-between p-4.5 text-left font-semibold text-gray-900 focus:outline-hidden hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="h-8 w-8 rounded-lg bg-sky-50 border border-sky-100 flex items-center justify-center text-[#0ea5e9] shrink-0">
                          <IconComponent className="h-4.5 w-4.5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-[#002157]">{topic.titulo}</h4>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {topic.tags.slice(0, 3).map((tag, idx) => (
                              <span
                                key={idx}
                                className="px-1.5 py-0.5 rounded-sm bg-gray-100 text-gray-600 text-[9px] font-medium"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="text-gray-400 hover:text-gray-600 shrink-0">
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5" />
                        ) : (
                          <ChevronRight className="h-5 w-5" />
                        )}
                      </div>
                    </button>

                    {/* Conteúdo Expandido */}
                    {isExpanded && (
                      <div className="p-5 border-t border-gray-150 bg-white/70 space-y-4">
                        {topic.conteudo}

                        {/* Detalhes Técnicos e Observações */}
                        {topic.detalhes && topic.detalhes.length > 0 && (
                          <div className="pt-3 border-t border-gray-100">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1.5">
                              Regras de Negócio e Detalhes
                            </span>
                            <ul className="space-y-1">
                              {topic.detalhes.map((detail, idx) => (
                                <li key={idx} className="flex items-center gap-2 text-xs text-gray-500">
                                  <span className="h-1.5 w-1.5 rounded-full bg-[#0ea5e9] shrink-0" />
                                  <span>{detail}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer do Modal - Com Roadmap do Sistema */}
        <footer className="px-6 py-3 border-t border-gray-150 bg-[#091151] flex flex-col md:flex-row md:items-center justify-between gap-3 text-white shrink-0">
          <div className="flex items-center gap-2 text-xs">
            <Sparkles className="h-4 w-4 text-amber-400 animate-pulse shrink-0" />
            <span className="font-semibold text-slate-200">Roadmap do Doutortec (Recursos Futuros):</span>
            <span className="text-[10px] text-slate-400 hidden lg:inline">Busca de texto em PDFs, integrações EHR e IA para triagem inteligente.</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[10px] text-slate-400">
              Doutortec v2.0 - Guia de Ajuda do Usuário
            </span>
          </div>
        </footer>

      </div>
    </div>
  );
};
