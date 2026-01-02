-- ============================================================================
-- FIX: Permitir que alunos visualizem dados básicos (telefone, nome) de seus coaches
-- ============================================================================

-- 1. Remover policy antiga se existir (para evitar duplicação/conflito)
DROP POLICY IF EXISTS "Alunos podem ver perfil de seus coaches" ON profiles;

-- 2. Criar nova política
-- Permite SELECT na tabela 'profiles' SE o ID do perfil alvo estiver na lista de 'coach_id' do aluno logado
CREATE POLICY "Alunos podem ver perfil de seus coaches"
ON profiles
FOR SELECT
USING (
  -- O ID do perfil que está sendo acessado DEVE SER igual ao coach_id...
  id IN (
    -- ...registrado na tabela students_data para o usuário atual (auth.uid())
    SELECT coach_id 
    FROM students_data 
    WHERE students_data.id = auth.uid()
  )
);

-- NOTA: O frontend deve solicitar apenas campos específicos, ex: .select('full_name, phone')
-- Esta política libera a leitura da linha inteira do coach, o que é necessário para o funcionamento do app.
-- Dados sensíveis devem ser protegidos por não estarem nesta tabela ou por views específicas se necessário futuramente.
