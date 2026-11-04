import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getStudentTutorialStep, getTutorialTargetTop, STUDENT_TUTORIAL_STEPS, studentTutorialUrl } from '../../utils/studentTutorial';
import { StudentDemoContext } from './StudentDemoContext';
import './studentTutorial.css';

const Icon = ({ children }: { children: string }) => <span className="material-symbols-rounded" aria-hidden="true">{children}</span>;

/** Real screens and markup, with an explicit, isolated in-memory data source. */
export const StudentTutorialSurface = ({ children }: { children: React.ReactNode }) => {
    const location = useLocation();
    const step = getStudentTutorialStep(location.pathname, location.search);
    const isDemo = step !== null;
    return (
        <StudentDemoContext.Provider value={isDemo} key={isDemo ? 'demo' : 'live'}>
            {isDemo ? <StudentTutorial step={step}>{children}</StudentTutorial> : children}
        </StudentDemoContext.Provider>
    );
};

interface SpotlightRect { top: number; left: number; right: number; bottom: number; width: number; height: number }

function StudentTutorial({ step, children }: { step: number; children: React.ReactNode }) {
    const navigate = useNavigate();
    const rootRef = useRef<HTMLDivElement>(null);
    const screenRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLElement>(null);
    const targetRef = useRef<HTMLElement | null>(null);
    const modalRef = useRef<HTMLElement | null>(null);
    const [rect, setRect] = useState<SpotlightRect | null>(null);
    const [viewport, setViewport] = useState({ width: 0, height: 0 });
    const [panelAtTop, setPanelAtTop] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const current = STUDENT_TUTORIAL_STEPS[step];
    const exit = () => navigate('/student/profile', { replace: true, state: { tutorialReturn: true } });
    const advance = () => step === STUDENT_TUTORIAL_STEPS.length - 1 ? exit() : navigate(studentTutorialUrl(step + 1), { replace: true });

    useLayoutEffect(() => {
        const screen = screenRef.current;
        const panel = panelRef.current;
        if (!screen || !panel) return;
        let frame = 0;
        let disposed = false;
        const changedAttributes = new Map<HTMLElement, { inert: boolean; hidden: string | null }>();
        const restoreBranches = () => {
            changedAttributes.forEach((original, element) => {
                element.inert = original.inert;
                if (original.hidden === null) element.removeAttribute('aria-hidden');
                else element.setAttribute('aria-hidden', original.hidden);
            });
            changedAttributes.clear();
        };
        const isolateBranch = (element: HTMLElement) => {
            restoreBranches();
            let branch: HTMLElement | null = element;
            while (branch && branch !== screen) {
                const parent: HTMLElement | null = branch.parentElement;
                if (!parent) break;
                for (const sibling of Array.from(parent.children)) {
                    if (sibling !== branch && sibling instanceof HTMLElement) {
                        changedAttributes.set(sibling, { inert: sibling.inert, hidden: sibling.getAttribute('aria-hidden') });
                        sibling.inert = true;
                        sibling.setAttribute('aria-hidden', 'true');
                    }
                }
                branch = parent;
            }
        };
        const measure = () => {
            if (disposed) return;
            const target = screen.querySelector<HTMLElement>(`[data-tutorial-target="${step}"]`);
            targetRef.current = target;
            const modal = screen.querySelector<HTMLElement>('[role="dialog"]');
            const previousModal = modalRef.current;
            modalRef.current = modal;
            setModalOpen(!!modal);
            if (modal || target) isolateBranch(modal || target!);
            if (modal && modal !== previousModal) {
                modal.querySelector<HTMLElement>('button, input, textarea, [tabindex="0"]')?.focus({ preventScroll: true });
            } else if (!modal && previousModal) {
                target?.querySelector<HTMLElement>('button, input, textarea, a[href]')?.focus({ preventScroll: true });
            }
            if (!target) { setRect(null); return; }
            const box = target.getBoundingClientRect();
            setViewport({ width: window.innerWidth, height: window.innerHeight });
            setRect({ top: box.top, left: box.left, right: box.right, bottom: box.bottom, width: box.width, height: box.height });
            setPanelAtTop(step === 6 || box.top > window.innerHeight - panel.getBoundingClientRect().height - 36);
        };
        const schedule = () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(measure);
        };
        const target = screen.querySelector<HTMLElement>(`[data-tutorial-target="${step}"]`);
        if (target) {
            const box = target.getBoundingClientRect();
            // Scroll the unmodified page; no padding, cloning, scaling or displacement.
            // The final feedback is near the document end. Keep it below a top panel
            // rather than asking the browser to scroll beyond its natural limit.
            const desiredTop = getTutorialTargetTop(step, panel.getBoundingClientRect().height, window.innerHeight, box.height);
            window.scrollBy({ top: box.top - desiredTop, behavior: 'instant' });
        }
        panel.querySelector<HTMLButtonElement>('[data-tutorial-next]')?.focus({ preventScroll: true });
        measure();
        const resize = new ResizeObserver(schedule);
        resize.observe(screen);
        resize.observe(panel);
        if (target) resize.observe(target);
        const mutations = new MutationObserver(schedule);
        mutations.observe(screen, { childList: true, subtree: true });
        window.addEventListener('resize', schedule);
        window.addEventListener('scroll', schedule, true);
        return () => {
            disposed = true;
            cancelAnimationFrame(frame);
            resize.disconnect();
            mutations.disconnect();
            window.removeEventListener('resize', schedule);
            window.removeEventListener('scroll', schedule, true);
            restoreBranches();
        };
    }, [step]);

    useEffect(() => {
        const handleKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                // Exercise modals keep their existing Escape-to-close behavior.
                if (!modalRef.current) { event.preventDefault(); exit(); }
                return;
            }
            if (event.key !== 'Tab') return;
            const scope = modalRef.current || rootRef.current;
            const controls = Array.from(scope?.querySelectorAll<HTMLElement>('button, input, textarea, a[href], [tabindex="0"]') || [])
                .filter(element => !element.closest('[inert]') && element.getClientRects().length > 0 && !element.hasAttribute('disabled'));
            const first = controls[0];
            const last = controls[controls.length - 1];
            if (event.shiftKey && (document.activeElement === first || !scope?.contains(document.activeElement))) {
                event.preventDefault(); last?.focus();
            } else if (!event.shiftKey && (document.activeElement === last || !scope?.contains(document.activeElement))) {
                event.preventDefault(); first?.focus();
            }
        };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [step, navigate]);

    const captureClick = (event: React.MouseEvent) => {
        const element = event.target as HTMLElement;
        if (element.closest('[data-tutorial-controls]')) return;
        const modal = element.closest('[role="dialog"]');
        if (modal && modal !== rootRef.current) return;
        if (targetRef.current?.contains(element)) {
            if (element.closest('a[href]')) {
                event.preventDefault();
                event.stopPropagation();
                if (step <= 1) advance();
            }
            return;
        }
        event.preventDefault();
        event.stopPropagation();
    };

    const top = Math.max(0, Math.min(viewport.height, (rect?.top || 0) - 7));
    const bottom = Math.max(top, Math.min(viewport.height, (rect?.bottom || 0) + 7));
    const left = Math.max(0, (rect?.left || 0) - 7);
    const right = Math.min(viewport.width, (rect?.right || 0) + 7);

    return (
        <div ref={rootRef} role="dialog" aria-modal="true" aria-labelledby="student-tutorial-title" aria-describedby="student-tutorial-description" className="student-tutorial" onClickCapture={captureClick}>
            <div ref={screenRef} className="tutorial-real-screen">{children}</div>
            {!modalOpen && <>
                <div className="tutorial-mask" aria-hidden="true" style={{ top: 0, left: 0, right: 0, height: top }} />
                <div className="tutorial-mask" aria-hidden="true" style={{ top: bottom, left: 0, right: 0, bottom: 0 }} />
                <div className="tutorial-mask" aria-hidden="true" style={{ top, left: 0, width: left, height: bottom - top }} />
                <div className="tutorial-mask" aria-hidden="true" style={{ top, left: right, right: 0, height: bottom - top }} />
                {rect && <div data-tutorial-spotlight className="tutorial-spotlight" aria-hidden="true" style={{ top: rect.top - 5, left: rect.left - 5, width: rect.width + 10, height: rect.height + 10 }} />}
            </>}
            <header data-tutorial-controls className="tutorial-banner" hidden={modalOpen}>
                <span>Tutorial · Demonstração</span>
                <button type="button" onClick={exit} aria-label="Sair do tutorial"><Icon>close</Icon></button>
            </header>
            <section ref={panelRef} data-tutorial-controls data-placement={panelAtTop ? 'top' : 'bottom'} className="tutorial-panel" aria-live="polite" hidden={modalOpen}>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">Passo {step + 1} de {STUDENT_TUTORIAL_STEPS.length} · Nada será salvo</p>
                <h2 id="student-tutorial-title" className="font-display text-xl font-bold mb-2">{current.title}</h2>
                <p id="student-tutorial-description" className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">{current.text}</p>
                <div className="flex items-center justify-between gap-2 mt-4">
                    <button type="button" className="tutorial-text-button" onClick={exit}>Sair</button>
                    <div className="flex gap-2">
                        {step > 0 && <button type="button" className="tutorial-text-button" onClick={() => navigate(studentTutorialUrl(step - 1), { replace: true })}>Voltar</button>}
                        <button type="button" data-tutorial-next className="tutorial-next" onClick={advance}>{step === STUDENT_TUTORIAL_STEPS.length - 1 ? 'Concluir tutorial' : 'Próximo'}</button>
                    </div>
                </div>
            </section>
        </div>
    );
}

export default StudentTutorial;
