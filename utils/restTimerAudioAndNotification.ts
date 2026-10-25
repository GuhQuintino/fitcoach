// utils/restTimerAudioAndNotification.ts

let sharedAudioCtx: AudioContext | null = null;
let keepAliveAudio: HTMLAudioElement | null = null;
let beepAudioElement: HTMLAudioElement | null = null;
let wakeLockSentinel: any = null;

/**
 * Gera um Data URI WAV PCM 16-bit mono em memória.
 * Permite tocar áudio via <audio> nativo mesmo com tela bloqueada no celular.
 */
function createToneWavDataUri(
    frequencies: { freq: number; durationMs: number; delayMs: number; volume?: number }[],
    totalDurationMs: number
): string {
    const sampleRate = 22050;
    const numSamples = Math.max(1, Math.floor((sampleRate * totalDurationMs) / 1000));
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);

    const writeString = (offset: number, str: string) => {
        for (let i = 0; i < str.length; i++) {
            view.setUint8(offset + i, str.charCodeAt(i));
        }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // PCM
    view.setUint16(20, 1, true);  // Linear quantization
    view.setUint16(22, 1, true);  // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, numSamples * 2, true);

    const samples = new Float32Array(numSamples);

    for (const tone of frequencies) {
        const startSample = Math.floor((tone.delayMs / 1000) * sampleRate);
        const toneSamples = Math.floor((tone.durationMs / 1000) * sampleRate);
        const vol = tone.volume ?? 0.85;

        for (let i = 0; i < toneSamples && startSample + i < numSamples; i++) {
            const t = i / sampleRate;
            const progress = i / toneSamples;
            // Envelope suave para evitar cliques
            const envelope = progress < 0.08 ? progress / 0.08 : Math.exp(-3.5 * progress);
            samples[startSample + i] += Math.sin(2 * Math.PI * tone.freq * t) * vol * envelope;
        }
    }

    for (let i = 0; i < numSamples; i++) {
        const clamped = Math.max(-1, Math.min(1, samples[i]));
        view.setInt16(44 + i * 2, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
    }

    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return `data:audio/wav;base64,${btoa(binary)}`;
}

function getSharedAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!sharedAudioCtx) {
        sharedAudioCtx = new AudioCtx();
    }
    return sharedAudioCtx;
}

/**
 * DEVE ser chamado sincronamente dentro do evento de clique do aluno
 * (ex: ao concluir série ou iniciar cronômetro) para desbloquear o áudio no iOS/Android
 * e iniciar o canal keep-alive silencioso que impede o congelamento do timer com tela bloqueada.
 */
export function unlockAndStartBackgroundTimerAudio(): void {
    try {
        const ctx = getSharedAudioContext();
        if (ctx && ctx.state === 'suspended') {
            ctx.resume().catch(() => {});
        }

        if (typeof window !== 'undefined' && typeof Audio !== 'undefined') {
            if (!beepAudioElement) {
                const beepUri = createToneWavDataUri(
                    [
                        { freq: 880, durationMs: 140, delayMs: 0, volume: 0.95 },
                        { freq: 880, durationMs: 140, delayMs: 170, volume: 0.95 },
                        { freq: 1046.5, durationMs: 220, delayMs: 340, volume: 1.0 }
                    ],
                    650
                );
                beepAudioElement = new Audio(beepUri);
                beepAudioElement.preload = 'auto';
            }

            if (!keepAliveAudio) {
                // Áudio quase inaudível de 1s em loop para segurar a thread JS viva com a tela bloqueada
                const silentUri = createToneWavDataUri(
                    [{ freq: 40, durationMs: 100, delayMs: 0, volume: 0.0002 }],
                    1000
                );
                keepAliveAudio = new Audio(silentUri);
                keepAliveAudio.loop = true;
                keepAliveAudio.volume = 0.01;
            }

            keepAliveAudio.play().catch(() => {});
        }
    } catch {
        // Ignora falhas em ambientes sem áudio (SSR/testes)
    }
}

export function stopBackgroundTimerAudio(): void {
    try {
        if (keepAliveAudio) {
            keepAliveAudio.pause();
            keepAliveAudio.currentTime = 0;
        }
    } catch {}
}

/**
 * Toca o sinal sonoro de fim de descanso (combinando HTML5 Audio + WebAudio + Vibração).
 */
export async function playRestFinishedAlert(): Promise<void> {
    stopBackgroundTimerAudio();

    // 1. Vibração física no celular (Android)
    try {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            navigator.vibrate([300, 120, 300, 120, 450]);
        }
    } catch {}

    // 2. HTML5 Audio (toca mesmo se o WebAudio estiver bloqueado em background)
    let htmlAudioPlayed = false;
    try {
        if (beepAudioElement) {
            beepAudioElement.currentTime = 0;
            beepAudioElement.volume = 1.0;
            await beepAudioElement.play();
            htmlAudioPlayed = true;
        }
    } catch {}

    // 3. Web Audio API (reforço de volume e fallback)
    try {
        const ctx = getSharedAudioContext();
        if (ctx) {
            if (ctx.state === 'suspended') {
                await ctx.resume();
            }
            if (!htmlAudioPlayed || ctx.state === 'running') {
                const now = ctx.currentTime;
                [0, 0.17, 0.34].forEach((delay, idx) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.frequency.value = idx === 2 ? 1046.5 : 880;
                    osc.type = 'sine';
                    gain.gain.setValueAtTime(0.9, now + delay);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.15);
                    osc.start(now + delay);
                    osc.stop(now + delay + 0.15);
                });
            }
        }
    } catch {}
}

/**
 * Solicita permissão de notificação e agenda a notificação no Service Worker
 * para que ela dispare na barra superior do Android mesmo com a tela bloqueada.
 */
export async function scheduleServiceWorkerRestNotification(
    endTimeMs: number,
    label: string = 'Descanso'
): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
        const notifApi = typeof Notification !== 'undefined' ? Notification : (typeof window !== 'undefined' ? (window as any).Notification : null);
        if (notifApi && notifApi.permission === 'default') {
            await notifApi.requestPermission().catch(() => {});
        }

        if ('serviceWorker' in navigator) {
            const reg = await navigator.serviceWorker.ready;
            reg.active?.postMessage({
                type: 'SCHEDULE_REST_TIMER',
                endTime: endTimeMs,
                title: 'FitCoach Pro — Descanso Finalizado! 💪',
                body: `${label} concluído! Hora de iniciar a próxima série.`,
                url: window.location.pathname
            });
        }
    } catch {}
}

export async function cancelServiceWorkerRestNotification(): Promise<void> {
    stopBackgroundTimerAudio();
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    try {
        const reg = await navigator.serviceWorker.ready;
        reg.active?.postMessage({ type: 'CANCEL_REST_TIMER' });
        const notifications = await reg.getNotifications({ tag: 'fitcoach-rest-timer' });
        notifications.forEach(n => n.close());
    } catch {}
}

/**
 * Dispara a notificação imediatamente na barra superior do celular via Service Worker
 * (compatível com 100% dos celulares Android, ao contrário de `new Notification()`).
 */
export async function triggerImmediateRestNotification(label: string = 'Descanso'): Promise<void> {
    const notifApi = typeof Notification !== 'undefined' ? Notification : (typeof window !== 'undefined' ? (window as any).Notification : null);
    if (!notifApi || notifApi.permission !== 'granted') return;

    const title = 'FitCoach Pro — Descanso Finalizado! 💪';
    const options: any = {
        body: `${label} concluído! Hora da próxima série.`,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'fitcoach-rest-timer',
        renotify: true,
        requireInteraction: false,
        vibrate: [300, 120, 300, 120, 450],
        data: { url: window.location.pathname }
    };

    try {
        if ('serviceWorker' in navigator) {
            const reg = await navigator.serviceWorker.ready;
            await reg.showNotification(title, options);
            return;
        }
    } catch {}

    // Fallback apenas para navegadores desktop sem SW ativo
    try {
        new Notification(title, options);
    } catch {}
}

/**
 * Mantém a tela acesa durante o treino (Screen Wake Lock API),
 * mas respeita se o aluno apertar o botão físico de bloquear a tela
 * e reativa automaticamente quando ele desbloquear e voltar ao app.
 */
export async function acquireWorkoutWakeLock(): Promise<void> {
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;
    if (document.visibilityState !== 'visible') return;

    try {
        if (!wakeLockSentinel || wakeLockSentinel.released) {
            wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
        }
    } catch {}
}

export async function releaseWorkoutWakeLock(): Promise<void> {
    try {
        if (wakeLockSentinel) {
            await wakeLockSentinel.release();
            wakeLockSentinel = null;
        }
    } catch {}
}
