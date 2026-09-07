-- 1. Permissão RLS para Specialists assumirem casos novos sem médico
DROP POLICY IF EXISTS "Permitir especialista assumir caso novo" ON public.casos;

CREATE POLICY "Permitir especialista assumir caso novo"
ON public.casos
FOR UPDATE
TO authenticated
USING (especialista_id IS NULL OR especialista_id = auth.uid())
WITH CHECK (especialista_id = auth.uid());

-- 2. Função RPC atômica com SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.puxar_caso_atendimento(p_caso_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id uuid;
    v_updated_row public.casos%ROWTYPE;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Usuário não autenticado.');
    END IF;

    -- Update atômico: garante que apenas um médico consiga atribuir o caso novo
    UPDATE public.casos
    SET 
        especialista_id = v_user_id,
        status = 'em_progresso',
        aceito_em = now(),
        updated_at = now()
    WHERE id = p_caso_id 
      AND (status = 'novo' OR status IS NULL)
      AND (especialista_id IS NULL OR especialista_id = v_user_id)
    RETURNING * INTO v_updated_row;

    IF v_updated_row.id IS NULL THEN
        RETURN json_build_object(
            'success', false, 
            'error', 'Este caso já foi assumido por outro especialista ou não está mais disponível na fila.'
        );
    END IF;

    RETURN json_build_object(
        'success', true,
        'caso', row_to_json(v_updated_row)
    );
END;
$$;

-- Permite execução para usuários autenticados
GRANT EXECUTE ON FUNCTION public.puxar_caso_atendimento(uuid) TO authenticated;
