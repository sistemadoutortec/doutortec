-- =====================================================================
-- DOUTORTEC - Limpeza de Dados de Teste (Com Validação de Tabelas)
-- =====================================================================
-- Remove os dados de teste:
-- 1. Paciente: 'José Maria Paciente Teste'
-- 2. Solicitante: 'solicitanteteste2@gmail.com'
-- 3. Especialista: 'especialistateste22@gmail.com'
-- =====================================================================

DO 
DECLARE
    v_user_ids uuid[];
    v_caso_ids uuid[];
    v_paciente_ids uuid[];
BEGIN
    -- 1. Identificar IDs dos usuários de teste pelos e-mails
    SELECT array_agg(id) INTO v_user_ids
    FROM auth.users
    WHERE email IN ('especialistateste22@gmail.com', 'solicitanteteste2@gmail.com');

    -- 2. Identificar IDs dos pacientes de teste pelo nome
    IF to_regclass('public.pacientes') IS NOT NULL THEN
        EXECUTE 'SELECT array_agg(id) FROM public.pacientes WHERE nome ILIKE '
        INTO v_paciente_ids USING '%José Maria%';
    END IF;

    -- 3. Identificar IDs dos casos de teste vinculados
    IF to_regclass('public.casos') IS NOT NULL THEN
        EXECUTE 'SELECT array_agg(id) FROM public.casos WHERE paciente_nome ILIKE  OR (solicitante_id = ANY() OR especialista_id = ANY())'
        INTO v_caso_ids USING '%José Maria%', v_user_ids;
    END IF;

    -- A. Deletar mensagens do chat (mensagens_chat)
    IF to_regclass('public.mensagens_chat') IS NOT NULL THEN
        IF v_caso_ids IS NOT NULL THEN
            EXECUTE 'DELETE FROM public.mensagens_chat WHERE caso_id = ANY()' USING v_caso_ids;
        END IF;
        IF v_user_ids IS NOT NULL THEN
            EXECUTE 'DELETE FROM public.mensagens_chat WHERE perfil_id = ANY()' USING v_user_ids;
        END IF;
    END IF;

    -- B. Deletar avaliações (casos_avaliacoes)
    IF to_regclass('public.casos_avaliacoes') IS NOT NULL THEN
        IF v_caso_ids IS NOT NULL THEN
            EXECUTE 'DELETE FROM public.casos_avaliacoes WHERE caso_id = ANY()' USING v_caso_ids;
        END IF;
        IF v_user_ids IS NOT NULL THEN
            EXECUTE 'DELETE FROM public.casos_avaliacoes WHERE solicitante_id = ANY()' USING v_user_ids;
        END IF;
    END IF;

    -- C. Deletar casos de teste (casos)
    IF to_regclass('public.casos') IS NOT NULL THEN
        IF v_caso_ids IS NOT NULL THEN
            EXECUTE 'DELETE FROM public.casos WHERE id = ANY()' USING v_caso_ids;
        END IF;
        EXECUTE 'DELETE FROM public.casos WHERE paciente_nome ILIKE ' USING '%José Maria%';
    END IF;

    -- D. Deletar lançamentos de bônus (financeiro_bonus)
    IF to_regclass('public.financeiro_bonus') IS NOT NULL THEN
        IF v_user_ids IS NOT NULL THEN
            EXECUTE 'DELETE FROM public.financeiro_bonus WHERE especialista_id = ANY()' USING v_user_ids;
        END IF;
    END IF;

    -- E. Deletar notificações (notificacoes)
    IF to_regclass('public.notificacoes') IS NOT NULL THEN
        IF v_user_ids IS NOT NULL THEN
            EXECUTE 'DELETE FROM public.notificacoes WHERE perfil_id = ANY()' USING v_user_ids;
        END IF;
    END IF;

    -- F. Deletar vínculos de fluxos de especialidades e municípios
    IF to_regclass('public.fluxos_especialidades_municipios') IS NOT NULL AND to_regclass('public.fluxos_especialidades') IS NOT NULL THEN
        IF v_user_ids IS NOT NULL THEN
            EXECUTE 'DELETE FROM public.fluxos_especialidades_municipios WHERE fluxo_id IN (SELECT id FROM public.fluxos_especialidades WHERE especialista_id = ANY())' USING v_user_ids;
        END IF;
    END IF;

    -- G. Deletar fluxos de especialidades
    IF to_regclass('public.fluxos_especialidades') IS NOT NULL THEN
        IF v_user_ids IS NOT NULL THEN
            EXECUTE 'DELETE FROM public.fluxos_especialidades WHERE especialista_id = ANY()' USING v_user_ids;
        END IF;
    END IF;

    -- H. Deletar paciente de teste (pacientes)
    IF to_regclass('public.pacientes') IS NOT NULL THEN
        IF v_paciente_ids IS NOT NULL THEN
            EXECUTE 'DELETE FROM public.pacientes WHERE id = ANY()' USING v_paciente_ids;
        END IF;
        EXECUTE 'DELETE FROM public.pacientes WHERE nome ILIKE ' USING '%José Maria%';
    END IF;

    -- I. Deletar perfis (perfis)
    IF to_regclass('public.perfis') IS NOT NULL THEN
        IF v_user_ids IS NOT NULL THEN
            EXECUTE 'DELETE FROM public.perfis WHERE id = ANY()' USING v_user_ids;
        END IF;
        EXECUTE 'DELETE FROM public.perfis WHERE email IN (''especialistateste22@gmail.com'', ''solicitanteteste2@gmail.com'')';
    END IF;

    -- J. Deletar usuários de autenticação (auth.users)
    IF v_user_ids IS NOT NULL THEN
        DELETE FROM auth.users WHERE id = ANY(v_user_ids);
    END IF;
    DELETE FROM auth.users WHERE email IN ('especialistateste22@gmail.com', 'solicitanteteste2@gmail.com');

    RAISE NOTICE 'Todos os dados de teste foram removidos com sucesso!';
END;
;