'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const POLL_MS = 20000;
const ORDERS_HREF = '/admin/pedidos-web?estado=pendiente';
const PROMPT_DISMISSED_KEY = 'alvian_notif_prompt_dismissed';

const soles = (value) => `S/ ${Number(value).toFixed(2)}`;

/** "Ding" corto con Web Audio (sin archivos). Si el navegador lo bloquea, no pasa nada. */
function playChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    [880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = ctx.currentTime + i * 0.18;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.4);
    });
    setTimeout(() => ctx.close(), 1000);
  } catch (error) {
    // Sin sonido: el aviso en pantalla igual aparece.
  }
}

/**
 * Avisa en el panel cuando entra un pedido web: aviso en pantalla, sonido,
 * contador en el título de la pestaña y notificación del navegador (si se
 * permitió). Funciona mientras el panel esté abierto en alguna pestaña.
 */
export default function OrderAlerts({ initialLatestId }) {
  const router = useRouter();
  const lastSeenRef = useRef(initialLatestId || 0);
  const baseTitleRef = useRef('');
  const [alert, setAlert] = useState(null);
  const [permission, setPermission] = useState('unsupported');
  const [promptDismissed, setPromptDismissed] = useState(true);

  useEffect(() => {
    baseTitleRef.current = document.title;
    if ('Notification' in window) setPermission(Notification.permission);
    try {
      setPromptDismissed(localStorage.getItem(PROMPT_DISMISSED_KEY) === '1');
    } catch (error) {
      setPromptDismissed(false);
    }
  }, []);

  const check = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/pedidos-nuevos?since=${lastSeenRef.current}`, { cache: 'no-store' });
      if (!response.ok) return;
      const { newCount, latest } = await response.json();
      if (!latest || newCount <= 0 || latest.id <= lastSeenRef.current) return;

      lastSeenRef.current = latest.id;
      setAlert((prev) => ({ latest, count: (prev?.count || 0) + newCount }));
      playChime();
      router.refresh();

      if ('Notification' in window && Notification.permission === 'granted') {
        const note = new Notification(`Nuevo pedido ${latest.code}`, {
          body: `${soles(latest.total)} · ${latest.customerName}`,
          icon: '/logo.jpg',
          tag: 'alvian-pedido',
        });
        note.onclick = () => {
          window.focus();
          window.location.href = ORDERS_HREF;
        };
      }
    } catch (error) {
      // Sin conexión o panel cerrado en el servidor: se reintenta en la próxima vuelta.
    }
  }, [router]);

  useEffect(() => {
    const timer = setInterval(check, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [check]);

  // Contador en el título de la pestaña mientras haya un aviso sin ver.
  useEffect(() => {
    if (!baseTitleRef.current) return;
    document.title = alert
      ? `(${alert.count}) Nuevo pedido · ${baseTitleRef.current}`
      : baseTitleRef.current;
  }, [alert]);

  async function enableNotifications() {
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
    } catch (error) {
      setPermission('denied');
    }
  }

  function dismissPrompt() {
    setPromptDismissed(true);
    try {
      localStorage.setItem(PROMPT_DISMISSED_KEY, '1');
    } catch (error) {
      // Solo se vuelve a mostrar en la próxima visita.
    }
  }

  const showPrompt = !alert && permission === 'default' && !promptDismissed;

  return (
    <div className="order-alerts" aria-live="polite">
      {alert ? (
        <div className="order-alert" role="status">
          <span className="order-alert-icon" aria-hidden="true">
            🛍️
          </span>
          <div className="order-alert-body">
            <strong>
              {alert.count > 1 ? `${alert.count} pedidos nuevos` : `Nuevo pedido ${alert.latest.code}`}
            </strong>
            <span>
              {alert.count > 1 ? `El último: ${alert.latest.code} · ` : ''}
              {soles(alert.latest.total)} · {alert.latest.customerName}
            </span>
          </div>
          <Link href={ORDERS_HREF} className="btn-primary order-alert-cta" onClick={() => setAlert(null)}>
            Ver
          </Link>
          <button type="button" className="order-alert-close" aria-label="Cerrar aviso" onClick={() => setAlert(null)}>
            ×
          </button>
        </div>
      ) : null}

      {showPrompt ? (
        <div className="order-alert order-alert-prompt">
          <span className="order-alert-icon" aria-hidden="true">
            🔔
          </span>
          <div className="order-alert-body">
            <strong>¿Avisarte de pedidos nuevos?</strong>
            <span>Te llega una notificación aunque estés en otra pestaña.</span>
          </div>
          <button type="button" className="btn-primary order-alert-cta" onClick={enableNotifications}>
            Activar
          </button>
          <button type="button" className="order-alert-close" aria-label="Ahora no" onClick={dismissPrompt}>
            ×
          </button>
        </div>
      ) : null}
    </div>
  );
}
