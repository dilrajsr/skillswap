/**
 * SkillSwap - Studio FX & Interactive Overlays Module
 * Provides:
 * 1. Radial pointer spotlight & dynamic depth tilt on interactive cards
 * 2. Seamless view transitions (anti-flash cinematic crossfade)
 * 3. Kinetic wave ripples on reciprocal exchange actions
 * 4. Smooth scroll count-up animations for platform metrics
 */

(function() {
  'use strict';

  // 1. Mouse-following Radial Spotlight Overlay
  function initSpotlightSurfaces() {
    const surfaces = document.querySelectorAll('.card, .barter-studio, .match-card, .interactive-surface');
    
    surfaces.forEach(surface => {
      surface.addEventListener('mousemove', (e) => {
        const rect = surface.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        surface.style.setProperty('--mouse-x', `${x}px`);
        surface.style.setProperty('--mouse-y', `${y}px`);
      });
    });
  }

  // 2. Cinematic Page Transition Overlay
  function initPageTransitions() {
    // Inject smooth transition curtain if not present
    if (!document.getElementById('studioTransitionCurtain')) {
      const curtain = document.createElement('div');
      curtain.id = 'studioTransitionCurtain';
      curtain.style.cssText = `
        position: fixed;
        inset: 0;
        background: #0a0d14;
        z-index: 99999;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.28s cubic-bezier(0.16, 1, 0.3, 1);
      `;
      document.body.appendChild(curtain);
    }

    const curtain = document.getElementById('studioTransitionCurtain');

    // Fade out curtain on load
    window.addEventListener('pageshow', () => {
      if (curtain) {
        curtain.style.opacity = '0';
      }
    });

    // Intercept internal relative links
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a');
      if (!link) return;

      const href = link.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('http') || link.target === '_blank') {
        return;
      }

      // Smooth transition before redirect
      e.preventDefault();
      if (curtain) {
        curtain.style.opacity = '1';
        setTimeout(() => {
          window.location.href = href;
        }, 220);
      } else {
        window.location.href = href;
      }
    });
  }

  // 3. Kinetic Ripple Pulse on Click
  function initRipplePulses() {
    document.addEventListener('click', (e) => {
      const target = e.target.closest('.btn, .interactive-chip, .barter-flow-knot, .badge');
      if (!target) return;

      const rect = target.getBoundingClientRect();
      const ripple = document.createElement('span');
      const size = Math.max(rect.width, rect.height) * 1.5;
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;

      ripple.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        left: ${x}px;
        top: ${y}px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(56, 189, 248, 0.35) 0%, transparent 70%);
        pointer-events: none;
        transform: scale(0);
        animation: studioRipple 0.5s ease-out forwards;
      `;

      target.style.position = target.style.position || 'relative';
      target.style.overflow = 'hidden';
      target.appendChild(ripple);

      setTimeout(() => ripple.remove(), 550);
    });
  }

  // 4. Viewport Observer for Metric Count-Ups
  function initMetricObservers() {
    const metrics = document.querySelectorAll('[data-countup]');
    if (!('IntersectionObserver' in window) || metrics.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const targetNum = parseFloat(el.getAttribute('data-countup'));
          const suffix = el.getAttribute('data-suffix') || '';
          const prefix = el.getAttribute('data-prefix') || '';
          const duration = 1200;
          const start = performance.now();

          function step(now) {
            const progress = Math.min((now - start) / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 3); // ease-out cubic
            const current = (ease * targetNum).toFixed(targetNum % 1 === 0 ? 0 : 1);
            el.textContent = `${prefix}${current}${suffix}`;
            if (progress < 1) {
              requestAnimationFrame(step);
            }
          }
          requestAnimationFrame(step);
          observer.unobserve(el);
        }
      });
    }, { threshold: 0.2 });

    metrics.forEach(m => observer.observe(m));
  }

  // Add styles for ripples and spotlight
  const style = document.createElement('style');
  style.textContent = `
    @keyframes studioRipple {
      to {
        transform: scale(2);
        opacity: 0;
      }
    }

    .interactive-surface,
    .card,
    .barter-studio,
    .match-card {
      position: relative;
    }

    .interactive-surface::after,
    .card::after,
    .barter-studio::after,
    .match-card::after {
      content: "";
      position: absolute;
      inset: 0;
      border-radius: inherit;
      background: radial-gradient(
        450px circle at var(--mouse-x, -500px) var(--mouse-y, -500px),
        rgba(56, 189, 248, 0.05),
        transparent 60%
      );
      pointer-events: none;
      z-index: 2;
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .interactive-surface:hover::after,
    .card:hover::after,
    .barter-studio:hover::after,
    .match-card:hover::after {
      opacity: 1;
    }
  `;
  document.head.appendChild(style);

  // Auto initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initSpotlightSurfaces();
      initPageTransitions();
      initRipplePulses();
      initMetricObservers();
    });
  } else {
    initSpotlightSurfaces();
    initPageTransitions();
    initRipplePulses();
    initMetricObservers();
  }

  window.StudioFX = {
    initSpotlightSurfaces,
    initMetricObservers
  };
})();
