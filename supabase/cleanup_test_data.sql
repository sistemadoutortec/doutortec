-- =====================================================================
-- DOUTORTEC - Limpeza de Dados de Teste
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
    SELECT array_agg(id) INTO v_paciente_ids
    FROM public.pacientes
    WHERE nome ILIKE '%José Maria%';

    -- 3. Identificar IDs dos casos de teste vinculados
    SELECT array_agg(id) INTO v_caso_ids
    FROM public.casos
    WHERE paciente_nome ILIKE '%José Maria%'
       OR (v_user_ids IS NOT NULL AND (solicitante_id = ANY(v_user_ids) OR especialista_id = ANY(v_user_ids)));

    -- A. Deletar mensagens dos chats dos casos de teste
    IF v_caso_ids IS NOT NULL THEN
        DELETE FROM public.casos_mensagens WHERE caso_id = ANY(v_caso_ids);
    END IF;
    IF v_user_ids IS NOT NULL THEN
        DELETE FROM public.casos_mensagens WHERE perfil_id = ANY(v_user_ids);
    END IF;

    -- B. Deletar avaliações registradas nos casos de teste
    IF v_caso_ids IS NOT NULL THEN
        DELETE FROM public.casos_avaliacoes WHERE caso_id = ANY(v_caso_ids);
    END IF;
    IF v_user_ids IS NOT NULL THEN
        DELETE FROM public.casos_avaliacoes WHERE solicitante_id = ANY(v_user_ids);
    END IF;

    -- C. Deletar os casos de teste
    IF v_caso_ids IS NOT NULL THEN
        DELETE FROM public.casos WHERE id = ANY(v_caso_ids);
    END IF;
    DELETE FROM public.casos WHERE paciente_nome ILIKE '%José Maria%';

    -- D. Deletar lançamentos de bônus do especialista de teste
    IF v_user_ids IS NOT NULL THEN
        DELETE FROM public.financeiro_bonus WHERE especialista_id = ANY(v_user_ids);
    END IF;

    -- E. Deletar notificações dos usuários de teste
    IF v_user_ids IS NOT NULL THEN
        DELETE FROM public.notificacoes WHERE perfil_id = ANY(v_user_ids);
    END IF;

    -- F. Deletar vínculos de fluxos de especialidades e municípios
    IF v_user_ids IS NOT NULL THEN
        DELETE FROM public.fluxos_especialidades_municipios
        WHERE fluxo_id IN (
            SELECT id FROM public.fluxos_especialidades WHERE especialista_id = ANY(v_user_ids)
        );

        DELETE FROM public.fluxos_especialidades WHERE especialista_id = ANY(v_user_ids);
    END IF;

    -- G. Deletar paciente de teste
    IF v_paciente_ids IS NOT NULL THEN
        DELETE FROM public.pacientes WHERE id = ANY(v_paciente_ids);
    END IF;
    DELETE FROM public.pacientes WHERE nome ILIKE '%José Maria%';

    -- H. Deletar perfis do sistema (public.perfis)
    IF v_user_ids IS NOT NULL THEN
        DELETE FROM public.perfis WHERE id = ANY(v_user_ids);
    END IF;
    DELETE FROM public.perfis WHERE email IN ('especialistateste22@gmail.com', 'solicitanteteste2@gmail.com');

    -- I. Deletar contas de autenticação do Supabase (auth.users)
    IF v_user_ids IS NOT NULL THEN
        DELETE FROM auth.users WHERE id = ANY(v_user_ids);
    END IF;
    DELETE FROM auth.users WHERE email IN ('especialistateste22@gmail.com', 'solicitanteteste2@gmail.com');

    RAISE NOTICE 'Todos os dados de teste foram removidos com sucesso!';
END;
;