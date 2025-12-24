
INSERT INTO exercises (name, video_url, description, is_public, muscle_group) VALUES
('Supino Fechado com Barra', '/exercises/hevy/close_grip_barbell_bench_press.mp4', '## Execução\n1. Ajuste a barra numa altura acessível deitado, sem esticar totalmente os cotovelos.\n2. Deite-se com a cabeça sob a barra.\n3. Pegada fechada (largura dos ombros), polegares envolvendo a barra.\n4. Retraia as escápulas e firme os pés no chão.\n5. Tire a barra estendendo os cotovelos.\n6. Desça a barra controladamente até o estômago superior/peito.\n7. Empurre de volta focando no tríceps.', true, 'arms'),

('Desenvolvimento Arnold', '/exercises/hevy/dumbbell_arnold_press.mp4', '## Execução\n1. Sente-se num banco com encosto vertical, segurando halteres leves.\n2. Apoie os halteres nas coxas.\n3. Erga os halteres à altura dos ombros, palmas viradas para você.\n4. Ao subir, gire os punhos para fora.\n5. Termine com as palmas para frente no topo.\n6. Desça girando os punhos de volta para a posição inicial.', true, 'shoulders'),

('Levantamento Terra Sumô', '/exercises/hevy/sumo_deadlift.mp4', '## Execução\n1. Pés bem afastados, pontas para fora.\n2. Incline-se e segure a barra com pegada mista ou pronada, braços por dentro dos joelhos.\n3. Estufe o peito, alinhe a coluna e encaixe o quadril.\n4. Puxe a barra estendendo joelhos e quadril simultaneamente.\n5. Contraia os glúteos no topo sem hiperextender as costas.\n6. Desça controladamente mantendo a barra perto do corpo.', true, 'legs'),

('Encolhimento com Barra', '/exercises/hevy/barbell_shrug.mp4', '## Execução\n1. Barra na altura do quadril no suporte.\n2. Pegada pronada, largura dos ombros.\n3. Retire a barra e dê um passo atrás.\n4. Eleve os ombros em direção às orelhas (encolha) mantenho braços esticados.\n5. Segure no topo e desça controladamente.', true, 'back'),

('Arremesso (Clean and Jerk)', '/exercises/hevy/clean_and_jerk.mp4', '## Execução\n1. Pés largura do quadril, canelas próximas à barra.\n2. Pegada pronada larga.\n3. (Clean) Puxe a barra do chão, acelerando após os joelhos e recebendo-a nos ombros (agachamento frontal).\n4. Suba do agachamento.\n5. (Jerk) Flexione levemente os joelhos e empurre a barra acima da cabeça, fazendo uma tesoura com as pernas.\n6. Junte os pés e estabilize.', true, 'full_body'),

('Flexão de Braço Unilateral', '/exercises/hevy/one_arm_push_up.mp4', '## Execução\n1. Posição de prancha, pés mais afastados que o quadril para equilíbrio.\n2. Coloque uma mão nas costas.\n3. Mantenha o corpo rígido e alinhado.\n4. Desça flexionando o braço de apoio até o peito quase tocar o chão.\n5. Empurre de volta à posição inicial.', true, 'chest')
ON CONFLICT (name) DO UPDATE SET video_url = EXCLUDED.video_url, description = EXCLUDED.description;
