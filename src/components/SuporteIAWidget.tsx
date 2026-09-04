import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
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

const SYSTEM_INSTRUCTION = `Você é o Assistente Virtual Oficial da plataforma Doutortec, um sistema especializado de Teleconsultoria e Interconsulta Médica que conecta profissionais da Atenção Primária à Saúde (APS) com Médicos Especialistas em tempo real.

Seu propósito é fornecer suporte operacional completo, claro, didático e acolhedor a todos os usuários da plataforma, explicando como utilizar cada funcionalidade, fluxo e recurso.

DIRETRIZES FUNDAMENTAIS:
- Responda sempre em português brasileiro de forma educada, prestativa, objetiva e estruturada (usando listas ou tópicos quando facilitar o entendimento).
- SEGURANÇA E PRIVACIDADE: NUNCA revele detalhes internos de código, banco de dados (tabelas, SQL, Supabase), nomes de arquivos de código, APIs, endpoints, tokens ou segredos técnicos do sistema. Você fala apenas do ponto de vista do USUÁRIO final (menus, telas, botões, formulários e regras de negócio).
- ESCOPO: Seu foco é o uso e a operação do sistema. Não prescreva diagnósticos ou tratamentos médicos diretos a pacientes; oriente os profissionais sobre os recursos da plataforma.

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

// Fallback responses when API key is not configured yet
const FALLBACK_KNOWLEDGE: Record<string, string> = {
  'como abrir um novo caso clínico?': `Para abrir uma nova solicitação (Perfil Solicitante):\n1. Acesse o menu **Casos** no painel lateral.\n2. Clique no botão **+ Novo Caso Clínico**.\n3. Selecione o paciente já cadastrado (ou cadastre no menu Pacientes).\n4. Escolha a Especialidade desejada e a Prioridade (Baixa: até 72h, Média: até 48h, Alta: até 12h).\n5. Descreva o histórico clínico, conduta atual e a dúvida diagnóstica/terapêutica.\n6. Anexe exames ou laudos em PDF/imagens (até 15MB por arquivo).\n7. Aceite o termo de responsabilidade e clique em **Enviar Caso Clínico**.`,
  'como cadastrar um paciente?': `Para cadastrar um paciente:\n1. Acesse o menu **Pacientes** na barra de navegação.\n2. Clique em **+ Novo Paciente**.\n3. Preencha Nome Completo, CPF, Cartão Nacional de Saúde (SUS), Data de Nascimento, Sexo e Município.\n4. Clique em **Salvar Paciente**. Ele estará disponível imediatamente para abertura de casos.`,
  'qual a função do gestor municipal?': `O **Gestor Municipal** é o perfil dedicado ao monitoramento da saúde local no Doutortec:\n• Possui visualização restrita exclusivamente aos casos, pacientes, métricas e relatórios do seu próprio município.\n• Acompanha em tempo real a taxa de resolutividade da Atenção Primária e quantos encaminhamentos presenciais foram evitados.\n• Monitora o cumprimento dos prazos de resposta (SLA) para a população da sua cidade.`,
  'como o especialista emite a resposta?': `O **Médico Especialista** responde o caso da seguinte forma:\n1. Localiza o caso com status 'Novo' e clica em **Aceitar Atendimento**.\n2. Se os dados forem insuficientes, pode clicar em **Devolver (Falta de Dados)**.\n3. Para emitir a Devolutiva Oficial, preenche:\n   - Conduta imediata e orientações para a APS;\n   - Indicação ou não de encaminhamento presencial com classificação de risco;\n   - Exames solicitados (se houver);\n   - Referências bibliográficas (campo opcional);\n   - Marcação de potencial SOF (Segunda Opinião Formativa).\n4. Clica em **Emitir Devolutiva Oficial**. O caso passa para o status 'Respondido'.`,
  'o campo de referências é obrigatório?': `**Não!** O campo de Referências Bibliográficas é **opcional**.\nO especialista pode citar protocolos, diretrizes do Ministério da Saúde ou artigos científicos quando considerar agregador, mas o parecer pode ser enviado normalmente sem o preenchimento desse campo.`,
  'como funciona o sla e prazos?': `Os prazos de resposta da teleconsultoria dependem da prioridade definida na abertura do caso:\n• **Alta Prioridade:** Prazo de até 12 horas.\n• **Média Prioridade:** Prazo de até 48 horas.\n• **Baixa Prioridade:** Prazo de até 72 horas.\n\nO sistema exibe um cronômetro visual em tempo real em cada caso: verde quando está no prazo, amarelo/laranja quando está próximo do vencimento e vermelho quando vencido.`
};

export const SuporteIAWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      sender: 'assistant',
      text: 'Olá! Sou o Assistente Virtual Doutortec. Como posso te ajudar com o uso da plataforma hoje?',
      timestamp: new Date(),
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

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

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

      if (!apiKey || apiKey === 'your-gemini-api-key' || apiKey.trim() === '') {
        // Safe Fallback: Verify if question matches common knowledge base
        const normalized = messageContent.toLowerCase();
        let matchedResponse: string | null = null;

        for (const [key, answer] of Object.entries(FALLBACK_KNOWLEDGE)) {
          if (normalized.includes(key) || key.includes(normalized)) {
            matchedResponse = answer;
            break;
          }
        }

        if (!matchedResponse) {
          // General friendly fallback response
          matchedResponse = `Olá! Sou o assistente Doutortec. Para habilitar respostas de IA generativa em tempo real com toda a flexibilidade, configure a variável **VITE_GEMINI_API_KEY** no arquivo \`.env\`.\n\nEnquanto isso, você pode consultar dúvidas comuns utilizando as sugestões rápidas abaixo ou o menu de Ajuda (ícone de interrogação no topo da página).`;
        }

        setTimeout(() => {
          setMessages(prev => [
            ...prev,
            {
              id: `assistant-${Date.now()}`,
              sender: 'assistant',
              text: matchedResponse!,
              timestamp: new Date(),
            }
          ]);
          setLoading(false);
        }, 500);
        return;
      }

      // Live Google Gemini API Integration with Fail-safe try/catch
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ 
        model: 'gemini-1.5-flash',
        systemInstruction: SYSTEM_INSTRUCTION
      });

      // Prepare conversation history (last 8 messages for context)
      const recentHistory = messages
        .filter(m => !m.isError)
        .slice(-8)
        .map(m => ({
          role: m.sender === 'user' ? 'user' : 'model',
          parts: [{ text: m.text }]
        }));

      const chat = model.startChat({
        history: recentHistory,
      });

      const result = await chat.sendMessage(messageContent);
      const responseText = result.response.text();

      setMessages(prev => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          sender: 'assistant',
          text: responseText || 'Entendido. Há mais alguma dúvida em que eu possa ajudar?',
          timestamp: new Date(),
        }
      ]);
    } catch (err: any) {
      console.warn('Suporte IA Doutortec: Erro silencioso ao chamar Gemini API:', err?.message || err);

      // Friendly in-chat fail-safe notification (never crashes application)
      setMessages(prev => [
        ...prev,
        {
          id: `assistant-err-${Date.now()}`,
          sender: 'assistant',
          text: '⚠️ Não foi possível obter a resposta dos servidores do Gemini no momento (verifique a cota ou a chave VITE_GEMINI_API_KEY no arquivo .env). Você também pode consultar o Guia no menu de Ajuda no topo da tela.',
          timestamp: new Date(),
          isError: true,
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: 'welcome-msg',
        sender: 'assistant',
        text: 'Olá! Sou o Assistente Virtual Doutortec. Como posso te ajudar com o uso da plataforma hoje?',
        timestamp: new Date(),
      }
    ]);
  };

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end print:hidden">
      {/* Chat Window Panel */}
      {isOpen && (
        <div 
          className="mb-3 w-84 sm:w-96 rounded-2xl bg-white shadow-2xl border border-slate-200 flex flex-col overflow-hidden transition-all duration-200 animate-in fade-in slide-in-from-bottom-5"
          style={{ height: '520px', maxHeight: 'calc(100vh - 100px)' }}
        >
          {/* Header */}
          <div 
            className="px-4 py-3.5 flex items-center justify-between text-white select-none shrink-0"
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
                <p className="text-[10px] text-slate-300">Suporte Operacional IA</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
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
                title="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/50 text-xs">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'assistant' && (
                  <div className="h-6 w-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="h-3.5 w-3.5" />
                  </div>
                )}
                <div
                  className={`rounded-2xl px-3.5 py-2.5 max-w-[82%] leading-relaxed break-words shadow-xs ${
                    msg.sender === 'user'
                      ? 'bg-[#0ea5e9] text-white rounded-br-xs font-medium'
                      : msg.isError
                      ? 'bg-rose-50 border border-rose-200 text-rose-800 rounded-bl-xs'
                      : 'bg-white border border-slate-200 text-slate-800 rounded-bl-xs whitespace-pre-wrap'
                  }`}
                >
                  {msg.text}
                  <div
                    className={`text-[9px] mt-1 text-right ${
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
                <div className="h-6 w-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                  <Bot className="h-3.5 w-3.5" />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-xs px-3 py-2 flex items-center gap-1.5 shadow-xs">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-600" />
                  <span className="text-[11px] text-slate-600">Consultando manual Doutortec...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick suggestions if 2 or fewer messages */}
          {messages.length <= 2 && (
            <div className="px-3 py-2 bg-white border-t border-slate-150 flex flex-wrap gap-1.5 shrink-0">
              <span className="w-full text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                Perguntas Frequentes:
              </span>
              {QUICK_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(prompt)}
                  disabled={loading}
                  className="rounded-lg bg-slate-100 hover:bg-slate-200 px-2.5 py-1 text-[10px] text-slate-700 font-medium transition text-left shrink-0 disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-2.5 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Digite sua dúvida sobre o sistema..."
              disabled={loading}
              className="flex-1 rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 disabled:bg-slate-50"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || loading}
              className="rounded-xl bg-[#091151] hover:bg-[#0c166b] disabled:bg-slate-200 text-white disabled:text-slate-400 p-2 transition shadow-xs cursor-pointer disabled:cursor-not-allowed shrink-0"
              title="Enviar mensagem"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}

      {/* Trigger Floating Action Button */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="group relative flex items-center gap-2 rounded-full px-4 py-3 shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 text-white"
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
