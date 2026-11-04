import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { StudentTutorialSurface } from '../../components/student/StudentTutorial';
import { useStudentDemo } from '../../components/student/StudentDemoContext';
import { getStudentTutorialStep, getTutorialTargetTop, STUDENT_TUTORIAL_STEPS, studentTutorialUrl } from '../../utils/studentTutorial';
import { createStudentDemoExercises } from '../../utils/studentDemoFixtures';
import Dashboard from '../../pages/student/Dashboard';
import Selection from '../../pages/student/Selection';
import WorkoutExecution from '../../pages/student/WorkoutExecution';

vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'real-student' }, session: { user: { id: 'real-student' } }, role: 'student', preferences: { focusMode: false }, expiresAt: null }) }));

describe('tutorial demonstrativo seguro do aluno', () => {
    it('mantém feedback final visível abaixo do painel em celular sem deslocar o layout', () => {
        const panelHeight = 298.5;
        const targetHeight = 124;
        const targetTop = getTutorialTargetTop(6, panelHeight, 667, targetHeight);
        expect(targetTop).toBeGreaterThan(64 + panelHeight);
        expect(targetTop + targetHeight).toBeLessThan(667);
        expect(getTutorialTargetTop(5, panelHeight, 667, 60)).toBe(88);
    });
    it('percorre dashboard, seleção e treino com rotas determinísticas', () => {
        expect(studentTutorialUrl(0)).toBe('/student/dashboard?tutorial=0');
        expect(studentTutorialUrl(1)).toBe('/student/selection?tutorial=1');
        expect(studentTutorialUrl(6)).toBe('/student/workout/tutorial-demo?tutorial=6');
        expect(studentTutorialUrl(99)).toBe(studentTutorialUrl(6));
        STUDENT_TUTORIAL_STEPS.forEach((step, index) => expect(getStudentTutorialStep(step.path, `?tutorial=${index}`)).toBe(index));
        expect(getStudentTutorialStep('/student/dashboard', '')).toBeNull();
    });
    it('monta as mesmas telas reais com contexto demonstrativo em todos os passos', () => {
        function ActualScreen() { return <p>{useStudentDemo() ? 'screen-demo-context' : 'screen-live-context'}</p>; }
        STUDENT_TUTORIAL_STEPS.forEach((_, index) => {
            const html = renderToString(<MemoryRouter initialEntries={[studentTutorialUrl(index)]}><StudentTutorialSurface><ActualScreen /></StudentTutorialSurface></MemoryRouter>);
            expect(html).toContain('Tutorial · Demonstração');
            expect(html).toContain('Nada será salvo');
            expect(html).toContain('screen-demo-context');
        });
    });
    it('renderiza MainLayout, navegação e âncoras dentro do markup real das três telas', () => {
        for (const [index, Screen, expected] of [[0, Dashboard, 'Treino Atual'], [1, Selection, 'Seus Treinos'], [2, WorkoutExecution, 'Nota do Coach']] as const) {
            const html = renderToString(<MemoryRouter initialEntries={[studentTutorialUrl(index)]}><StudentTutorialSurface><Screen /></StudentTutorialSurface></MemoryRouter>);
            expect(html).toContain(expected);
            expect(html).toContain('Navegação Principal');
            expect(html).toContain(`data-tutorial-target="${index}"`);
            expect(html).not.toContain('tutorial-workout-card');
            if (index === 2) {
                for (const target of [3, 4, 5, 6]) expect(html).toContain(`data-tutorial-target="${target}"`);
                expect(html).toContain('feedback-tutorial-exercise');
                expect(html).toContain('Ant. / Alvo');
            }
        }
    });
    it('mantém modo real fora do tutorial e cria fixtures novas a cada sessão', () => {
        function ActualScreen() { return <p>{String(useStudentDemo())}</p>; }
        const html = renderToString(<MemoryRouter initialEntries={['/student/dashboard']}><StudentTutorialSurface><ActualScreen /></StudentTutorialSurface></MemoryRouter>);
        expect(html).toContain('false');
        expect(html).not.toContain('Nada será salvo');
        const first = createStudentDemoExercises();
        const firstDropSet = first[0].sets[2];
        if (!('drops' in firstDropSet)) throw new Error('Fixture dropset ausente');
        firstDropSet.drops[0].completed = true;
        first[0].feedback = 'rascunho demo';
        const second = createStudentDemoExercises();
        const secondDropSet = second[0].sets[2];
        if (!('drops' in secondDropSet)) throw new Error('Fixture dropset ausente');
        expect(secondDropSet.drops[0].completed).toBe(false);
        expect(second[0].feedback).toBe('');
    });
    it('query inválida permanece no contexto demonstrativo seguro', () => {
        expect(getStudentTutorialStep('/student/workout/real-id', '?tutorial=garbage')).toBe(2);
        expect(getStudentTutorialStep('/student/workout/real-id', '?tutorial=99')).toBe(2);
        expect(getStudentTutorialStep('/student/workout/tutorial-demo', '')).toBe(2);
    });
});
