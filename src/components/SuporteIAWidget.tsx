import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import type { UserRole, Perfil } from '../types';
import { DOUTORTEC_SYSTEM_SPEC } from '../data/doutortecKnowledgeBase';
import { 
  Bot, 
  X, 
  Send, 
  Loader2, 
  Sparkles, 
  RotateCcw
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  isError?: boolean;
}

const SYSTEM_INSTRUCTION = DOUTORTEC_SYSTEM_SPEC;

const getQuickPromptsForRole = (role?: UserRole): string[] => {
  switch (role) {
    case 'solicitante':
      return [
        'Como abrir um novo caso clínico?',
        'Como cadastrar um paciente?',
        'Como anexar e visualizar exames?',
        'Quais são os prazos de resposta (SLA)?',
        'Como avaliar e encerrar um caso respondido?'
      ];
    case 'especialista':
    case 'teleconsultor':
      return [
        'Como aceitar e atender um caso?',
        'Como preencher a Devolutiva Oficial?',
        'O campo de referências é obrigatório?',
        'Como devolver caso por falta de dados?',
        'Onde vejo meus repasses financeiros?'
      ];
    case 'gestor_municipal':
      return [
        'Como monitorar os casos da minha cidade?',
        'Como exportar os relatórios municipais?',
        'Como é calculada a resolutividade?',
        'Como acompanhar os prazos de atendimento (SLA)?',
        'Meus dados são isolados de outros municípios?'
      ];
    case 'admin':
      return [
        'Como gerenciar e editar perfis de usuários?',
        'Como cadastrar e conveniar municípios?',
        'Como reatribuir casos na distribuição?',
        'Como parametrizar repasses e bônus?',
        'Como emitir relatórios consolidados globais?'
      ];
    default:
      return [
        'Como abrir um novo caso clínico?',
        'Como cadastrar um paciente?',
        'Como o Especialista emite a resposta?',
        'Qual a função do Gestor Municipal?',
        'Como funciona o SLA e prazos?'
      ];
  }
};

const getRoleDisplayTitle = (role?: UserRole): string => {
  switch (role) {
    case 'solicitante': return 'Solicitante (APS)';
    case 'especialista': return 'Médico Especialista';
    case 'teleconsultor': return 'Teleconsultor';
    case 'gestor_municipal': return 'Gestor Municipal';
    case 'admin': return 'Administrador';
    case 'telerregulador': return 'Telerregulador';
    case 'visualizador': return 'Visualizador';
    default: return 'Usuário Doutortec';
  }
};

const getWelcomeMessage = (perfil: Perfil | null): string => {
  const primeiroNome = perfil?.nome ? perfil.nome.split(' ')[0] : '';
  const role = perfil?.role;

  if (role === 'especialista' || role === 'teleconsultor') {
    return `Olá${primeiroNome ? `, Dr(a). ${primeiroNome}` : ''}! Sou o Assistente Virtual Doutortec para Médicos Especialistas.\n\nComo posso te apoiar na sua fila de teleconsultorias, emissão de pareceres ou no painel financeiro hoje?`;
  }
  if (role === 'solicitante') {
    return `Olá${primeiroNome ? `, Dr(a). ${primeiroNome}` : ''}! Sou o Assistente Virtual Doutortec para a Atenção Primária.\n\nComo posso te auxiliar com o cadastro de pacientes, abertura de novos casos ou acompanhamento de respostas hoje?`;
  }
  if (role === 'gestor_municipal') {
    const cidade = perfil?.municipio ? ` de ${perfil.municipio}` : '';
    return `Olá${primeiroNome ? `, ${primeiroNome}` : ''}! Sou o Assistente Virtual Doutortec para Gestão Municipal.\n\nComo posso te auxiliar no monitoramento dos indicadores de saúde, resolutividade e relatórios${cidade}?`;
  }
  if (role === 'admin') {
    return `Olá${primeiroNome ? `, ${primeiroNome}` : ''}! Sou o Assistente Virtual Doutortec.\n\nEstou à disposição para auxiliá-lo na administração geral, parametrização financeira, gestão de perfis e relatórios globais. Como posso ajudar?`;
  }
  return `Olá${primeiroNome ? `, ${primeiroNome}` : ''}! Sou o Assistente Virtual Doutortec. Como posso te ajudar com o uso da plataforma hoje?`;
};

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
function getSmartFallbackAnswer(query: string, perfil: Perfil | null): string {
  const q = query.toLowerCase();
  const role = perfil?.role;

  // Dúvidas sobre o próprio perfil ou funções
  if (q.includes('minhas funções') || q.includes('o que posso fazer') || q.includes('meu papel') || q.includes('minha função') || q.includes('meu perfil')) {
    if (role === 'solicitante') {
      return `Como **Profissional Solicitante (APS)**, suas principais funções são:\n\n1. **Cadastrar Pacientes:** Registrar os dados dos pacientes atendidos na Atenção Primária.\n2. **Abrir Casos Clínicos:** Solicitar pareceres e interconsultas com médicos especialistas, definindo a prioridade e anexando exames.\n3. **Interagir no Chat:** Esclarecer dúvidas diretamente com o especialista responsável durante o atendimento.\n4. **Avaliar e Encerrar:** Receber a devolutiva oficial com conduta, baixar o parecer em PDF e registrar a avaliação de resolutividade.`;
    }
    if (role === 'especialista' || role === 'teleconsultor') {
      return `Como **Médico Especialista (Teleconsultor)**, suas principais funções são:\n\n1. **Fila de Atendimento:** Localizar e aceitar casos clínicos da sua especialidade.\n2. **Chat com Solicitante:** Tirar dúvidas prévias diretamente com o médico/enfermeiro da APS.\n3. **Devolutiva Oficial:** Emitir o parecer estruturado com conduta clínica, recomendações para a APS, classificação de gravidade e exames sugeridos.\n4. **Painel Financeiro & Ranking:** Acompanhar seus laudos emitidos, indicadores de SLA e repasses financeiros.`;
    }
    if (role === 'gestor_municipal') {
      const cidade = perfil?.municipio ? ` de **${perfil.municipio}**` : '';
      return `Como **Gestor Municipal**${cidade}, suas principais funções são:\n\n1. **Monitoramento Municipal:** Acompanhar exclusivamente os casos, pacientes e métricas da sua cidade.\n2. **Indicador de Resolutividade:** Verificar quantos casos foram solucionados na própria atenção primária e quantos encaminhamentos presenciais foram evitados.\n3. **Auditoria & Relatórios:** Exportar relatórios em PDF com dados consolidados da saúde do município.`;
    }
    if (role === 'admin') {
      return `Como **Administrador Geral**, você possui controle total da plataforma:\n\n1. **Usuários e Perfis:** Aprovar novos cadastros de profissionais (CRM/COREN e RQE) e editar permissões.\n2. **Municípios Conveniados:** Cadastrar e gerenciar as cidades atendidas.\n3. **Distribuição de Casos:** Distribuir ou reatribuir casos clínicos manualmente.\n4. **Parametrização Financeira:** Configurar valores por parecer, bônus e auditar relatórios gerenciais globais.`;
    }
  }

  if (
    q.includes('caso') && (q.includes('criar') || q.includes('abrir') || q.includes('novo') || q.includes('solicita') || q.includes('iniciar') || q.includes('fazer')) ||
    q.includes('como abrir') || q.includes('como criar') || q.includes('abrir caso') || q.includes('criar caso')
  ) {
    return `Para abrir uma nova solicitação de caso clínico (Perfil Solicitante):\n\n1. Acesse o menu **Casos** no painel lateral esquerdo.\n2. Clique no botão azul **+ Novo Caso Clínico** no topo da página.\n3. Selecione o **Paciente** previamente cadastrado no menu *Pacientes*.\n4. Escolha a **Especialidade Médica** desejada e defina a **Prioridade**:\n   • *Alta:* resposta em até 12 horas\n   • *Média:* resposta em até 48 horas\n   • *Baixa:* resposta em até 72 horas\n5. Preencha o histórico clínico, conduta atual e a sua **dúvida clínica diagnóstica/terapêutica**.\n6. Anexe exames, laudos ou fotos em PDF/imagens (até 15MB por arquivo).\n7. Aceite o termo de responsabilidade e clique em **Enviar Caso Clínico**.\n\nO caso entrará imediatamente na fila de teleconsultoria do especialista!`;
  }

  if (q.includes('paciente') || q.includes('cadastr')) {
    return `Para cadastrar um paciente no sistema:\n\n1. Acesse o menu **Pacientes** na barra de navegação.\n2. Clique no botão **+ Novo Paciente**.\n3. Preencha os campos obrigatórios:\n   • Nome Completo\n   • CPF (validado automaticamente)\n   • Data de Nascimento e Sexo\n   • Cartão Nacional de Saúde (SUS)\n   • Município de residência\n4. Clique em **Salvar Paciente**.\n\nPronto! O paciente já estará disponível para vinculação em novos casos clínicos.`;
  }

  if (q.includes('gestor') || q.includes('municip') || q.includes('cidade') || q.includes('isolamento')) {
    const cidade = perfil?.municipio ? ` de **${perfil.municipio}**` : '';
    return `O perfil **Gestor Municipal**${cidade} é dedicado ao monitoramento da saúde municipal:\n\n• **Isolamento de Dados:** Visualiza exclusivamente os casos, pacientes, métricas e relatórios da sua própria cidade. Não tem acesso a dados de outros municípios.\n• **Indicadores de Resolutividade:** Acompanha a taxa de resolutividade da APS e quantos encaminhamentos presenciais foram evitados.\n• **Controle de SLA:** Monitora o cumprimento dos prazos de resposta aos munícipes.\n• **Relatórios:** Permite exportar relatórios consolidados em PDF para auditoria.`;
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

  if (q.includes('financeiro') || q.includes('bonus') || q.includes('bônus') || q.includes('repasses') || q.includes('faturamento')) {
    if (role === 'admin') {
      return `Como Administrador, você pode gerenciar o painel financeiro pelo menu **Financeiro**:\n\n• Parametrizar valores de repasse por laudo/parecer concluído.\n• Lançar bônus manuais para especialistas com base em produtividade ou plantões.\n• Visualizar o consolidado de repasses por período e exportar para conferência.`;
    }
    return `No menu **Financeiro**, o Especialista acompanha:\n\n• Quantidade total de pareceres emitidos no mês.\n• Valor acumulado a receber por teleconsultorias concluídas.\n• Discriminação de bônus lançados pela gestão administrativa.`;
  }

  if (q.includes('pdf') || q.includes('imprim') || q.includes('baixar') || q.includes('documento')) {
    return `Para exportar o parecer em PDF:\n\n1. Acesse o caso clínico que esteja com status **Respondido** ou **Fechado**.\n2. Clique no botão **Baixar Parecer (PDF)** no topo dos detalhes do caso.\n3. O sistema gera o documento oficial estruturado com identificação do paciente, dados clínicos, conduta do especialista e carimbo profissional (CRM/RQE).`;
  }

  if (q.includes('excluir') || q.includes('bloquear') || q.includes('inativar') || q.includes('deletar') || (q.includes('remover') && q.includes('usuário'))) {
    return `**Sobre a Exclusão e Bloqueio de Usuários:**\n\nEm conformidade com as normas médico-legais (CFM, Prontuário Eletrônico e LGPD), a plataforma Doutortec **não realiza a exclusão física definitiva de usuários**, a fim de preservar a rastreabilidade e a validade jurídica de todos os casos, pareceres e prescrições já registrados.\n\nPara revogar o acesso de um usuário (Perfil Administrador):\n1. Acesse o menu **Gestão de Perfis** na barra de navegação lateral.\n2. Localize o profissional pela busca ou filtros de status.\n3. Na coluna de ações à direita, clique no botão vermelho **Bloquear**.\n\nO status do usuário mudará imediatamente para **Bloqueado**, impedindo seu login no sistema sem comprometer o histórico clínico dos pacientes.`;
  }

  if (q.includes('senha') || q.includes('login') || q.includes('acesso')) {
    return `Para alterar sua senha:\n\n• Se estiver com a senha provisória padrão (*Mudar@123*), clique em **Alterar Senha** no banner de aviso no topo da tela.\n• Você também pode alterar sua senha a qualquer momento clicando no botão de perfil.`;
  }

  return `Estou à sua disposição para apoiar sua atuação na plataforma Doutortec!\n\nVocê pode me perguntar sobre:\n• Como abrir e gerenciar casos clínicos;\n• Prazos de atendimento e regras de SLA;\n• Como emitir a Devolutiva Oficial ou anexar exames;\n• Funcionalidades específicas do seu perfil de acesso.\n\nVocê também pode consultar o Guia completo no menu de **Ajuda** (ícone de interrogação no topo da tela).`;
}

const getStorageKey = (userId?: string | null): string => {
  return userId ? `doutortec_suporte_ia_messages_${userId}` : 'doutortec_suporte_ia_messages_guest';
};

export const SuporteIAWidget: React.FC = () => {
  const { user, perfil } = useAuth();
  const userId = user?.id || perfil?.id || null;
  const storageKey = getStorageKey(userId);
  const [isOpen, setIsOpen] = useState(false);

  // Carrega o histórico exclusivo do usuário conectado
  const loadUserMessages = (targetUserId: string | null, targetPerfil: Perfil | null): ChatMessage[] => {
    try {
      const key = getStorageKey(targetUserId);
      const saved = localStorage.getItem(key);
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
      console.warn('Erro ao restaurar histórico do chat do usuário:', e);
    }
    return [
      {
        id: 'welcome-msg',
        sender: 'assistant',
        text: getWelcomeMessage(targetPerfil),
        timestamp: new Date(),
      }
    ];
  };

  const [messages, setMessages] = useState<ChatMessage[]>(() => loadUserMessages(userId, perfil));

  // Sempre que o usuário conectado mudar (login, logout ou troca de conta), recarrega o chat exclusivo dele
  useEffect(() => {
    setMessages(loadUserMessages(userId, perfil));
  }, [userId]);

  // Atualiza a saudação personalizada assim que o perfil detalhado terminar de carregar (se ainda não houver conversa em andamento)
  useEffect(() => {
    if (perfil && messages.length === 1 && messages[0].id === 'welcome-msg') {
      const personalizedWelcome = getWelcomeMessage(perfil);
      setMessages([
        {
          id: 'welcome-msg',
          sender: 'assistant',
          text: personalizedWelcome,
          timestamp: new Date(),
        }
      ]);
    }
  }, [perfil]);

  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Salva no localStorage exclusivo do usuário atual sempre que as mensagens mudarem
  useEffect(() => {
    try {
      if (userId) {
        localStorage.setItem(storageKey, JSON.stringify(messages));
      }
    } catch (e) {
      console.warn('Erro ao persistir mensagens do usuário:', e);
    }
  }, [messages, storageKey, userId]);

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

  // Obtém a chave de ambiente configurada na Vercel ou .env
  const getActiveApiKey = (): string => {
    const fromEnv = import.meta.env.VITE_GEMINI_API_KEY;
    if (fromEnv && typeof fromEnv === 'string' && fromEnv.trim().length > 10) {
      return fromEnv.trim();
    }
    return '';
  };

  const quickPrompts = getQuickPromptsForRole(perfil?.role);

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
      const answer = getSmartFallbackAnswer(messageContent, perfil);
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

      // Contexto customizado de acordo com o perfil do usuário logado
      const userContextPrompt = `
DADOS DO USUÁRIO ATUALMENTE CONECTADO:
- Nome: ${perfil?.nome || 'Profissional'}
- Papel no Sistema (Role): ${perfil?.role || 'solicitante'} (${getRoleDisplayTitle(perfil?.role)})
${perfil?.municipio ? `- Município de Atuação: ${perfil.municipio}` : ''}
${perfil?.crm_coren ? `- Registro Profissional: ${perfil.crm_coren}` : ''}

INSTRUÇÃO DE PERSONALIZAÇÃO POR PERFIL:
Você está prestando suporte diretamente a ${perfil?.nome || 'o usuário'}, cujo perfil de acesso é ${getRoleDisplayTitle(perfil?.role)}.
Adapte suas explicações ao escopo deste usuário:
- Se for Solicitante (APS): oriente sobre abrir casos clínicos, cadastrar pacientes, anexar exames, acompanhar o prazo de SLA e avaliar/encerrar casos.
- Se for Especialista / Teleconsultor: oriente sobre aceitar casos na fila, emitir a Devolutiva Oficial, preencher a conduta e recomendações APS, tirar dúvidas no chat com o solicitante, entender que o campo de referências é opcional e consultar o painel financeiro.
- Se for Gestor Municipal: oriente sobre monitorar os casos e indicadores do seu próprio município (${perfil?.municipio || 'da cidade'}), verificar a resolutividade na atenção básica, redução de encaminhamentos físicos e exportação de relatórios. Enfatize que seus dados são estritamente isolados da sua cidade.
- Se for Administrador: auxilie com a administração completa da plataforma (gestão de perfis, aprovação de profissionais, cadastro de municípios, distribuição manual e relatórios gerenciais globais).
Seja sempre acolhedor, objetivo, humanizado e prestativo.`;

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
                parts: [{ text: `${SYSTEM_INSTRUCTION}\n\n${userContextPrompt}` }]
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
        const fallbackAnswer = getSmartFallbackAnswer(messageContent, perfil);
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
      const fallbackAnswer = getSmartFallbackAnswer(messageContent, perfil);

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
        text: getWelcomeMessage(perfil),
        timestamp: new Date(),
      }
    ];
    setMessages(initial);
    try {
      localStorage.removeItem(storageKey);
      localStorage.removeItem('doutortec_suporte_ia_messages');
    } catch (e) {
      console.warn('Erro ao limpar histórico do chat:', e);
    }
  };

  const primeiroNome = perfil?.nome ? perfil.nome.split(' ')[0] : '';

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-5 sm:right-5 z-30 flex flex-col items-end print:hidden">
      {/* Janela de Chat Profissional */}
      {isOpen && (
        <div 
          className="mb-3 w-[calc(100vw-2rem)] sm:w-104 max-w-sm rounded-2xl bg-white shadow-2xl border border-slate-200 flex flex-col overflow-hidden transition-all duration-200 animate-in fade-in slide-in-from-bottom-5"
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
                <p className="text-[10px] text-cyan-300 font-medium">
                  {getRoleDisplayTitle(perfil?.role)}
                  {primeiroNome ? ` • ${primeiroNome}` : ''}
                  {perfil?.role === 'gestor_municipal' && perfil?.municipio ? ` (${perfil.municipio})` : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleResetChat}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                title="Reiniciar conversa"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
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

          {/* Sugestões Rápidas Personalizadas por Perfil */}
          {messages.length <= 2 && (
            <div className="px-3.5 py-2 bg-white border-t border-slate-150 flex flex-wrap gap-1.5 shrink-0">
              <span className="w-full text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                Dúvidas para seu perfil:
              </span>
              {quickPrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(prompt)}
                  disabled={loading}
                  className="rounded-lg bg-slate-100 hover:bg-slate-200 hover:text-[#0ea5e9] px-2.5 py-1 text-[10px] text-slate-700 font-medium transition text-left shrink-0 disabled:opacity-50 cursor-pointer"
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
        className="group relative flex items-center gap-2 rounded-full p-3.5 sm:px-4 sm:py-3 shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 text-white cursor-pointer"
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
        <span className="hidden sm:inline text-xs font-bold tracking-wide pr-1">
          {isOpen ? 'Fechar IA' : 'Suporte IA'}
        </span>
        <Sparkles className="hidden sm:inline-block h-3.5 w-3.5 text-[#28ffb2]" />
      </button>
    </div>
  );
};

