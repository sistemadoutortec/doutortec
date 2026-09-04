import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  X, 
  Send, 
  Loader2, 
  Sparkles, 
  RotateCcw,
  Key
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  isError?: boolean;
}

const SYSTEM_INSTRUCTION = `Você é o Assistente Virtual Oficial da plataforma Doutortec, um sistema especializado de Teleconsultoria e Interconsulta Médica que conecta profissionais da Atenção Primária à Saúde (APS) com Médicos Especialistas em tempo real.

Seu propósito é fornecer suporte operacional humanizado, claro, acolhedor e didático a todos os usuários da plataforma, explicando como utilizar cada funcionalidade, fluxo e recurso.

DIRETRIZES DE ESTILO E COMUNICAÇÃO:
- Seja sempre gentil, prestativo e converse de forma natural e humana.
- Estruture suas respostas com parágrafos bem espaçados, tópicos e passos numerados claros quando for explicar um procedimento.
- SEGURANÇA E PRIVACIDADE: NUNCA revele detalhes internos de código, banco de dados (tabelas, SQL, Supabase), nomes de arquivos de código, APIs, endpoints, tokens ou segredos técnicos do sistema. Você fala apenas do ponto de vista do USUÁRIO final (menus, telas, botões, formulários e regras de negócio).
- ESCOPO: Seu foco é o suporte e a capacitação no uso da plataforma. Não prescreva diagnósticos ou condutas médicas diretas a pacientes; oriente os profissionais sobre os fluxos do sistema.

CONHECIMENTO COMPLETO DO SISTEMA DOUTORTEC:

1. CICLO DE VIDA DO CASO CLÍNICO:
   - 1. Criação (Status 'Novo'): O Solicitante abre o caso clínico para um paciente.
   - 2. Aceite (Status 'Em Progresso'): O Especialista aceita o caso na fila da sua especialidade (ou a regulação atribui). O tempo de atendimento passa a ser monitorado pelo cronômetro de SLA.
   - 3. Discussão (Chat do Caso): Solicitante e Especialista podem conversar em tempo real, anexar exames adicionais e tirar dúvidas prévias.
   - 4. Devolutiva Oficial (Status 'Respondido'): O Especialista emite o parecer estruturado.
   - 5. Avaliação & Encerramento (Status 'Fechado'): O Solicitante lê a devolutiva, baixa o PDF oficial e responde à avaliação obrigatória de satisfação e resolutividade.

2. PRAZOS E INDICADORES DE SLA:
   - Prioridade Alta: SLA de até 12 horas.
   - Prioridade Média: SLA de até 48 horas.
   - Prioridade Baixa: SLA de até 72 horas.
   - Cores do badge de SLA: Verde (dentro do prazo), Laranja/Âmbar (próximo do limite) e Vermelho (atrasado).

3. PERFIL SOLICITANTE (MÉDICO OU ENFERMEIRO DA APS):
   - Acesso a: Dashboard, Casos Clínicos, Pacientes, Lista de Especialistas e Notificações.
   - Como cadastrar paciente: Menu 'Pacientes' > Botão '+ Novo Paciente' > Informar Nome, CPF, Cartão SUS, Data de Nascimento, Sexo e Município > Salvar.
   - Como abrir caso clínico: Menu 'Casos' > Botão '+ Novo Caso Clínico' > Selecionar paciente cadastrado > Escolher Especialidade e Prioridade > Descrever histórico clínico, conduta atual e a dúvida clínica > Fazer upload de exames (PDF, PNG, JPG até 15MB) > Aceitar o termo de responsabilidade legal > Enviar.
   - Visualizador de Exames: Permite Zoom dinâmico (50% a 200%), rotação de 90° para imagens invertidas, navegação de páginas para PDFs e modo tela cheia.
   - Como encerrar o caso: Abrir o caso 'Respondido', clicar em 'Avaliar e Encerrar', dar nota de 1 a 5 estrelas e informar se a conduta resolveu a dúvida e evitou o encaminhamento físico.

4. PERFIL MÉDICO ESPECIALISTA (TELECONSULTOR):
   - Acesso a: Dashboard, Casos, Especialidades, Ranking, Financeiro e Notificações.
   - Como aceitar um caso: No menu 'Casos', filtrar por 'Novo' ou casos da sua especialidade, abrir o caso e clicar em 'Aceitar Atendimento'.
   - Devolver caso por falta de dados: Se as informações do paciente forem insuficientes para emitir parecer seguro, o especialista clica em 'Devolver (Falta de Dados)' e informa a justificativa.
   - Como preencher a Devolutiva Oficial:
     * Resposta Direta / Conduta Imediata: Manejo farmacológico, doses e conduta.
     * Contribuições para a APS: Orientações de acompanhamento longitudinal na unidade básica.
     * Encaminhamento & Classificação de Risco: Informar se há necessidade de consulta presencial e definir a gravidade (Vermelha, Amarela, Verde ou Azul).
     * Exames Complementares: Informar se há necessidade de novos exames.
     * Referências Bibliográficas: Campo OPCIONAL (pode ser deixado em branco se não houver referências a citar).
     * Potencial SOF: Marcar se a resposta pode servir como Segunda Opinião Formativa educativa.
   - Painel Financeiro: Mostra o faturamento acumulado no mês, quantidade de pareceres concluídos e eventuais bônus manuais lançados pela gestão.
   - Ranking: Acompanha pontuação de qualidade (0 a 100), resolutividade e tempo médio de resposta.

5. PERFIL GESTOR MUNICIPAL:
   - Acesso exclusivo a: Dashboard, Casos, Pacientes, Relatórios e Notificações.
   - Isolamento por Município: Visualiza única e exclusivamente os dados do seu próprio município. Não tem acesso a dados de outras cidades.
   - Objetivo: Monitorar a saúde municipal, tempo de resposta aos munícipes, índice de resolutividade da atenção primária e redução de encaminhamentos físicos desnecessários.

6. PERFIL ADMINISTRADOR:
   - Acesso completo: Gestão de usuários, aprovação de profissionais (checagem de CRM/COREN e RQE), gerenciamento e edição de perfis, cadastro de municípios conveniados, fluxos de especialidades, distribuição/reatribuição manual de casos, parametrizações financeiras de repasses/bônus e relatórios gerenciais globais.

7. RECURSOS COMPLEMENTARES:
   - Troca de senha: Pode ser feita pelo banner de segurança no topo ou no menu de perfil. Usuários com a senha provisória 'Mudar@123' são alertados a trocá-la no primeiro acesso.
   - Notificações: Sininho no topo da tela com badge de alertas para casos aceitos, mensagens recebidas e respostas concluídas.
   - Relatórios em PDF: Tanto o parecer clínico individual quanto os relatórios consolidados podem ser exportados em formato PDF oficial para arquivamento ou anexação ao prontuário eletrônico.
   - Central de Ajuda: Ícone de interrogação no topo da tela abre o manual detalhado com passo a passo por abas.`;

const QUICK_PROMPTS = [
  'Como abrir um novo caso clínico?',
  'Como cadastrar um paciente?',
  'Qual a função do Gestor Municipal?',
  'Como o Especialista emite a resposta?',
  'O campo de referências é obrigatório?',
  'Como funciona o SLA e prazos?'
];

// Parser de formatação visual amigável (Markdown elegante)
const FormattedMessage: React.FC<{ content: string; isUser: boolean }> = ({ content, isUser }) => {
  if (isUser) {
    return <p className="whitespace-pre-wrap">{content}</p>;
  }

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let inList = false;
  let currentListItems: React.ReactNode[] = [];

  const parseInline = (text: string): React.ReactNode => {
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="font-bold text-slate-900">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={index} className="italic text-slate-800">{part.slice(1, -1)}</em>;
      }
      return part;
    });
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    const bulletMatch = trimmed.match(/^([•\*\-])\s+(.*)/);
    const numberMatch = trimmed.match(/^(\d+[\.\)])\s+(.*)/);

    if (bulletMatch || numberMatch) {
      inList = true;
      const prefix = bulletMatch ? '•' : numberMatch![1];
      const itemText = bulletMatch ? bulletMatch[2] : numberMatch![2];

      currentListItems.push(
        <li key={`li-${index}`} className="flex items-start gap-2 my-1 text-xs leading-relaxed">
          <span className="shrink-0 font-bold text-[#0ea5e9] select-none text-[11px] mt-0.5">
            {prefix}
          </span>
          <span className="text-slate-700 flex-1">
            {parseInline(itemText)}
          </span>
        </li>
      );
    } else {
      if (inList && currentListItems.length > 0) {
        elements.push(
          <ul key={`ul-${index}`} className="my-2 pl-0.5 space-y-1">
            {currentListItems}
          </ul>
        );
        currentListItems = [];
        inList = false;
      }

      if (trimmed === '') {
        elements.push(<div key={`sp-${index}`} className="h-2" />);
      } else {
        elements.push(
          <p key={`p-${index}`} className="text-xs leading-relaxed text-slate-700 my-1">
            {parseInline(trimmed)}
          </p>
        );
      }
    }
  });

  if (inList && currentListItems.length > 0) {
    elements.push(
      <ul key="ul-end" className="my-2 pl-0.5 space-y-1">
        {currentListItems}
      </ul>
    );
  }

  return <div className="space-y-0.5">{elements}</div>;
};

// Fallback operacional inteligente caso a API não responda
function getSmartFallbackAnswer(query: string): string {
  const q = query.toLowerCase();

  if (
    q.includes('caso') && (q.includes('criar') || q.includes('abrir') || q.includes('novo') || q.includes('solicita') || q.includes('iniciar') || q.includes('fazer')) ||
    q.includes('como abrir') || q.includes('como criar') || q.includes('abrir caso') || q.includes('criar caso')
  ) {
    return `Para abrir uma nova solicitação de caso clínico (Perfil Solicitante):\n\n1. Acesse o menu **Casos** no painel lateral esquerdo.\n2. Clique no botão azul **+ Novo Caso Clínico** no topo da página.\n3. Selecione o **Paciente** previamente cadastrado no menu *Pacientes*.\n4. Escolha a **Especialidade Médica** desejada e defina a **Prioridade**:\n   • *Alta:* resposta em até 12 horas\n   • *Média:* resposta em até 48 horas\n   • *Baixa:* resposta em até 72 horas\n5. Preencha o histórico clínico, conduta atual e a sua **dúvida clínica diagnóstica/terapêutica**.\n6. Anexe exames, laudos ou fotos em PDF/imagens (até 15MB por arquivo).\n7. Aceite o termo de responsabilidade e clique em **Enviar Caso Clínico**.\n\nO caso entrará imediatamente na fila de teleconsultoria do especialista!`;
  }

  if (q.includes('paciente') || q.includes('cadastr')) {
    return `Para cadastrar um paciente no sistema:\n\n1. Acesse o menu **Pacientes** na barra de navegação.\n2. Clique no botão **+ Novo Paciente**.\n3. Preencha os campos obrigatórios:\n   • Nome Completo\n   • CPF (validado automaticamente)\n   • Data de Nascimento e Sexo\n   • Cartão Nacional de Saúde (SUS)\n   • Município de residência\n4. Clique em **Salvar Paciente**.\n\nPronto! O paciente já estará disponível para vinculação em novos casos clínicos.`;
  }

  if (q.includes('gestor') || q.includes('municip') || q.includes('cidade')) {
    return `O perfil **Gestor Municipal** é dedicado ao monitoramento da saúde municipal:\n\n• **Isolamento de Dados:** Visualiza exclusivamente os casos, pacientes, métricas e relatórios do seu próprio município.\n• **Indicadores de Resolutividade:** Acompanha a taxa de resolutividade da APS e quantos encaminhamentos presenciais foram evitados.\n• **Controle de SLA:** Monitora o cumprimento dos prazos de resposta aos munícipes.`;
  }

  if (q.includes('especialista') || q.includes('devolutiva') || q.includes('parecer') || q.includes('responder') || q.includes('aceitar')) {
    return `Como o **Médico Especialista** atua no caso clínico:\n\n1. **Aceite:** Localiza os casos com status *Novo* na sua especialidade e clica em **Aceitar Atendimento** (iniciando o SLA).\n2. **Chat do Caso:** Se precisar de mais detalhes, conversa diretamente com o clínico no chat integrado.\n3. **Devolução:** Se faltarem dados essenciais, pode clicar em **Devolver (Falta de Dados)** com justificativa.\n4. **Devolutiva Oficial:** Preenche a conduta imediata, recomendações para a APS, classificação de risco/encaminhamento e referências (opcionais), clicando em **Emitir Devolutiva Oficial**.`;
  }

  if (q.includes('referencia') || q.includes('referência') || q.includes('bibliograf')) {
    return `**O campo de Referências Bibliográficas é OPCIONAL!**\n\nO especialista pode citar diretrizes do Ministério da Saúde, protocolos clínicos ou artigos científicos quando julgar agregador, mas o envio da Devolutiva Oficial pode ser feito normalmente sem preenchê-lo.`;
  }

  if (q.includes('sla') || q.includes('prazo') || q.includes('tempo') || q.includes('urgente') || q.includes('prioridade')) {
    return `Os prazos de atendimento (SLA) são calculados conforme a prioridade do caso:\n\n• 🔴 **Alta Prioridade:** Prazo limite de **até 12 horas**.\n• 🟡 **Média Prioridade:** Prazo limite de **até 48 horas**.\n• 🔵 **Baixa Prioridade:** Prazo limite de **até 72 horas**.\n\nOs cards possuem badges visuais: Verde (no prazo), Âmbar (próximo do vencimento) e Vermelho (atrasado).`;
  }

  if (q.includes('pdf') || q.includes('imprim') || q.includes('baixar') || q.includes('documento')) {
    return `Para exportar o parecer em PDF:\n\n1. Acesse o caso clínico que esteja com status **Respondido** ou **Fechado**.\n2. Clique no botão **Baixar Parecer (PDF)** no topo dos detalhes do caso.\n3. O sistema gera o documento oficial estruturado com identificação do paciente, dados clínicos, conduta do especialista e carimbo profissional (CRM/RQE).`;
  }

  if (q.includes('senha') || q.includes('login') || q.includes('acesso')) {
    return `Para alterar sua senha:\n\n• Se estiver com a senha provisória padrão (*Mudar@123*), clique em **Alterar Senha** no banner de aviso no topo da tela.\n• Você também pode alterar sua senha a qualquer momento clicando no botão de perfil.`;
  }

  return `Posso te orientar sobre qualquer função do Doutortec!\n\n• **Casos Clínicos:** Como abrir uma solicitação, prazos (SLA) e anexar exames.\n• **Pacientes:** Como cadastrar e consultar pacientes.\n• **Devolutiva:** Como o especialista emite o parecer e usa o chat.\n• **Perfis:** Recursos do Solicitante, Especialista, Gestor Municipal e Administrador.\n\nVocê também pode consultar o Guia completo no menu de **Ajuda** (ícone de interrogação no topo da tela).`;
}

const STORAGE_KEY_MESSAGES = 'doutortec_suporte_ia_messages';
const STORAGE_KEY_CUSTOM_KEY = 'doutortec_gemini_custom_key';

export const SuporteIAWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [customKeyInput, setCustomKeyInput] = useState(() => {
    return localStorage.getItem(STORAGE_KEY_CUSTOM_KEY) || '';
  });

  // Persistência profissional das mensagens no localStorage (não somem ao mudar de aba ou atualizar)
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MESSAGES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp)
          }));
        }
      }
    } catch (e) {
      console.warn('Erro ao restaurar histórico do chat:', e);
    }
    return [
      {
        id: 'welcome-msg',
        sender: 'assistant',
        text: 'Olá! Sou o Assistente Virtual Doutortec. Como posso te ajudar com o uso da plataforma hoje?',
        timestamp: new Date(),
      }
    ];
  });

  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Salva no localStorage sempre que as mensagens mudarem
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(messages));
    } catch (e) {
      console.warn('Erro ao persistir mensagens:', e);
    }
  }, [messages]);

  // Auto-scroll para o final do chat
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Foco no input ao abrir
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Obtém a melhor chave disponível (localStorage ou .env/Vercel)
  const getActiveApiKey = (): string => {
    const fromStorage = localStorage.getItem(STORAGE_KEY_CUSTOM_KEY);
    if (fromStorage && fromStorage.trim().length > 10) {
      return fromStorage.trim();
    }
    const fromEnv = import.meta.env.VITE_GEMINI_API_KEY;
    if (fromEnv && typeof fromEnv === 'string' && fromEnv.trim().length > 10) {
      return fromEnv.trim();
    }
    return '';
  };

  const handleSendMessage = async (textToSend?: string) => {
    const messageContent = (textToSend || inputText).trim();
    if (!messageContent || loading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: messageContent,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    if (!textToSend) setInputText('');
    setLoading(true);

    const activeKey = getActiveApiKey();

    // Se nenhuma chave estiver configurada, responde via motor local inteligente com formatação humana
    if (!activeKey) {
      const answer = getSmartFallbackAnswer(messageContent);
      setTimeout(() => {
        setMessages(prev => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            sender: 'assistant',
            text: answer,
            timestamp: new Date(),
          }
        ]);
        setLoading(false);
      }, 400);
      return;
    }

    try {
      // Monta histórico de conversas recente
      const recentHistory = messages
        .filter(m => !m.isError)
        .slice(-6)
        .map(m => ({
          role: m.sender === 'user' ? 'user' : 'model',
          parts: [{ text: m.text }]
        }));

      const contents = [
        ...recentHistory,
        {
          role: 'user',
          parts: [{ text: messageContent }]
        }
      ];

      // Tenta chamar gemini-3.6-flash ou gemini-2.5-flash via REST API oficial
      const modelsToTry = ['gemini-3.6-flash', 'gemini-2.5-flash', 'gemini-flash-latest'];
      let responseText = '';
      let callSuccess = false;

      for (const modelName of modelsToTry) {
        try {
          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${activeKey}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              systemInstruction: {
                parts: [{ text: SYSTEM_INSTRUCTION }]
              },
              contents: contents
            })
          });

          const data = await res.json();
          if (res.ok && data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
            responseText = data.candidates[0].content.parts[0].text;
            callSuccess = true;
            break;
          } else {
            console.warn(`Tentativa com ${modelName} retornou:`, data?.error?.message || res.statusText);
          }
        } catch (subErr) {
          console.warn(`Erro na requisição para ${modelName}:`, subErr);
        }
      }

      if (callSuccess && responseText) {
        setMessages(prev => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            sender: 'assistant',
            text: responseText,
            timestamp: new Date(),
          }
        ]);
      } else {
        // Fallback inteligente para garantir que o usuário NUNCA fique sem resposta
        const fallbackAnswer = getSmartFallbackAnswer(messageContent);
        setMessages(prev => [
          ...prev,
          {
            id: `assistant-fb-${Date.now()}`,
            sender: 'assistant',
            text: fallbackAnswer,
            timestamp: new Date(),
          }
        ]);
      }
    } catch (err: any) {
      console.warn('Suporte IA Doutortec: Erro inesperado, acionando base operacional:', err);
      const fallbackAnswer = getSmartFallbackAnswer(messageContent);

      setMessages(prev => [
        ...prev,
        {
          id: `assistant-fb-${Date.now()}`,
          sender: 'assistant',
          text: fallbackAnswer,
          timestamp: new Date(),
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleResetChat = () => {
    const initial: ChatMessage[] = [
      {
        id: 'welcome-msg',
        sender: 'assistant',
        text: 'Olá! Sou o Assistente Virtual Doutortec. Como posso te ajudar com o uso da plataforma hoje?',
        timestamp: new Date(),
      }
    ];
    setMessages(initial);
    localStorage.removeItem(STORAGE_KEY_MESSAGES);
  };

  const handleSaveCustomKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (customKeyInput.trim()) {
      localStorage.setItem(STORAGE_KEY_CUSTOM_KEY, customKeyInput.trim());
    } else {
      localStorage.removeItem(STORAGE_KEY_CUSTOM_KEY);
    }
    setShowKeyModal(false);
  };

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end print:hidden">
      {/* Modal para Ajuste Rápido de Chave de API */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-[#091151] flex items-center gap-2">
                <Key className="h-4 w-4 text-[#0ea5e9]" />
                Configurar Chave Gemini API
              </h3>
              <button onClick={() => setShowKeyModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Você pode inserir sua chave da API do Google Gemini abaixo. Ela ficará salva com segurança no seu navegador para ativar a IA em tempo real imediatamente:
            </p>
            <form onSubmit={handleSaveCustomKey} className="space-y-4">
              <input
                type="text"
                value={customKeyInput}
                onChange={(e) => setCustomKeyInput(e.target.value)}
                placeholder="Ex: AIzaSy... ou AQ..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono text-slate-800 focus:outline-hidden focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9]"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowKeyModal(false)}
                  className="rounded-lg px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#091151] hover:bg-[#0c166b] text-white px-4 py-1.5 text-xs font-bold transition shadow-xs"
                >
                  Salvar Chave
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Janela de Chat Profissional */}
      {isOpen && (
        <div 
          className="mb-3 w-88 sm:w-104 rounded-2xl bg-white shadow-2xl border border-slate-200 flex flex-col overflow-hidden transition-all duration-200 animate-in fade-in slide-in-from-bottom-5"
          style={{ height: '560px', maxHeight: 'calc(100vh - 90px)' }}
        >
          {/* Cabeçalho */}
          <div 
            className="px-4 py-3.5 flex items-center justify-between text-white select-none shrink-0 border-b border-white/10"
            style={{ backgroundColor: '#091151' }}
          >
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shadow-xs">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold tracking-wide flex items-center gap-1.5 text-white">
                  Assistente Doutortec
                  <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </h4>
                <p className="text-[10px] text-slate-300">Suporte Inteligente &amp; Operacional</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowKeyModal(true)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-white/10 transition"
                title="Configurar Chave API"
              >
                <Key className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={handleResetChat}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
                title="Reiniciar conversa"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
                title="Fechar janela"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Área de Mensagens com Rolagem */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/60 text-xs">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'assistant' && (
                  <div className="h-7 w-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    <Bot className="h-4 w-4" />
                  </div>
                )}
                <div
                  className={`rounded-2xl px-4 py-3 max-w-[85%] leading-relaxed break-words shadow-xs ${
                    msg.sender === 'user'
                      ? 'bg-[#0ea5e9] text-white rounded-br-xs font-medium'
                      : 'bg-white border border-slate-200 text-slate-800 rounded-bl-xs'
                  }`}
                >
                  <FormattedMessage content={msg.text} isUser={msg.sender === 'user'} />
                  <div
                    className={`text-[9px] mt-1.5 text-right ${
                      msg.sender === 'user' ? 'text-white/70' : 'text-slate-400'
                    }`}
                  >
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2.5 items-center text-slate-500 text-xs">
                <div className="h-7 w-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-xs px-3.5 py-2.5 flex items-center gap-2 shadow-xs">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#0ea5e9]" />
                  <span className="text-[11px] text-slate-600 font-medium">Consultando informações...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Sugestões Rápidas (Exibidas quando há poucas mensagens) */}
          {messages.length <= 2 && (
            <div className="px-3.5 py-2 bg-white border-t border-slate-150 flex flex-wrap gap-1.5 shrink-0">
              <span className="w-full text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                Dúvidas Frequentes:
              </span>
              {QUICK_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(prompt)}
                  disabled={loading}
                  className="rounded-lg bg-slate-100 hover:bg-slate-200 hover:text-[#0ea5e9] px-2.5 py-1 text-[10px] text-slate-700 font-medium transition text-left shrink-0 disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Input de Mensagem */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Digite sua dúvida sobre o sistema..."
              disabled={loading}
              className="flex-1 rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 disabled:bg-slate-50"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || loading}
              className="rounded-xl bg-[#091151] hover:bg-[#0c166b] disabled:bg-slate-200 text-white disabled:text-slate-400 p-2.5 transition shadow-xs cursor-pointer disabled:cursor-not-allowed shrink-0"
              title="Enviar mensagem"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}

      {/* Botão Flutuante (FAB) */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="group relative flex items-center gap-2 rounded-full px-4 py-3 shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 text-white cursor-pointer"
        style={{
          background: 'linear-gradient(135deg, #091151 0%, #0ea5e9 100%)',
        }}
        title="Assistente Virtual Doutortec"
        aria-label="Abrir Suporte IA Doutortec"
      >
        <div className="relative">
          <Bot className="h-5 w-5 text-white transition-transform group-hover:rotate-6" />
          <span className="absolute -top-1 -right-1 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#28ffb2] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#28ffb2]" />
          </span>
        </div>
        <span className="text-xs font-bold tracking-wide pr-1">
          {isOpen ? 'Fechar IA' : 'Suporte IA'}
        </span>
        <Sparkles className="h-3.5 w-3.5 text-[#28ffb2]" />
      </button>
    </div>
  );
};
