export const STUDENT_TUTORIAL_STEPS = [
    { path: '/student/dashboard', title: 'Seu treino começa aqui', text: 'O card Treino atual reúne a rotina que seu coach preparou. Toque em “Toque para ver seus treinos” para escolher o treino do dia.' },
    { path: '/student/selection', title: 'Escolha o treino do dia', text: 'Cada card abre um treino da sua rotina. Neste exemplo, toque em Treino A para ver os exercícios, as séries e as orientações.' },
    { path: '/student/workout/tutorial-demo', title: 'Conheça o exercício', text: 'Toque no nome ou em “Toque para ver detalhes” para ler as instruções. Toque na imagem para abrir a demonstração do movimento.' },
    { path: '/student/workout/tutorial-demo', title: 'Leia as notas do coach', text: 'As notas trazem orientações específicas para você. Leia antes de começar: elas podem explicar ajustes, ritmo ou cuidados na execução.' },
    { path: '/student/workout/tutorial-demo', title: 'Entenda o tipo de série', text: 'Toque no ícone ou número da série para saber o que ela significa. Aquecimento, série principal e intensificações têm instruções próprias.' },
    { path: '/student/workout/tutorial-demo', title: 'Registre o que você fez', text: 'Azul indica carga sugerida, verde indica repetições e roxo indica esforço (PSE). São metas do coach. Preencha o que realizou e marque o check só depois de executar. Complete também cada drop ou sub-série de intensificação.' },
    { path: '/student/workout/tutorial-demo', title: 'Conte como foi o exercício', text: 'Escreva de vez em quando: como foi a execução, se a carga ficou fácil ou difícil, ou se sentiu desconforto. Esse feedback ajuda o coach a ajustar seu treino. Ao marcar todas as séries e intensificações, a avaliação final abre automaticamente; confirme para salvar.' },
] as const;

export function studentTutorialUrl(step: number): string {
    const index = Math.max(0, Math.min(STUDENT_TUTORIAL_STEPS.length - 1, Math.trunc(step) || 0));
    return `${STUDENT_TUTORIAL_STEPS[index].path}?tutorial=${index}`;
}

/** Scroll-only placement: the last target must fit below the explanation at document end. */
export function getTutorialTargetTop(step: number, panelHeight: number, viewportHeight: number, targetHeight: number): number {
    return step === 6 ? Math.min(panelHeight + 80, viewportHeight - targetHeight - 16) : 88;
}

export function getStudentTutorialStep(pathname: string, search: string): number | null {
    const params = new URLSearchParams(search);
    const demoWorkout = pathname === '/student/workout/tutorial-demo';
    if (!params.has('tutorial') && !demoWorkout) return null;
    const fallback = pathname === '/student/selection' ? 1 : pathname.startsWith('/student/workout/') ? 2 : 0;
    const raw = params.get('tutorial');
    const step = Number(raw);
    if (!raw || !Number.isInteger(step) || step < 0 || step >= STUDENT_TUTORIAL_STEPS.length) return fallback;
    return STUDENT_TUTORIAL_STEPS[step].path === pathname ? step : fallback;
}
