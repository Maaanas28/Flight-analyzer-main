import React, { useState, useEffect, useRef, useCallback } from 'react';
import './BootScreen.css';

/**
 * Boot-status messages shown during the startup animation.
 * These are visual-only status messages — they do not represent
 * actual system initialisation calls.
 */
const BOOT_MESSAGES = [
  'Initializing Flight Command Center...',
  'Establishing aviation data connection',
  'Loading aircraft telemetry',
  'Initializing radar systems',
  'Connecting live flight feeds',
  'Initializing WebSocket streams',
  'Loading airport schedules',
  'Initializing flight conflict detection',
  'Loading global flight map',
];

/**
 * Total boot duration (ms). Must be ≥ sum of staggered delays so the last
 * message is always visible before the fade begins.
 *
 * Timeline:
 *   - Messages stagger every ~190 ms → last msg at ~1 700 ms
 *   - 400 ms pause after last msg before fade
 *   - 550 ms CSS fade-out
 *   Total visible: ~2 100 ms  |  Component unmounts: ~2 650 ms
 */
const MESSAGE_INTERVAL_MS = 60;
const READY_DELAY_MS = MESSAGE_INTERVAL_MS * BOOT_MESSAGES.length + 120;
const FADE_DELAY_MS = READY_DELAY_MS + 40;
const UNMOUNT_DELAY_MS = FADE_DELAY_MS + 350;

export default function BootScreen({ onComplete }) {
  const [visibleCount, setVisibleCount] = useState(0);
  const [progressPct, setProgressPct] = useState(0);
  const [showReady, setShowReady] = useState(false);
  const [fading, setFading] = useState(false);
  const [done, setDone] = useState(() => {
    try {
      return sessionStorage.getItem('flightTrackerBooted') === 'true';
    } catch {
      return false;
    }
  });

  const timersRef = useRef([]);

  const skipBoot = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    try { sessionStorage.setItem('flightTrackerBooted', 'true'); } catch {}
    setFading(true);
    setTimeout(() => {
      setDone(true);
      if (onComplete) onComplete();
    }, 150);
  }, [onComplete]);

  useEffect(() => {
    if (done) {
      if (onComplete) onComplete();
      return;
    }

    const schedule = (fn, delay) => {
      const id = setTimeout(fn, delay);
      timersRef.current.push(id);
      return id;
    };

    // Stagger boot messages swiftly
    BOOT_MESSAGES.forEach((_, idx) => {
      schedule(() => {
        setVisibleCount(idx + 1);
        setProgressPct(Math.round(((idx + 1) / BOOT_MESSAGES.length) * 100));
      }, (idx + 1) * MESSAGE_INTERVAL_MS);
    });

    schedule(() => setShowReady(true), READY_DELAY_MS);
    schedule(() => setFading(true), FADE_DELAY_MS);
    schedule(() => {
      try { sessionStorage.setItem('flightTrackerBooted', 'true'); } catch {}
      setDone(true);
      if (onComplete) onComplete();
    }, UNMOUNT_DELAY_MS);

    const handleKey = (e) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        skipBoot();
      }
    };
    window.addEventListener('keydown', handleKey);

    return () => {
      timersRef.current.forEach(clearTimeout);
      window.removeEventListener('keydown', handleKey);
    };
  }, [onComplete, done, skipBoot]);

  if (done) return null;

  return (
    <div className={`boot-overlay${fading ? ' fade-out' : ''}`} onClick={skipBoot} role="status" aria-label="System initializing">
      {/* Animated grid background */}
      <div className="boot-grid" />
      {/* Vignette overlay */}
      <div className="boot-vignette" />
      {/* Horizontal scan line */}
      <div className="boot-scanline" />

      <div className="boot-content">
        {/* ── Header ─────────────────────────────────────── */}
        <div className="boot-header">
          <span className="boot-logo-icon" aria-hidden="true">✈️</span>
          <div className="boot-title">Flight Command Center</div>
          <div className="boot-subtitle">Real-Time Aviation Monitoring System</div>
        </div>

        {/* ── Divider ─────────────────────────────────────── */}
        <div className="boot-divider" />

        {/* ── Terminal log ─────────────────────────────────── */}
        <div className="boot-terminal" aria-live="polite">
          <div className="boot-terminal-prompt">
            &gt; Initializing Flight Command Center...
            <span className={`boot-cursor${visibleCount > 0 ? ' active' : ''}`} />
          </div>

          {BOOT_MESSAGES.slice(1).map((msg, idx) => (
            <div
              key={idx}
              className={`boot-log-line${idx < visibleCount - 1 ? ' visible' : ''}`}
            >
              <span className="boot-check">✓</span>
              <span className="boot-log-text">{msg}</span>
            </div>
          ))}
        </div>

        {/* ── Status bar / progress ────────────────────────── */}
        <div className="boot-status-bar">
          <span>SYS</span>
          <div className="boot-progress-track">
            <div
              className="boot-progress-fill"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span>{progressPct}%</span>
        </div>

        {/* ── Ready message ────────────────────────────────── */}
        <div className={`boot-ready-msg${showReady ? ' visible' : ''}`} aria-live="polite">
          ✓ &nbsp; Command center ready
        </div>

        <div className="boot-skip-hint">Click anywhere or press Esc to skip</div>
      </div>
    </div>
  );
}
