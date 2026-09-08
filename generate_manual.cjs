const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

console.log('Iniciando geração da Apostila Completa Doutortec...');

// Carrega a logo em base64
const logoPath = path.join(__dirname, 'public', 'Logo-Doutortec-Original.png');
const logoBase64 = fs.readFileSync(logoPath).toString('base64');
const logoSrc = `data:image/png;base64,${logoBase64}`;

const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Manual do Usuário - Plataforma Doutortec</title>
<style>
  @page {
    size: A4 portrait;
    margin: 0;
  }
  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  body {
    font-family: Arial, Helvetica, sans-serif;
    color: #1e293b;
    background-color: #ffffff;
    margin: 0;
    padding: 0;
    font-size: 13px;
    line-height: 1.48;
  }

  /* Capa e Páginas */
  .page {
    width: 210mm;
    min-height: 297mm;
    padding: 18mm 18mm 16mm 18mm; max-height: 297mm; overflow: hidden;
    position: relative;
    page-break-after: always;
    break-after: page;
    background: #ffffff;
  }

  /* Cabeçalho e Rodapé padrão das páginas internas */
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2px solid #0284c7;
    padding-bottom: 8px;
    margin-bottom: 18px;
  }
  .page-header-logo {
    height: 32px;
    object-fit: contain;
  }
  .page-header-title {
    font-size: 10.5px;
    font-weight: bold;
    color: #0369a1;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .page-footer {
    position: absolute;
    bottom: 8mm;
    left: 20mm;
    right: 20mm;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid #e2e8f0;
    padding-top: 8px;
    font-size: 9.5px;
    color: #64748b;
  }

  /* CAPA OFICIAL */
  .cover-page {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 0;
    background: linear-gradient(145deg, #091e3a 0%, #0c365e 50%, #0369a1 100%);
    color: #ffffff;
    overflow: hidden;
  }
  .cover-top {
    padding: 48px 45px 30px 45px;
  }
  .cover-logo-box {
    background: #ffffff;
    padding: 16px 26px;
    border-radius: 16px;
    display: inline-block;
    box-shadow: 0 10px 25px rgba(0,0,0,0.3);
    margin-bottom: 35px;
  }
  .cover-logo {
    height: 58px;
    display: block;
  }
  .cover-badge {
    display: inline-block;
    background: rgba(14, 165, 233, 0.25);
    border: 1px solid #38bdf8;
    color: #7dd3fc;
    font-size: 11.5px;
    font-weight: bold;
    letter-spacing: 1.5px;
    padding: 6px 14px;
    border-radius: 30px;
    text-transform: uppercase;
    margin-bottom: 18px;
  }
  .cover-title {
    font-size: 32px;
    font-weight: 900;
    line-height: 1.2;
    margin: 0 0 14px 0;
    color: #ffffff;
    letter-spacing: -0.5px;
  }
  .cover-subtitle {
    font-size: 16.5px;
    line-height: 1.45;
    color: #bae6fd;
    font-weight: 400;
    margin-bottom: 22px;
    max-width: 90%;
  }
  .cover-divider {
    height: 4px;
    width: 90px;
    background: #0ea5e9;
    border-radius: 2px;
    margin-bottom: 22px;
  }
  .cover-tags-row {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    margin-top: 15px;
  }
  .cover-tag-pill {
    background: rgba(255, 255, 255, 0.12);
    border: 1px solid rgba(255, 255, 255, 0.25);
    padding: 5px 12px;
    border-radius: 6px;
    font-size: 11px;
    color: #f0f9ff;
    font-weight: 500;
  }

  .cover-bottom {
    background: rgba(4, 19, 39, 0.78);
    backdrop-filter: blur(8px);
    padding: 28px 45px 32px 45px;
    border-top: 1px solid rgba(56, 189, 248, 0.3);
    display: grid;
    grid-template-columns: 1.2fr 1fr 1fr;
    gap: 20px;
  }
  .cover-info-item h4 {
    font-size: 10.5px;
    text-transform: uppercase;
    color: #38bdf8;
    margin: 0 0 4px 0;
    letter-spacing: 0.8px;
  }
  .cover-info-item p {
    margin: 0;
    font-size: 12px;
    color: #f8fafc;
    font-weight: 500;
  }

  /* SUMÁRIO */
  .toc-box {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 14px 18px;
    margin-top: 12px;
  }
  .toc-item {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: 8px 0;
    border-bottom: 1px dashed #cbd5e1;
    font-size: 12.5px;
  }
  .toc-item:last-child {
    border-bottom: none;
  }
  .toc-title {
    font-weight: 600;
    color: #0f172a;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .toc-badge {
    background: #0284c7;
    color: #ffffff;
    font-size: 9.5px;
    font-weight: bold;
    padding: 2px 7px;
    border-radius: 4px;
  }
  .toc-page {
    font-weight: bold;
    color: #0284c7;
  }

  /* TÍTULOS E TIPOGRAFIA */
  h1 {
    font-size: 20px;
    color: #0f172a;
    margin-top: 0;
    margin-bottom: 12px;
    font-weight: 800;
    display: flex;
    align-items: center;
    gap: 10px;
    border-bottom: 2px solid #e2e8f0;
    padding-bottom: 5px;
  }
  h1 .mod-tag {
    background: #0284c7;
    color: #ffffff;
    font-size: 10.5px;
    padding: 3px 9px;
    border-radius: 5px;
    font-weight: bold;
    text-transform: uppercase;
  }
  h2 {
    font-size: 15px;
    color: #0369a1;
    margin-top: 16px;
    margin-bottom: 8px;
    font-weight: 700;
    border-left: 4px solid #0284c7;
    padding-left: 8px;
  }
  h3 {
    font-size: 13.5px;
    color: #1e293b;
    margin-top: 12px;
    margin-bottom: 5px;
    font-weight: bold;
  }
  p {
    margin-top: 0;
    margin-bottom: 8px;
    line-height: 1.48;
    color: #334155;
  }

  /* ELEMENTOS DIDÁTICOS E CAIXAS */
  .box-destaque {
    break-inside: avoid;
    page-break-inside: avoid;
    border-radius: 8px;
    padding: 10px 14px;
    margin: 12px 0;
    font-size: 12px;
    line-height: 1.42;
  }
  .box-dica {
    background-color: #f0fdf4;
    border-left: 4px solid #22c55e;
    color: #14532d;
  }
  .box-atencao {
    background-color: #fef2f2;
    border-left: 4px solid #ef4444;
    color: #7f1d1d;
  }
  .box-aviso {
    background-color: #fffbeb;
    border-left: 4px solid #f59e0b;
    color: #78350f;
  }
  .box-exemplo {
    background-color: #f0f9ff;
    border-left: 4px solid #0284c7;
    color: #075985;
  }
  .box-title {
    font-weight: bold;
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 3px;
    text-transform: uppercase;
    font-size: 10.5px;
    letter-spacing: 0.5px;
  }

  /* PASSOS NUMERADOS */
  .step-container {
    margin: 10px 0;
  }
  .step-item {
    display: flex;
    gap: 10px;
    margin-bottom: 10px;
    align-items: flex-start;
  }
  .step-number {
    background: #0284c7;
    color: #ffffff;
    font-weight: bold;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11.5px;
    flex-shrink: 0;
    margin-top: 1px;
    box-shadow: 0 2px 4px rgba(2, 132, 199, 0.3);
  }
  .step-content {
    flex: 1;
    font-size: 12.5px;
  }
  .step-content strong {
    color: #0f172a;
  }

  /* TABELAS ESTILIZADAS */
  .custom-table {
    width: 100%;
    border-collapse: collapse;
    margin: 12px 0;
    font-size: 11.5px;
    background: #ffffff;
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid #e2e8f0;
  }
  .custom-table th {
    background: #0f172a;
    color: #ffffff;
    text-align: left;
    padding: 8px 10px;
    font-weight: 700;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .custom-table td {
    padding: 7px 10px;
    border-bottom: 1px solid #f1f5f9;
    color: #334155;
    vertical-align: top;
  }
  .custom-table tr:nth-child(even) td {
    background-color: #f8fafc;
  }

  /* BADGES */
  .badge {
    display: inline-block;
    padding: 2px 7px;
    border-radius: 4px;
    font-size: 10.5px;
    font-weight: bold;
  }
  .badge-alta { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }
  .badge-media { background: #fef3c7; color: #92400e; border: 1px solid #fcd34d; }
  .badge-baixa { background: #dbeafe; color: #1e40af; border: 1px solid #93c5fd; }
  .badge-sucesso { background: #dcfce7; color: #166534; border: 1px solid #86efac; }
  .badge-perfil { background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; }

  /* CARDS GRID */
  .grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin: 10px 0;
  }
  .grid-3 {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 10px;
    margin: 10px 0;
  }
  .card-box {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 10px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.03);
  }
  .card-box-header {
    font-weight: bold;
    font-size: 11.5px;
    color: #0369a1;
    margin-bottom: 5px;
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .card-box-body {
    font-size: 11px;
    color: #475569;
    line-height: 1.38;
  }

  /* FLUXO INTERATIVO */
  .flow-container {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 10px 8px;
    margin: 12px 0;
  }
  .flow-step {
    text-align: center;
    flex: 1;
    padding: 0 4px;
  }
  .flow-icon {
    width: 32px;
    height: 32px;
    background: #0284c7;
    color: #fff;
    border-radius: 50%;
    margin: 0 auto 5px auto;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    font-size: 12px;
  }
  .flow-label {
    font-size: 10.5px;
    font-weight: bold;
    color: #0f172a;
    line-height: 1.2;
  }
  .flow-sub {
    font-size: 9px;
    color: #64748b;
    margin-top: 2px;
  }
  .flow-arrow {
    color: #94a3b8;
    font-size: 15px;
    font-weight: bold;
  }

  /* FAQ */
  .faq-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    margin-bottom: 8px;
    padding: 8px 12px;
  }
  .faq-q {
    font-weight: bold;
    font-size: 12px;
    color: #0369a1;
    margin-bottom: 3px;
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .faq-a {
    font-size: 11.5px;
    color: #334155;
    line-height: 1.42;
  }
</style>
</head>
<body>

<!-- PÁGINA 1: CAPA OFICIAL -->
<div class="page cover-page">
  <div class="cover-top">
    <div class="cover-logo-box">
      <img src="${logoSrc}" alt="Logo Doutortec" class="cover-logo">
    </div>
    <div class="cover-badge">Manual Operacional & Guia de Referência Oficial</div>
    <h1 class="cover-title">Manual e Guia Operacional de Uso da Plataforma Doutortec</h1>
    <div class="cover-subtitle">Guia Passo a Passo de Teleinterconsulta, Gestão Municipal e Suporte</div>
    <div class="cover-divider"></div>
    <p style="color: #e0f2fe; font-size: 13.5px; max-width: 85%; margin-bottom: 22px; line-height: 1.5;">
      Apostila de capacitação técnica e operacional completa voltada a Médicos Clínicos e Enfermeiros de UBS/Hospitais, Médicos Especialistas Consultores, Gestores Municipais de Saúde e Administradores da Rede.
    </p>
    <div class="cover-tags-row">
      <span class="cover-tag-pill">✓ Teleinterconsulta Médica Especializada</span>
      <span class="cover-tag-pill">✓ SLA Inteligente & Auditoria</span>
      <span class="cover-tag-pill">✓ Chat Clínico em Tempo Real</span>
      <span class="cover-tag-pill">✓ Gestão Financeira & Bônus</span>
      <span class="cover-tag-pill">✓ Suporte Operacional com IA</span>
    </div>
  </div>

  <div class="cover-bottom">
    <div class="cover-info-item">
      <h4>Plataforma & Versão</h4>
      <p>Doutortec Healthcare Suite v2.0</p>
      <p style="font-size: 10.5px; color: #94a3b8; margin-top: 2px;">Em conformidade com o CFM, CNS e LGPD</p>
    </div>
    <div class="cover-info-item">
      <h4>Destinatários</h4>
      <p>Clínicos, Especialistas, Gestores e Admins</p>
      <p style="font-size: 10.5px; color: #94a3b8; margin-top: 2px;">Redes Municipais e Consórcios de Saúde</p>
    </div>
    <div class="cover-info-item">
      <h4>Atualização & Emissão</h4>
      <p>Ano Vigente - Edição Revisada</p>
      <p style="font-size: 10.5px; color: #94a3b8; margin-top: 2px;">Documento Técnico para Capacitação</p>
    </div>
  </div>
</div>

<!-- PÁGINA 2: SUMÁRIO GERAL & VISÃO MACRO -->
<div class="page">
  <div class="page-header">
    <img src="${logoSrc}" class="page-header-logo" alt="Doutortec">
    <div class="page-header-title">Estrutura Programática da Apostila</div>
  </div>

  <h1>Sumário Geral e Roteiro de Leitura</h1>
  <p>
    Esta apostila foi estruturada metodologicamente em <strong>8 Módulos de Aprendizado</strong> para garantir que qualquer profissional de saúde ou administrador domine as funcionalidades do sistema com rapidez, segurança jurídica e excelência técnica.
  </p>

  <div class="toc-box">
    <div class="toc-item">
      <div class="toc-title"><span class="toc-badge">MÓDULO 1</span> Introdução e Conceitos da Plataforma Doutortec</div>
      <div class="toc-page">Página 3</div>
    </div>
    <div class="toc-item">
      <div class="toc-title"><span class="toc-badge">MÓDULO 2</span> Primeiros Passos, Autenticação e Interface Geral</div>
      <div class="toc-page">Página 4</div>
    </div>
    <div class="toc-item">
      <div class="toc-title"><span class="toc-badge">MÓDULO 3</span> Perfil Solicitante: Clínicos e Enfermeiros (Atenção Primária e Hospitais)</div>
      <div class="toc-page">Páginas 5 e 6</div>
    </div>
    <div class="toc-item">
      <div class="toc-title"><span class="toc-badge">MÓDULO 4</span> Perfil Especialista: Fila de Atendimento, Gestão de Casos e Parecer</div>
      <div class="toc-page">Páginas 7 e 8</div>
    </div>
    <div class="toc-item">
      <div class="toc-title"><span class="toc-badge">MÓDULO 5</span> Perfil Gestor Municipal: Secretaria de Saúde e Indicadores</div>
      <div class="toc-page">Página 9</div>
    </div>
    <div class="toc-item">
      <div class="toc-title"><span class="toc-badge">MÓDULO 6</span> Perfil Administrador: Gestão Geral, Credenciamento e Financeiro</div>
      <div class="toc-page">Página 10</div>
    </div>
    <div class="toc-item">
      <div class="toc-title"><span class="toc-badge">MÓDULO 7</span> Recursos Especiais: Suporte Integrado por IA e Visualizador Avançado</div>
      <div class="toc-page">Página 11</div>
    </div>
    <div class="toc-item">
      <div class="toc-title"><span class="toc-badge">MÓDULO 8</span> FAQ: Dúvidas Frequentes e Solução Rápida de Problemas</div>
      <div class="toc-page">Página 12</div>
    </div>
  </div>

  <h2>Fluxo de Valor da Teleinterconsulta Doutortec</h2>
  <p>
    O ciclo operacional integra a ponta assistencial (UBS, UPA e Hospital Municipal) diretamente aos melhores especialistas do país em um ambiente colaborativo e auditável:
  </p>

  <div class="flow-container">
    <div class="flow-step">
      <div class="flow-icon">1</div>
      <div class="flow-label">Abertura</div>
      <div class="flow-sub">Clínico cadastra paciente, dúvida e anexos</div>
    </div>
    <div class="flow-arrow">➔</div>
    <div class="flow-step">
      <div class="flow-icon">2</div>
      <div class="flow-label">Triagem</div>
      <div class="flow-sub">Fila por especialidade com SLA regressivo</div>
    </div>
    <div class="flow-arrow">➔</div>
    <div class="flow-step">
      <div class="flow-icon">3</div>
      <div class="flow-label">Interação</div>
      <div class="flow-sub">Chat bilateral com envio de laudos</div>
    </div>
    <div class="flow-arrow">➔</div>
    <div class="flow-step">
      <div class="flow-icon">4</div>
      <div class="flow-label">Devolutiva</div>
      <div class="flow-sub">Parecer estruturado com conduta e risco</div>
    </div>
    <div class="flow-arrow">➔</div>
    <div class="flow-step">
      <div class="flow-icon">5</div>
      <div class="flow-label">Desfecho</div>
      <div class="flow-sub">Avaliação, resolutividade e laudo em PDF</div>
    </div>
  </div>

  <div class="box-destaque box-dica">
    <div class="box-title">💡 Diretriz de Sucesso</div>
    A teleinterconsulta médica é uma ferramenta assíncrona/síncrona de médico para médico (ou enfermeiro para médico). Seu principal objetivo é qualificar a conduta clínica no território, evitando deslocamentos desnecessários e reduzindo a fila de espera do SUS.
  </div>

  <div class="page-footer">
    <span>Plataforma Doutortec | Manual e Guia Operacional do Usuário</span>
    <span>Página 2</span>
  </div>
</div>

<!-- PÁGINA 3: MÓDULO 1 -->
<div class="page">
  <div class="page-header">
    <img src="${logoSrc}" class="page-header-logo" alt="Doutortec">
    <div class="page-header-title">Módulo 1: Introdução & Conceitos</div>
  </div>

  <h1><span class="mod-tag">Módulo 1</span> Introdução e Conceitos da Plataforma</h1>

  <h2>1.1 O que é a Plataforma Doutortec?</h2>
  <p>
    A <strong>Plataforma Doutortec</strong> é uma solução tecnológica de ponta criada para operacionalizar a <strong>Teleinterconsulta Médica Especializada</strong> no Sistema Único de Saúde (SUS) e em redes parceiras. Através de um ambiente web intuitivo e altamente seguro, o sistema conecta médicos da Atenção Primária à Saúde (APS) e de hospitais municipais a médicos especialistas das mais diversas áreas da medicina.
  </p>
  <p>
    A ferramenta elimina a barreira geográfica, acelera diagnósticos complexos, direciona condutas farmacológicas corretas e evita o encaminhamento físico indevido para centros de referência distantes.
  </p>

  <h2>1.2 Níveis de Acesso e Perfis de Usuários</h2>
  <p>
    Para garantir conformidade com a <strong>LGPD (Lei Geral de Proteção de Dados)</strong> e normativas do <strong>CFM (Conselho Federal de Medicina)</strong>, o sistema opera sob rígido controle de papéis de acesso:
  </p>

  <table class="custom-table">
    <thead>
      <tr>
        <th style="width: 22%;">Perfil</th>
        <th style="width: 26%;">Público-Alvo</th>
        <th style="width: 32%;">Responsabilidade Principal</th>
        <th style="width: 20%;">Acesso a Dados</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><span class="badge badge-perfil">Solicitante</span></td>
        <td>Médicos Clínicos Gerais, Médicos de Família e Enfermeiros de UBS/UPAs.</td>
        <td>Cadastrar pacientes, abrir casos clínicos, anexar exames, trocar mensagens e avaliar o parecer final.</td>
        <td>Restrito aos pacientes e casos abertos em sua unidade/município.</td>
      </tr>
      <tr>
        <td><span class="badge badge-perfil">Especialista</span></td>
        <td>Médicos Titulados (RQE) com registro ativo no CRM da sua jurisdição.</td>
        <td>Puxar casos da fila de atendimento por especialidade/município, fazer triagem, interagir via chat e emitir o Parecer Técnico Oficial.</td>
        <td>Restrito aos casos da sua especialidade e municípios conveniados em fila ou assumidos.</td>
      </tr>
      <tr>
        <td><span class="badge badge-perfil">Gestor Municipal</span></td>
        <td>Secretários Municipais de Saúde e Coordenadores de Regulação Municipal.</td>
        <td>Acompanhar indicadores de resolutividade, tempo médio de resposta, volume de atendimentos e relatórios da cidade.</td>
        <td><strong>Isolamento estrito:</strong> Apenas dados do seu município contratante.</td>
      </tr>
      <tr>
        <td><span class="badge badge-perfil">Administrador</span></td>
        <td>Equipe Central de Operações, Telerreguladores Gerais e Suporte Avançado.</td>
        <td>Aprovação e bloqueio de usuários, credenciamento de municípios, balanceamento de distribuição e gestão financeira.</td>
        <td>Acesso global e irrestrito para auditoria e operação do sistema.</td>
      </tr>
    </tbody>
  </table>

  <div class="box-destaque box-atencao">
    <div class="box-title">⚠️ Regra de Segurança Regulatória e Prontuário</div>
    Em estrita conformidade com o Código de Ética Médica e a legislação de Prontuário Eletrônico, <strong>o sistema não permite a exclusão física de usuários ou pacientes com casos clínicos vinculados</strong>. Profissionais que deixarem a rede municipal são inativados via botão <strong>"Bloquear"</strong>, mantendo a autenticidade e rastreabilidade jurídica de todos os laudos expedidos.
  </div>

  <h2>1.3 Princípios de Isolamento e Sigilo</h2>
  <div class="grid-2">
    <div class="card-box">
      <div class="card-box-header">🔒 Isolamento Multimunicipal</div>
      <div class="card-box-body">
        Cada prefeitura conveniada opera em um ambiente isolado. Gestores e profissionais de uma cidade jamais visualizam dados de cidadãos ou relatórios de municípios vizinhos.
      </div>
    </div>
    <div class="card-box">
      <div class="card-box-header">📋 Validade Jurídica dos Pareceres</div>
      <div class="card-box-body">
        Todos os pareceres emitidos contêm carimbo temporal, identificação de CRM/RQE do consultor e termo de corresponsabilidade diagnóstica, podendo ser anexados ao PEP do município.
      </div>
    </div>
  </div>

  <div class="page-footer">
    <span>Plataforma Doutortec | Manual e Guia Operacional do Usuário</span>
    <span>Página 3</span>
  </div>
</div>

<!-- PÁGINA 4: MÓDULO 2 -->
<div class="page">
  <div class="page-header">
    <img src="${logoSrc}" class="page-header-logo" alt="Doutortec">
    <div class="page-header-title">Módulo 2: Primeiros Passos & Interface</div>
  </div>

  <h1><span class="mod-tag">Módulo 2</span> Primeiros Passos, Acesso e Interface Geral</h1>

  <h2>2.1 Como Acessar a Plataforma</h2>
  <div class="step-container">
    <div class="step-item">
      <div class="step-number">1</div>
      <div class="step-content">
        <strong>Acesso ao Portal:</strong> Abra o navegador de internet (Google Chrome ou Microsoft Edge recomendados) e acesse o endereço oficial fornecido pela coordenação da sua rede de saúde.
      </div>
    </div>
    <div class="step-item">
      <div class="step-number">2</div>
      <div class="step-content">
        <strong>Credenciais de Primeiro Acesso:</strong> Caso você tenha sido cadastrado pela gestão, utilize seu <strong>E-mail cadastrado</strong> e a senha padrão inicial <code>Mudar@123</code>.
      </div>
    </div>
    <div class="step-item">
      <div class="step-number">3</div>
      <div class="step-content">
        <strong>Alteração Obrigatória de Senha:</strong> Ao entrar com a senha padrão, um banner de segurança em destaque alertará sobre a necessidade de cadastrar uma senha individual forte para proteção dos prontuários.
      </div>
    </div>
    <div class="step-item">
      <div class="step-number">4</div>
      <div class="step-content">
        <strong>Recuperação de Senha:</strong> Caso esqueça suas credenciais, clique em <em>"Esqueci minha senha"</em> na tela de login e siga as instruções enviadas para o seu e-mail cadastrado.
      </div>
    </div>
  </div>

  <h2>2.2 Anatomia da Interface Doutortec</h2>
  <p>A interface foi projetada para minimizar o número de cliques e oferecer foco total na rotina clínica:</p>

  <div class="grid-2">
    <div class="card-box">
      <div class="card-box-header">📌 1. Menu Lateral de Navegação</div>
      <div class="card-box-body">
        Localizado à esquerda da tela. Dá acesso imediato às áreas de <strong>Dashboard</strong>, <strong>Casos</strong>, <strong>Pacientes</strong>, <strong>Notificações</strong> e módulos específicos do perfil (ex: Financeiro, Relatórios e Gerenciamento).
      </div>
    </div>
    <div class="card-box">
      <div class="card-box-header">🔔 2. Barra Superior e Notificações</div>
      <div class="card-box-body">
        Contém o ícone de sino com <strong>badges vermelhos pulsantes</strong> para novas mensagens no chat e pareceres emitidos, atalho rápido para a <strong>Central de Ajuda (?)</strong> e o perfil do usuário logado.
      </div>
    </div>
  </div>

  <h2>2.3 Prazos Operacionais e Indicador Visual de SLA</h2>
  <p>
    A Doutortec adota um sistema de <strong>SLA (Service Level Agreement)</strong> dinâmico e visível em todos os cards e detalhes dos casos, garantindo previsibilidade para a Atenção Primária:
  </p>

  <table class="custom-table">
    <thead>
      <tr>
        <th>Prioridade</th>
        <th>Prazo Máximo de SLA</th>
        <th>Indicação Clínica Típica</th>
        <th>Badge Visual</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Alta Prioridade</strong></td>
        <td>Até <strong>12 horas corridas</strong></td>
        <td>Suspeita de patologia aguda grave, risco de descompensação rápida, pós-operatório instável.</td>
        <td><span class="badge badge-alta">Alta (12h)</span></td>
      </tr>
      <tr>
        <td><strong>Média Prioridade</strong></td>
        <td>Até <strong>48 horas úteis</strong></td>
        <td>Ajuste terapêutico de doenças crônicas descontroladas, lesões dermatológicas extensas, queixas subagudas.</td>
        <td><span class="badge badge-media">Média (48h)</span></td>
      </tr>
      <tr>
        <td><strong>Baixa Prioridade</strong></td>
        <td>Até <strong>72 horas úteis</strong></td>
        <td>Orientação preventiva, dúvidas de conduta eletiva, investigação diagnóstica de curso crônico indolente.</td>
        <td><span class="badge badge-baixa">Baixa (72h)</span></td>
      </tr>
    </tbody>
  </table>

  <div class="box-destaque box-exemplo">
    <div class="box-title">⏱️ Significado das Cores do Cronômetro de SLA</div>
    • <strong>Verde:</strong> Caso recém-aberto ou dentro de mais de 50% do prazo regulamentar.<br>
    • <strong>Laranja / Âmbar:</strong> Alerta de proximidade do vencimento (menos de 25% do tempo restante).<br>
    • <strong>Vermelho:</strong> Caso estourou o prazo estabelecido. Gera alerta automático para a Regulação.
  </div>

  <div class="page-footer">
    <span>Plataforma Doutortec | Manual e Guia Operacional do Usuário</span>
    <span>Página 4</span>
  </div>
</div>

<!-- PÁGINA 5: MÓDULO 3 - PARTE 1 -->
<div class="page">
  <div class="page-header">
    <img src="${logoSrc}" class="page-header-logo" alt="Doutortec">
    <div class="page-header-title">Módulo 3: Perfil Solicitante (Passos 1 a 3)</div>
  </div>

  <h1><span class="mod-tag">Módulo 3</span> Perfil Solicitante: Guia Prático para Atenção Primária</h1>
  <p>
    Este módulo é direcionado a Médicos Generalistas, Médicos da Estratégia Saúde da Família (ESF) e Enfermeiros que atuam na ponta do cuidado e necessitam de apoio de teleconsultoria.
  </p>

  <h2 style="margin-top: 10px; margin-bottom: 5px;">Passo a Passo 1: Como Cadastrar um Novo Paciente</h2>
  <div class="step-container" style="margin: 6px 0;">
    <div class="step-item" style="margin-bottom: 6px;">
      <div class="step-number">1</div>
      <div class="step-content">
        No menu lateral esquerdo, clique em <strong>"Pacientes"</strong> e em seguida no botão <strong>"+ Novo Paciente"</strong> localizado no canto superior direito.
      </div>
    </div>
    <div class="step-item" style="margin-bottom: 6px;">
      <div class="step-number">2</div>
      <div class="step-content">
        Preencha os campos obrigatórios: <strong>Nome Completo</strong> (mínimo 3 caracteres), <strong>CPF</strong> (validado por algoritmo oficial da Receita Federal) e <strong>Cartão SUS (CNS)</strong> (exatamente 15 dígitos numéricos quando informado).
      </div>
    </div>
    <div class="step-item" style="margin-bottom: 6px;">
      <div class="step-number">3</div>
      <div class="step-content">
        Selecione a <strong>Data de Nascimento</strong> (data válida não futura, com cálculo dinâmico de idade/meses), o <strong>Sexo Biológico</strong> e selecione obrigatoriamente o <strong>Município de Origem</strong> (essencial para apuração e faturamento do convênio).
      </div>
    </div>
    <div class="step-item" style="margin-bottom: 6px;">
      <div class="step-number">4</div>
      <div class="step-content">
        Clique em <strong>"Salvar Paciente"</strong>. O registro passa por validação instantânea contra duplicidade de CPF e fica disponível para abertura de casos.
      </div>
    </div>
  </div>

  <h2 style="margin-top: 10px; margin-bottom: 5px;">Passo a Passo 2: Como Abrir um Caso Clínico de Interconsulta</h2>
  <div class="step-container" style="margin: 6px 0;">
    <div class="step-item" style="margin-bottom: 6px;">
      <div class="step-number">1</div>
      <div class="step-content">
        Acesse o menu <strong>"Casos"</strong> e clique no botão azul <strong>"+ Novo Caso Clínico"</strong>.
      </div>
    </div>
    <div class="step-item" style="margin-bottom: 6px;">
      <div class="step-number">2</div>
      <div class="step-content">
        <strong>Vínculo do Paciente:</strong> No campo de seleção, busque o paciente cadastrado pelo nome ou CPF. Se o paciente não estiver cadastrado, há um atalho rápido na própria tela.
      </div>
    </div>
    <div class="step-item" style="margin-bottom: 6px;">
      <div class="step-number">3</div>
      <div class="step-content">
        <strong>Especialidade Desejada:</strong> Selecione a especialidade requerida (ex: Cardiologia, Dermatologia, Endocrinologia, Neurologia, Pediatria, Ortopedia, Ginecologia, Psiquiatria, etc.).
      </div>
    </div>
    <div class="step-item" style="margin-bottom: 6px;">
      <div class="step-number">4</div>
      <div class="step-content">
        <strong>Classificação de Prioridade:</strong> Defina entre Alta (12h), Média (48h) ou Baixa (72h), justificando pelo quadro do paciente.
      </div>
    </div>
    <div class="step-item" style="margin-bottom: 6px;">
      <div class="step-number">5</div>
      <div class="step-content">
        <strong>Campos Clínicos Estruturados:</strong>
        <ul style="margin: 2px 0; padding-left: 18px;">
          <li><strong>Histórico Clínico e Antecedentes:</strong> Doença atual, comorbidades, alergias e exames prévios.</li>
          <li><strong>Conduta Atual e Medicamentos em Uso:</strong> Prescrições ativas, dosagens e resposta terapêutica observada.</li>
          <li><strong>Dúvida Clínica Objetiva:</strong> Pergunta clara ao especialista (ex: "Qual melhor combinação farmacológica diante da refratariedade?" ou "Lesão suspeita necessita de biópsia imediata?").</li>
        </ul>
      </div>
    </div>
  </div>

  <h2 style="margin-top: 10px; margin-bottom: 5px;">Passo a Passo 3: Envio de Anexos e Exames Complementares</h2>
  <p style="margin-bottom: 5px;">
    Anexar documentos de qualidade é decisivo para que o especialista consiga emitir um parecer resolutivo sem devoluções:
  </p>
  <ul style="padding-left: 18px; font-size: 11.5px; color: #334155; margin-top: 2px; margin-bottom: 6px;">
    <li><strong>Formatos Suportados:</strong> Documentos em <strong>PDF</strong>, imagens fotográficas em <strong>PNG</strong> e <strong>JPG/JPEG</strong>.</li>
    <li><strong>Limite de Tamanho:</strong> Até <strong>15 MB por arquivo</strong>, permitindo múltiplos uploads no mesmo caso.</li>
    <li><strong>Boas Práticas para Fotos de Lesões:</strong> Tire fotos nítidas com boa iluminação, uma foto panorâmica de localização e uma foto em close focada com régua milimétrica ao lado se possível.</li>
    <li><strong>Exames Laboratoriais e ECG:</strong> Fotografe ou digitalize o traçado eletrocardiográfico por inteiro, incluindo cabeçalho com velocidade (25mm/s) e ganho (N).</li>
  </ul>

  <div class="box-destaque box-aviso" style="page-break-inside: avoid; break-inside: avoid; margin-top: 10px; margin-bottom: 6px;">
    <div class="box-title">📌 Termo de Responsabilidade Legal Obrigatório</div>
    Antes de submeter o caso, é obrigatório marcar o checkbox de aceite do termo legal da teleinterconsulta, certificando a veracidade das informações sob responsabilidade do profissional solicitante.
  </div>

  <div class="page-footer">
    <span>Plataforma Doutortec | Manual e Guia Operacional do Usuário</span>
    <span>Página 5</span>
  </div>
</div>

<!-- PÁGINA 6: MÓDULO 3 - PARTE 2 -->
<div class="page" style="page-break-before: always; break-before: page;">
  <div class="page-header">
    <img src="${logoSrc}" class="page-header-logo" alt="Doutortec">
    <div class="page-header-title">Módulo 3: Perfil Solicitante (Passos 4 e 5)</div>
  </div>

  <h2>Passo a Passo 4: Uso do Chat em Tempo Real com o Especialista</h2>
  <p>
    A Doutortec conta com um canal de comunicação bidirecional seguro, dispensando aplicativos externos informais como WhatsApp:
  </p>

  <div class="grid-2">
    <div class="card-box">
      <div class="card-box-header">💬 Recursos do Chat Integrado</div>
      <div class="card-box-body">
        • <strong>Identificação Clara:</strong> Cada mensagem sinaliza com clareza o autor (ex: "Dr. João - Solicitante" vs "Dra. Maria - Cardiologista").<br>
        • <strong>Carimbo de Data e Hora:</strong> Registro cronológico indelével para prontuário.<br>
        • <strong>Envio de Anexos no Chat:</strong> É possível enviar novas fotos ou resultados de exames que saíram após a abertura do caso diretamente na conversa.<br>
        • <strong>Notificação Automática:</strong> Avisos instantâneos com badges quando há nova mensagem.
      </div>
    </div>
    <div class="card-box">
      <div class="card-box-header">🎯 Quando Utilizar o Chat?</div>
      <div class="card-box-body">
        Utilize o chat para:<br>
        1. Esclarecer dúvidas pontuais solicitadas pelo especialista;<br>
        2. Atualizar sinais vitais ou evolução aguda do paciente enquanto aguarda o parecer;<br>
        3. Enviar laudo de urgência que acaba de ser liberado pelo laboratório municipal.
      </div>
    </div>
  </div>

  <h2>Passo a Passo 5: Recebimento do Parecer, Avaliação e Download do PDF</h2>
  <p>
    Assim que o especialista finaliza o atendimento, o status do caso muda automaticamente para <strong>"Respondido"</strong>:
  </p>

  <div class="step-container">
    <div class="step-item">
      <div class="step-number">1</div>
      <div class="step-content">
        <strong>Leitura do Parecer Técnico:</strong> Acesse os detalhes do caso. Na aba principal estará a resposta oficial dividida em: <em>Conduta Imediata</em>, <em>Orientações para a APS</em> e <em>Classificação de Risco</em>.
      </div>
    </div>
    <div class="step-item">
      <div class="step-number">2</div>
      <div class="step-content">
        <strong>Avaliação de Resolutividade e Satisfação (Obrigatório):</strong> Clique no botão <strong>"Avaliar e Encerrar"</strong>. Selecione de 1 a 5 estrelas para a qualidade da consultoria e responda se a interconsulta evitou que o paciente fosse encaminhado para consulta presencial fora do município.
      </div>
    </div>
    <div class="step-item">
      <div class="step-number">3</div>
      <div class="step-content">
        <strong>Download do Parecer Oficial em PDF:</strong> Clique no botão <strong>"Baixar Parecer (PDF)"</strong>. O sistema gera instantaneamente um documento timbrado oficial em folha A4 com autoajuste milimétrico (sem quebras de página indesejadas) contendo:
        <ul>
          <li>Cabeçalho institucional timbrado com identificação do paciente, CPF, Cartão SUS e Município de Origem;</li>
          <li>Registro profissional e especialidade do Solicitante e do Especialista Consultor (CRM/COREN, UF e RQE);</li>
          <li>Solicitação clínica integral (histórico, conduta prévia e dúvida formulada);</li>
          <li>Parecer estruturado completo com conduta recomendada, orientações para APS e classificação de risco;</li>
          <li>Hash criptográfico de autenticação eletrônica com carimbo indelével de data e hora.</li>
        </ul>
      </div>
    </div>
    <div class="step-item">
      <div class="step-number">4</div>
      <div class="step-content">
        <strong>Anexação ao Prontuário:</strong> Imprima o PDF para a pasta física do paciente ou faça o upload direto no Prontuário Eletrônico do Cidadão (e-SUS PEC ou prontuário municipal).
      </div>
    </div>
  </div>

  <div class="box-destaque box-dica">
    <div class="box-title">⭐ Importância da Avaliação para a Gestão</div>
    A nota e a confirmação de "encaminhamento evitado" são as métricas vitais que alimentam os gráficos da Secretaria Municipal de Saúde, demonstrando a economia de recursos de transporte e a resolutividade local da Atenção Primária.
  </div>

  <div class="page-footer">
    <span>Plataforma Doutortec | Manual e Guia Operacional do Usuário</span>
    <span>Página 6</span>
  </div>
</div>

<!-- PÁGINA 7: MÓDULO 4 - PARTE 1 -->
<div class="page">
  <div class="page-header">
    <img src="${logoSrc}" class="page-header-logo" alt="Doutortec">
    <div class="page-header-title">Módulo 4: Perfil Especialista (Passos 1 e 2)</div>
  </div>

  <h1><span class="mod-tag">Módulo 4</span> Perfil Especialista: Consultores e Reguladores</h1>
  <p>
    Este módulo orienta os Médicos Especialistas sobre o novo fluxo de atendimento: como navegar na <strong>Fila de Atendimento</strong>, puxar casos disponíveis de seus municípios conveniados, gerenciar <strong>Meus Casos</strong> e cumprir rigorosamente o SLA.
  </p>

  <h2>Passo a Passo 1: Acesso à Fila de Atendimento e Casos Disponíveis</h2>
  <div class="step-container">
    <div class="step-item">
      <div class="step-number">1</div>
      <div class="step-content">
        Ao efetuar login, o médico especialista dispõe de dois menus centrais: <strong>"Fila de Atendimento"</strong> (casos novos livres para assumir) e <strong>"Meus Casos"</strong> (casos já assumidos pelo profissional).
      </div>
    </div>
    <div class="step-item">
      <div class="step-number">2</div>
      <div class="step-content">
        <strong>Filtro Automático de Convênios e Especialidade:</strong> A Fila de Atendimento lista única e exclusivamente as solicitações abertas das especialidades e municípios conveniados autorizados para o médico.
      </div>
    </div>
    <div class="step-item">
      <div class="step-number">3</div>
      <div class="step-content">
        <strong>Monitoramento Ativo do Cronômetro de SLA:</strong> Casos classificados como "Alta Prioridade" possuem badge vermelho e contagem regressiva de 12 horas. Eles aparecem no topo para puxada prioritária.
      </div>
    </div>
  </div>

  <h2>Passo a Passo 2: Como Puxar um Caso e Iniciar o Atendimento</h2>
  <div class="step-container">
    <div class="step-item">
      <div class="step-number">1</div>
      <div class="step-content">
        Na tela <strong>"Fila de Atendimento"</strong>, examine os cards dos casos com dados do paciente, município de origem, especialidade, prioridade e tempo restante de SLA.
      </div>
    </div>
    <div class="step-item">
      <div class="step-number">2</div>
      <div class="step-content">
        <strong>Botão "Puxar Atendimento":</strong> Ao clicar no botão azul de puxar atendimento, o sistema realiza atribuição com concorrência atômica via banco de dados, vinculando o caso imediatamente ao especialista e migrando-o para a tela <strong>"Meus Casos"</strong> com status <em>"Em Progresso"</em>.
      </div>
    </div>
    <div class="step-item">
      <div class="step-number">3</div>
      <div class="step-content">
        <strong>Análise e Triagem Clínica:</strong> Acesse o caso assumido em <strong>"Meus Casos"</strong> para analisar o histórico clínico, medicações e exames anexos no visualizador integrado. Caso falte dado essencial, utilize o botão <strong>"Devolver (Falta de Dados)"</strong> justificando o motivo à APS.
      </div>
    </div>
  </div>

  <div class="box-destaque box-atencao">
    <div class="box-title">⚡ Atribuição Segura e Concorrência Atômica</div>
    Se outro especialista clicar no mesmo milissegundo em um caso da fila, o sistema notifica graciosamente que o caso acabou de ser assumido, evitando duplicidade de atendimento médico.
  </div>

  <div class="page-footer">
    <span>Plataforma Doutortec | Manual e Guia Operacional do Usuário</span>
    <span>Página 7</span>
  </div>
</div>

<!-- PÁGINA 8: MÓDULO 4 - PARTE 2 -->
<div class="page">
  <div class="page-header">
    <img src="${logoSrc}" class="page-header-logo" alt="Doutortec">
    <div class="page-header-title">Módulo 4: Perfil Especialista (Passos 3 e 4)</div>
  </div>

  <h2>Passo a Passo 3: Emissão do Parecer Técnico Estruturado</h2>
  <p>
    O Doutortec utiliza um modelo de <strong>Parecer Estruturado em 5 Blocos</strong>, padronizado com as melhores diretrizes internacionais de Telessaúde:
  </p>

  <table class="custom-table">
    <thead>
      <tr>
        <th style="width: 25%;">Bloco Estruturado</th>
        <th style="width: 75%;">Objetivo e Conteúdo a Preencher</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>1. Resposta Direta / Conduta Imediata</strong></td>
        <td>Descreva de forma clara a conduta para o médico solicitante: prescrição recomendada (fármaco, dose, posologia e duração), suspensão de medicamentos prévios ou condutas de suporte imediato.</td>
      </tr>
      <tr>
        <td><strong>2. Contribuições para a APS</strong></td>
        <td>Orientações de acompanhamento longitudinal no território: quais exames de controle solicitar em 30/60 dias, sinais de alarme para orientar a família e medidas comportamentais/estilo de vida.</td>
      </tr>
      <tr>
        <td><strong>3. Encaminhamento & Gravidade</strong></td>
        <td>
          Indique com clareza se o paciente precisa de encaminhamento físico para ambulatório de especialidade ou se pode ser manejado 100% na UBS. Selecione a classificação de risco:<br>
          <span class="badge badge-alta" style="margin-top: 4px;">Vermelha - Imediato</span>
          <span class="badge badge-media">Amarela - Prioritário</span>
          <span class="badge badge-baixa">Verde - Eletivo</span>
          <span class="badge badge-sucesso">Azul - Dispensado</span>
        </td>
      </tr>
      <tr>
        <td><strong>4. Exames Complementares</strong></td>
        <td>Sugira quais exames diagnósticos adicionais a rede básica deve agendar para refinar a investigação.</td>
      </tr>
      <tr>
        <td><strong>5. Referências Bibliográficas</strong></td>
        <td>
          <span class="badge badge-sucesso">100% OPCIONAL</span> Diretrizes e fontes científicas (formato Vancouver). Pode ser deixado em branco se a rotina for ágil.
        </td>
      </tr>
    </tbody>
  </table>

  <h2>Passo a Passo 4: Sinalização de Potencial SOF (Segunda Opinião Formativa)</h2>
  <p>
    Ao preencher o parecer, marque a caixa <strong>"Potencial para Segunda Opinião Formativa (SOF)"</strong> se o caso abordar uma dúvida clínica recorrente ou situação educativa valiosa. Esses casos são anonimizados e catalogados na biblioteca de conhecimento médico da rede.
  </p>

  <h2>4.5 Painel Financeiro e Ranking do Especialista</h2>
  <div class="grid-2">
    <div class="card-box">
      <div class="card-box-header">💰 Extrato Financeiro</div>
      <div class="card-box-body">
        No menu lateral <strong>"Financeiro"</strong>, o especialista acompanha a produção mensal, valor acumulado por parecer concluído e histórico de bônus creditados pela administração.
      </div>
    </div>
    <div class="card-box">
      <div class="card-box-header">🏆 Score e Ranking de Teleconsultores</div>
      <div class="card-box-body">
        No menu <strong>"Ranking"</strong>, é exibido o score de desempenho (0 a 100) com base no cumprimento de prazos de SLA e notas de satisfação atribuídas pelos médicos da atenção básica.
      </div>
    </div>
  </div>

  <div class="box-destaque box-dica">
    <div class="box-title">💡 Dica de Excelência para o Teleconsultor</div>
    Seja específico nas doses e alternativas terapêuticas disponíveis na Relação Municipal de Medicamentos Essenciais (REMUME). Respostas claras e acolhedoras elevam sua nota média no ranking do sistema.
  </div>

  <div class="page-footer">
    <span>Plataforma Doutortec | Manual e Guia Operacional do Usuário</span>
    <span>Página 8</span>
  </div>
</div>

<!-- PÁGINA 9: MÓDULO 5 -->
<div class="page">
  <div class="page-header">
    <img src="${logoSrc}" class="page-header-logo" alt="Doutortec">
    <div class="page-header-title">Módulo 5: Perfil Gestor Municipal</div>
  </div>

  <h1><span class="mod-tag">Módulo 5</span> Perfil Gestor Municipal: Secretarias de Saúde</h1>
  <p>
    Desenvolvido especificamente para <strong>Secretários Municipais de Saúde</strong>, Diretores de Atenção Básica e Coordenadores de Regulação, proporcionando transparência e inteligência epidemiológica para a tomada de decisões.
  </p>

  <h2>5.1 Isolamento de Dados e Privacidade Municipal</h2>
  <p>
    O Doutortec assegura por arquitetura que os gestores tenham acesso <strong>exclusivamente aos cidadãos, profissionais e casos da sua comarca</strong>. Informações clínicas e estatísticas de cidades parceiras são 100% segregadas, garantindo integridade e sigilo.
  </p>

  <h2>5.2 Painel de Indicadores e Relatórios em Tempo Real</h2>
  <p>
    Ao acessar o menu <strong>"Relatórios"</strong>, o gestor dispõe de gráficos executivos alimentados em tempo real:
  </p>

  <div class="grid-3">
    <div class="card-box">
      <div class="card-box-header">📊 Taxa de Resolutividade</div>
      <div class="card-box-body">
        Percentual de pacientes cujo problema de saúde foi solucionado na própria Unidade Básica de Saúde, eliminando o custo do transporte intermunicipal (TFD).
      </div>
    </div>
    <div class="card-box">
      <div class="card-box-header">⏱️ Tempo Médio de Resposta</div>
      <div class="card-box-body">
        Monitoramento do tempo entre a emissão da dúvida pelo clínico e a resposta do especialista, comprovando a eficiência dos prazos de SLA contratual.
      </div>
    </div>
    <div class="card-box">
      <div class="card-box-header">📈 Demanda por Especialidade</div>
      <div class="card-box-body">
        Identificação gráfica de quais especialidades (ex: Dermatologia, Cardiologia, Ortopedia) possuem maior fila reprimida na rede municipal.
      </div>
    </div>
  </div>

  <h2>5.3 Como Exportar o Relatório Gerencial em PDF</h2>
  <div class="step-container">
    <div class="step-item">
      <div class="step-number">1</div>
      <div class="step-content">
        Acesse o menu lateral <strong>"Relatórios"</strong>.
      </div>
    </div>
    <div class="step-item">
      <div class="step-number">2</div>
      <div class="step-content">
        Filtre pelo período desejado (Data Inicial e Data Final) e aplique filtros específicos de especialidade se desejar.
      </div>
    </div>
    <div class="step-item">
      <div class="step-number">3</div>
      <div class="step-content">
        Clique no botão <strong>"Exportar Relatório PDF"</strong> no canto superior direito.
      </div>
    </div>
    <div class="step-item">
      <div class="step-number">4</div>
      <div class="step-content">
        O sistema compilará os gráficos, tabelas de resolutividade e números consolidados em um documento PDF timbrado, pronto para apresentação a Conselhos Municipais de Saúde (CMS) e prestações de contas oficiais.
      </div>
    </div>
  </div>

  <div class="box-destaque box-exemplo">
    <div class="box-title">📌 Impacto Econômico e Social</div>
    Em municípios que utilizam a plataforma Doutortec, a média histórica aponta que <strong>mais de 70% das interconsultas evitam deslocamento físico do paciente</strong> para capitais ou polos regionais, gerando alívio financeiro imediato aos cofres municipais e conforto humanizado para as famílias.
  </div>

  <div class="page-footer">
    <span>Plataforma Doutortec | Manual e Guia Operacional do Usuário</span>
    <span>Página 9</span>
  </div>
</div>

<!-- PÁGINA 10: MÓDULO 6 -->
<div class="page">
  <div class="page-header">
    <img src="${logoSrc}" class="page-header-logo" alt="Doutortec">
    <div class="page-header-title">Módulo 6: Perfil Administrador Geral</div>
  </div>

  <h1><span class="mod-tag">Módulo 6</span> Perfil Administrador: Gestão Geral e Financeira</h1>
  <p>
    O perfil de <strong>Administrador Geral</strong> centraliza o controle operacional de toda a malha de telessaúde, cadastro de municípios, aprovação regulatória de médicos e parametrizações financeiras.
  </p>

  <h2>6.1 Aprovação e Validação Regulatória de Profissionais</h2>
  <div class="step-container">
    <div class="step-item">
      <div class="step-number">1</div>
      <div class="step-content">
        Acesse o menu <strong>"Aprovar Clínicos"</strong> para visualizar a fila de novos médicos e enfermeiros que solicitaram cadastro.
      </div>
    </div>
    <div class="step-item">
      <div class="step-number">2</div>
      <div class="step-content">
        <strong>Conferência Obrigatória:</strong> Valide o número do <strong>CRM/COREN</strong>, a respectiva <strong>UF</strong> e, para médicos especialistas, o <strong>RQE (Registro de Qualificação de Especialista)</strong> no portal do Conselho.
      </div>
    </div>
    <div class="step-item">
      <div class="step-number">3</div>
      <div class="step-content">
        Clique em <strong>"Aprovar"</strong> para habilitar o acesso ou <strong>"Rejeitar"</strong> inserindo a justificativa que será disparada ao e-mail do profissional.
      </div>
    </div>
  </div>

  <h2>6.2 Gestão de Perfis de Usuários (Sem Exclusão Física)</h2>
  <p>
    No menu <strong>"Gerenciar Perfis"</strong>, o administrador encontra a tabela de todos os usuários cadastrados:
  </p>
  <ul style="padding-left: 20px; font-size: 12px; color: #334155;">
    <li><strong>+ Cadastrar Profissional:</strong> Criação direta de conta com senha padrão <code>Mudar@123</code>.</li>
    <li><strong>Botão "Editar":</strong> Atualiza telefone, municípios de atuação e especialidades do usuário.</li>
    <li><strong>Botão "Bloquear":</strong> <span style="color: #b91c1c; font-weight: bold;">Substitui a exclusão física</span>. Inativa o login instantaneamente, preservando todos os laudos já assinados pelo médico na base de dados para auditoria pericial.</li>
  </ul>

  <h2>6.3 Painel Financeiro, Parametrização de Tarifas e Bônus</h2>
  <div class="grid-2">
    <div class="card-box">
      <div class="card-box-header">⚙️ Configuração de Tarifas Combinadas</div>
      <div class="card-box-body">
        No botão <strong>"Configurar Tarifas"</strong>, o admin define a Tarifa Padrão Global e cria regras customizadas de precificação hierárquicas:
        <br>• <strong>Município + Especialidade (Recomendado):</strong> valores diferenciados por convênio local e área médica;
        <br>• <strong>Município + Especialista Específico:</strong> contratos individuais;
        <br>• <strong>Faturamento vs Repasses:</strong> define o Valor do Caso (Faturamento municipal) e o Repasse ao Especialista/Clínico.
      </div>
    </div>
    <div class="card-box">
      <div class="card-box-header">🎁 Bônus Manual e Retificação</div>
      <div class="card-box-body">
        • <strong>Lançar Bônus Extra:</strong> Bonificação em R$ creditada a um especialista com justificativa administrativa obrigatória registrada para auditoria contábil.
        <br>• <strong>Retificar Produção:</strong> Botão de edição (ícone de lápis) para ajuste fino ou correção auditada de quantidade de casos faturados no fechamento do mês.
      </div>
    </div>
  </div>

  <h2>6.4 Módulo de Distribuição e Reatribuição de Casos</h2>
  <p>
    Em situações excepcionais de ausência médica ou acúmulo de fila, o menu <strong>"Distribuição"</strong> permite que o telerregulador selecione um caso em andamento e transfira sua responsabilidade para outro médico consultor credenciado, gerando registro indelével no log de auditoria.
  </p>

  <div class="page-footer">
    <span>Plataforma Doutortec | Manual e Guia Operacional do Usuário</span>
    <span>Página 10</span>
  </div>
</div>

<!-- PÁGINA 11: MÓDULO 7 -->
<div class="page">
  <div class="page-header">
    <img src="${logoSrc}" class="page-header-logo" alt="Doutortec">
    <div class="page-header-title">Módulo 7: Recursos Especiais & IA</div>
  </div>

  <h1><span class="mod-tag">Módulo 7</span> Recursos Especiais: Suporte com IA e Visualizador</h1>

  <h2>7.1 Assistente de Suporte Operacional Integrado com Inteligência Artificial</h2>
  <p>
    A Plataforma Doutortec dispõe de um <strong>Assistente Virtual Inteligente</strong> acessível diretamente na interface para sanar dúvidas operacionais em segundos, sem necessidade de abertura de chamados demorados:
  </p>

  <div class="grid-2">
    <div class="card-box">
      <div class="card-box-header">🤖 Onde Encontrar o Assistente?</div>
      <div class="card-box-body">
        O widget de suporte fica disponível no canto inferior direito da tela através de um botão flutuante com o ícone de assistente/robô. Ao clicar, o chat inteligente abre sem sobrepor a atividade clínica principal.
      </div>
    </div>
    <div class="card-box">
      <div class="card-box-header">⚡ Prompts Rápidos Contextuais</div>
      <div class="card-box-body">
        O assistente identifica automaticamente o perfil do usuário logado (Clínico, Especialista, Gestor ou Admin) e apresenta botões de perguntas rápidas personalizadas para aquele papel.
      </div>
    </div>
  </div>

  <div class="box-destaque box-dica">
    <div class="box-title">💡 Grounding Completo contra Alucinações</div>
    A Inteligência Artificial do Doutortec é alimentada pela especificação estruturada oficial do sistema. Ela conhece exatamente a localização de cada botão, os prazos de SLA e jamais inventará comandos inexistentes.
  </div>

  <h2>7.2 Visualizador Avançado de Documentos e Exames</h2>
  <p>
    Para evitar que o profissional precise baixar dezenas de laudos e exames para o disco local, a Doutortec integra um visualizador médico de alta definição nativo:
  </p>

  <table class="custom-table">
    <thead>
      <tr>
        <th style="width: 25%;">Ferramenta</th>
        <th style="width: 25%;">Comando / Ícone</th>
        <th style="width: 50%;">Aplicação Prática no Diagnóstico</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Zoom Dinâmico</strong></td>
        <td>Botões <strong>(+)</strong> e <strong>(-)</strong></td>
        <td>Permite ampliar de 50% até 200% para leitura de letras miúdas em laudos e avaliação de detalhes dérmicos.</td>
      </tr>
      <tr>
        <td><strong>Rotação de Página</strong></td>
        <td>Botão <strong>Girar (90°)</strong></td>
        <td>Corrige a orientação de fotos e PDFs digitalizados de cabeça para baixo ou de lado pelo solicitante.</td>
      </tr>
      <tr>
        <td><strong>Navegação de Páginas</strong></td>
        <td>Setas <strong>Anterior / Próxima</strong></td>
        <td>Navega por documentos multipáginas em PDF sem travar a interface do navegador.</td>
      </tr>
      <tr>
        <td><strong>Modo Tela Cheia</strong></td>
        <td>Ícone <strong>Expandir</strong></td>
        <td>Maximiza o documento ocupando 100% da tela para visualização imersiva de traçados de ECG e imagens de tomografia.</td>
      </tr>
    </tbody>
  </table>

  <div class="page-footer">
    <span>Plataforma Doutortec | Manual e Guia Operacional do Usuário</span>
    <span>Página 11</span>
  </div>
</div>

<!-- PÁGINA 12: MÓDULO 8 -->
<div class="page">
  <div class="page-header">
    <img src="${logoSrc}" class="page-header-logo" alt="Doutortec">
    <div class="page-header-title">Módulo 8: FAQ & Resolução de Dúvidas</div>
  </div>

  <h1><span class="mod-tag">Módulo 8</span> Perguntas Frequentes (FAQ) e Solução de Problemas</h1>

  <div class="faq-card">
    <div class="faq-q">❓ 1. O que fazer se eu esquecer a minha senha de acesso?</div>
    <div class="faq-a">Na tela inicial de login, clique no link <em>"Esqueci minha senha"</em>, informe seu e-mail cadastrado e você receberá um token seguro para cadastrar uma nova senha. Caso tenha problemas com o e-mail, solicite ao Administrador Municipal a redefinição para a senha temporária padrão <code>Mudar@123</code>.</div>
  </div>

  <div class="faq-card">
    <div class="faq-q">❓ 2. O preenchimento do campo de referências bibliográficas pelo especialista é obrigatório?</div>
    <div class="faq-a"><strong>Não.</strong> O campo de referências bibliográficas na Devolutiva Oficial é <strong>100% opcional</strong>. Foi projetado para dar flexibilidade ao especialista em rotinas ágeis, podendo ser enviado em branco sem bloquear a emissão do parecer.</div>
  </div>

  <div class="faq-card">
    <div class="faq-q">❓ 3. Posso excluir o cadastro de um paciente que inseri com dados errados?</div>
    <div class="faq-a">Se o paciente ainda <strong>não possuir casos clínicos vinculados</strong>, você pode solicitar a correção cadastral. Se já houver interconsultas abertas ou respondidas, a exclusão é proibida por normativas do CFM para preservar a integridade do prontuário médico.</div>
  </div>

  <div class="faq-card">
    <div class="faq-q">❓ 4. Por que não encontro o botão de excluir usuários no menu de Gerenciamento?</div>
    <div class="faq-a">Por exigência legal da LGPD e do Prontuário Médico Digital, nenhum usuário que interagiu com pacientes pode ser deletado do banco de dados. Para desativar o acesso de um profissional, utilize o botão vermelho <strong>"Bloquear"</strong>, que revoga o acesso imediatamente preservando os históricos.</div>
  </div>

  <div class="faq-card">
    <div class="faq-q">❓ 5. Qual o tamanho máximo e tipos de arquivos aceitos para upload de exames?</div>
    <div class="faq-a">O sistema suporta arquivos em formato <strong>PDF</strong>, imagens fotográficas <strong>PNG</strong> e <strong>JPG</strong> com tamanho máximo de <strong>15 MB por arquivo</strong>. É possível anexar múltiplos arquivos no mesmo caso clínico.</div>
  </div>

  <div class="faq-card">
    <div class="faq-q">❓ 6. Como funciona a Fila de Atendimento e o botão 'Puxar Atendimento' para especialistas?</div>
    <div class="faq-a">A Fila de Atendimento exibe casos novos das especialidades e municípios conveniados ao médico. Ao clicar em <strong>"Puxar Atendimento"</strong>, o sistema vincula o caso de forma atômica e exclusiva ao especialista, movendo-o imediatamente para <strong>"Meus Casos"</strong> com contagem de SLA ativa.</div>
  </div>

  <div class="faq-card">
    <div class="faq-q">❓ 7. O parecer emitido pelo especialista tem validade para ser anexado ao prontuário do SUS?</div>
    <div class="faq-a"><strong>Sim.</strong> O PDF oficial gerado pelo botão <em>"Baixar Parecer (PDF)"</em> possui folha A4 contínua timbrada, CRM/COREN e RQE dos envolvidos, histórico integral, orientações à APS e código hash de autenticação eletrônica válido para anexação ao e-SUS PEC ou prontuário físico.</div>
  </div>

  <div class="faq-card">
    <div class="faq-q">❓ 8. O Gestor Municipal consegue visualizar os relatórios e casos de outros municípios conveniados?</div>
    <div class="faq-a"><strong>Não.</strong> O perfil Gestor Municipal opera sob estrito isolamento de dados por cidade. Suas consultas, relatórios estatísticos e prontuários refletem única e exclusivamente os pacientes atendidos pela sua respectiva Secretaria de Saúde.</div>
  </div>

  <div class="box-destaque box-dica" style="margin-top: 12px;">
    <div class="box-title">📞 Suporte Técnico e Central de Relacionamento</div>
    Dúvidas adicionais ou suporte à infraestrutura da sua unidade podem ser encaminhados ao suporte interno via Assistente de IA ou diretamente à coordenação do projeto Doutortec do seu município.
  </div>

  <div class="page-footer">
    <span>Plataforma Doutortec | Manual e Guia Operacional do Usuário</span>
    <span>Página 12</span>
  </div>
</div>

</body>
</html>`;

const outputPathHtml = path.join(__dirname, 'manual_apostila.html');
fs.writeFileSync(outputPathHtml, htmlContent, 'utf-8');
console.log('Arquivo HTML gerado com sucesso em:', outputPathHtml);

// Caminho do PDF final em public/ e na raiz
const pdfOutputPath = path.join(__dirname, 'public', 'Manual_do_Usuario_Doutortec.pdf');
const pdfRootPath = path.join(__dirname, 'Manual_do_Usuario_Doutortec.pdf');

// Verifica executáveis de browser Chromium instalados
const possibleBrowsers = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
];

let selectedBrowser = possibleBrowsers.find(b => fs.existsSync(b));

if (!selectedBrowser) {
  console.error('Nenhum navegador Chromium encontrado para conversão.');
  process.exit(1);
}

console.log('Navegador encontrado para renderização do PDF:', selectedBrowser);

const cmdArgs = [
  '--headless',
  '--disable-gpu',
  '--no-pdf-header-footer',
  '--disable-software-rasterizer',
  '--disable-dev-shm-usage',
  '--run-all-compositor-stages-before-draw',
  `--print-to-pdf=${pdfOutputPath}`,
  outputPathHtml
];

console.log('Executando conversão para PDF...');
const result = spawnSync(selectedBrowser, cmdArgs, { stdio: 'inherit' });

if (fs.existsSync(pdfOutputPath)) {
  const stats = fs.statSync(pdfOutputPath);
  console.log(`Sucesso! PDF gerado em: ${pdfOutputPath} (${(stats.size / 1024).toFixed(1)} KB)`);
  
  // Copia também para a raiz para fácil localização
  fs.copyFileSync(pdfOutputPath, pdfRootPath);
  console.log(`Cópia criada na raiz em: ${pdfRootPath}`);
} else {
  console.error('Falha ao gerar o arquivo PDF.');
  process.exit(1);
}
