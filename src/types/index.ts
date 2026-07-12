export type UserRole = 'admin' | 'especialista' | 'solicitante' | 'telerregulador' | 'teleconsultor' | 'visualizador';

export type CadastroStatus = 'pendente' | 'aprovado' | 'rejeitado' | 'bloqueado';

export interface Perfil {
  id: string; // UUID
  nome: string;
  email: string;
  cpf: string;
  crm_coren?: string; // Opcional (CRM para clínicos, COREN para enfermeiros)
  role: UserRole;
  municipio: string;
  instituicao: string;
  telefone?: string; // Opcional
  status_cadastro: CadastroStatus;
  categoria_profissional?: string | null;
  created_at: string; // ISO Timestamp
  updated_at?: string; // ISO Timestamp
}

export type CasoStatus = 'novo' | 'em_progresso' | 'respondido' | 'fechado';

export type CasoPrioridade = 'baixa' | 'media' | 'alta';

export interface CasoAnexo {
  id: string;
  nome: string;
  url: string;
  tipo: string;
  tamanho: number;
  uploaded_by: string; // ID do Perfil
  created_at: string;
}

export interface CasoClinico {
  id: string; // UUID
  paciente_nome: string;
  especialidade_id: string; // UUID referenciando a tabela de especialidades
  prioridade: CasoPrioridade;
  historico_clinico: string;
  conduta_atual: string;
  duvida_clinica: string;
  solicitante_id: string; // UUID referenciando perfis (solicitante)
  especialista_id?: string; // UUID referenciando perfis (especialista, opcional no início)
  status: CasoStatus;
  created_at: string; // ISO Timestamp
  updated_at?: string; // ISO Timestamp
  respondido_em?: string; // ISO Timestamp (data de resposta do especialista)
  fechado_em?: string; // ISO Timestamp
  sla_horas?: number; // SLA acordado em horas para a prioridade/caso
  sla_limite?: string; // ISO Timestamp calculada de limite para resposta
  devolutiva_conduta?: string; // Resposta Direta / Conduta
  devolutiva_aps?: string; // Contribuições para a APS
}

export interface Especialidade {
  id: string; // UUID
  nome: string;
  descricao?: string;
  created_at: string;
}

export interface MensagemChat {
  id: string; // UUID
  caso_id: string; // UUID referenciando casos
  perfil_id: string; // UUID referenciando perfis (nome da coluna do banco)
  nome_remetente?: string; // Nome do remetente salvo
  texto: string; // Conteúdo da mensagem (nome da coluna do banco)
  anexos?: CasoAnexo[];
  criado_em: string; // ISO Timestamp (nome da coluna do banco)
}

export interface HistoricoReatribuicao {
  id: string; // UUID
  caso_id: string; // UUID referenciando casos
  especialista_anterior_id?: string; // UUID referenciando perfis
  novo_especialista_id: string; // UUID referenciando perfis
  reatribuido_por_id: string; // UUID referenciando perfis (normalmente admin)
  justificativa?: string;
  created_at: string; // ISO Timestamp
}
