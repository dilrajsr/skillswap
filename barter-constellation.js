/**
 * SkillSwap - Kinetic Barter Constellation Engine
 * An interactive physics canvas representing peer-to-peer knowledge exchange.
 * Skills orbit, attract, and form bilateral flow threads in real time.
 */

class BarterConstellation {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    
    // Check reduced motion preference
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.nodes = [];
    this.particles = [];
    this.width = 0;
    this.height = 0;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    
    this.pointer = { x: -1000, y: -1000, active: false, radius: 140 };
    this.activeNode = null;
    this.animationFrameId = null;

    this.skillsCatalog = [
      { name: 'Python', category: 'give', color: '#e07a5f', icon: 'py' },
      { name: 'Classical Guitar', category: 'seek', color: '#38bdf8', icon: 'gt' },
      { name: 'React Architecture', category: 'give', color: '#e07a5f', icon: 're' },
      { name: 'Conversational Spanish', category: 'seek', color: '#38bdf8', icon: 'es' },
      { name: 'Figma UI Systems', category: 'seek', color: '#38bdf8', icon: 'fig' },
      { name: 'Database Optimization', category: 'give', color: '#e07a5f', icon: 'sql' },
      { name: 'Acoustic Fingerpicking', category: 'seek', color: '#38bdf8', icon: 'ac' },
      { name: 'Sound Design & Synthesis', category: 'give', color: '#e07a5f', icon: 'snd' },
      { name: 'Creative Non-Fiction', category: 'seek', color: '#38bdf8', icon: 'txt' },
      { name: 'Product Strategy', category: 'give', color: '#34d399', icon: 'pm' }
    ];

    this.init();
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());

    // Pointer events
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.pointer.x = e.clientX - rect.left;
      this.pointer.y = e.clientY - rect.top;
      this.pointer.active = true;
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.pointer.active = false;
      this.pointer.x = -1000;
      this.pointer.y = -1000;
    });

    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      
      const clicked = this.nodes.find(n => {
        const dx = n.x - clickX;
        const dy = n.y - clickY;
        return Math.sqrt(dx * dx + dy * dy) < n.radius + 10;
      });

      if (clicked) {
        this.activeNode = (this.activeNode === clicked) ? null : clicked;
        if (window.onConstellationNodeClick) {
          window.onConstellationNodeClick(clicked);
        }
      }
    });

    this.createNodes();
    this.loop();
  }

  resize() {
    const parent = this.canvas.parentElement;
    this.width = parent.clientWidth;
    this.height = parent.clientHeight || 500;

    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;

    this.ctx.scale(this.dpr, this.dpr);

    if (this.nodes.length > 0) {
      // Re-bound existing nodes within new dimensions
      this.nodes.forEach(n => {
        n.x = Math.max(30, Math.min(this.width - 30, n.x));
        n.y = Math.max(30, Math.min(this.height - 30, n.y));
      });
    }
  }

  createNodes() {
    this.nodes = [];
    const count = Math.min(this.skillsCatalog.length, Math.floor(this.width / 70) + 4);

    for (let i = 0; i < count; i++) {
      const skill = this.skillsCatalog[i % this.skillsCatalog.length];
      const radius = 24 + (i % 3) * 4;
      
      this.nodes.push({
        name: skill.name,
        category: skill.category,
        color: skill.color,
        radius: radius,
        x: Math.random() * (this.width - 100) + 50,
        y: Math.random() * (this.height - 100) + 50,
        vx: (Math.random() - 0.5) * (this.reducedMotion ? 0.2 : 0.6),
        vy: (Math.random() - 0.5) * (this.reducedMotion ? 0.2 : 0.6),
        pulse: Math.random() * Math.PI * 2,
        connections: []
      });
    }
  }

  update() {
    const maxSpeed = this.reducedMotion ? 0.4 : 1.1;

    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];

      // Natural floating velocity
      node.x += node.vx;
      node.y += node.vy;

      // Bounce smoothly off boundaries
      if (node.x - node.radius < 10) { node.x = 10 + node.radius; node.vx *= -1; }
      if (node.x + node.radius > this.width - 10) { node.x = this.width - 10 - node.radius; node.vx *= -1; }
      if (node.y - node.radius < 10) { node.y = 10 + node.radius; node.vy *= -1; }
      if (node.y + node.radius > this.height - 10) { node.y = this.height - 10 - node.radius; node.vy *= -1; }

      // Mouse interactivity (gentle gravitational pull or soft nudge)
      if (this.pointer.active) {
        const dx = this.pointer.x - node.x;
        const dy = this.pointer.y - node.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < this.pointer.radius && dist > 1) {
          const force = (this.pointer.radius - dist) / this.pointer.radius;
          node.vx += (dx / dist) * force * 0.15;
          node.vy += (dy / dist) * force * 0.15;
        }
      }

      // Clamp max velocity
      const speed = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
      if (speed > maxSpeed) {
        node.vx = (node.vx / speed) * maxSpeed;
        node.vy = (node.vy / speed) * maxSpeed;
      }

      node.pulse += 0.03;
    }
  }

  render() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    // 1. Draw Bilateral Interlocking Connection Threads
    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = i + 1; j < this.nodes.length; j++) {
        const a = this.nodes[i];
        const b = this.nodes[j];

        // Compatible pairs connect (Give + Seek)
        const isReciprocal = (a.category !== b.category);
        const maxDist = isReciprocal ? 210 : 130;

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < maxDist) {
          const alpha = (1 - dist / maxDist) * (isReciprocal ? 0.45 : 0.18);
          
          this.ctx.beginPath();
          this.ctx.moveTo(a.x, a.y);
          this.ctx.lineTo(b.x, b.y);
          
          if (isReciprocal) {
            // Bilateral flow gradient
            const grad = this.ctx.createLinearGradient(a.x, a.y, b.x, b.y);
            grad.addColorStop(0, a.color);
            grad.addColorStop(0.5, 'rgba(52, 211, 153, 0.7)');
            grad.addColorStop(1, b.color);
            this.ctx.strokeStyle = grad;
            this.ctx.lineWidth = 1.6;
          } else {
            this.ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
            this.ctx.lineWidth = 0.8;
          }

          this.ctx.globalAlpha = alpha;
          this.ctx.stroke();
          this.ctx.globalAlpha = 1;

          // Flowing particle along reciprocal connections
          if (isReciprocal && !this.reducedMotion) {
            const time = (Date.now() / 1400 + i * 0.4) % 1;
            const px = a.x + (b.x - a.x) * time;
            const py = a.y + (b.y - a.y) * time;
            
            this.ctx.beginPath();
            this.ctx.arc(px, py, 2.5, 0, Math.PI * 2);
            this.ctx.fillStyle = '#34d399';
            this.ctx.shadowColor = '#34d399';
            this.ctx.shadowBlur = 6;
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
          }
        }
      }
    }

    // 2. Draw Nodes
    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      const isSelected = (this.activeNode === node);
      const pulseSize = Math.sin(node.pulse) * 2;

      // Glow backdrop
      this.ctx.beginPath();
      this.ctx.arc(node.x, node.y, node.radius + 6 + pulseSize, 0, Math.PI * 2);
      this.ctx.fillStyle = node.category === 'give' ? 'rgba(224, 122, 95, 0.08)' : 'rgba(56, 189, 248, 0.08)';
      this.ctx.fill();

      // Node Body
      this.ctx.beginPath();
      this.ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = '#111622';
      this.ctx.fill();

      // Node Border
      this.ctx.lineWidth = isSelected ? 3 : 1.8;
      this.ctx.strokeStyle = isSelected ? '#34d399' : node.color;
      this.ctx.stroke();

      // Skill Label
      this.ctx.font = '600 11.5px "Plus Jakarta Sans", sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillStyle = '#f0f4fc';
      
      // Multi-word wrapping for clean labels
      const words = node.name.split(' ');
      if (words.length > 1 && node.radius >= 26) {
        this.ctx.fillText(words[0], node.x, node.y - 6);
        this.ctx.font = '500 10px "Plus Jakarta Sans", sans-serif';
        this.ctx.fillStyle = 'rgba(240, 244, 252, 0.75)';
        this.ctx.fillText(words.slice(1).join(' '), node.x, node.y + 7);
      } else {
        this.ctx.fillText(node.name, node.x, node.y);
      }
    }
  }

  loop() {
    this.update();
    this.render();
    this.animationFrameId = requestAnimationFrame(() => this.loop());
  }

  destroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}

// Global initialization helper
window.initBarterConstellation = function(canvasId = 'barterCanvas') {
  if (window.currentConstellation) {
    window.currentConstellation.destroy();
  }
  window.currentConstellation = new BarterConstellation(canvasId);
  return window.currentConstellation;
};
