// @ts-nocheck
/**
 * claudio-ripple.js
 * Water ripple effect for the hero jumbo text logo.
 * Works by drawing the text onto a canvas and simulating
 * water physics that distort the pixels on mouse hover.
 */

class WaterRipple {
  constructor(el) {
    this.el = el;
    this.w = 0;
    this.h = 0;
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    this.buf = [null, null]; // double buffer for wave simulation
    this.cur = 0;
    this.src = null;  // source image data (the text)
    this.out = null;  // output image data (distorted)
    this.active = false;

    this._waitForReady();
  }

  // jumbo-text adds .ready when it's fully sized — wait for that
  _waitForReady() {
    const check = () => {
      if (this.el.classList.contains('ready')) {
        this._init();
      } else {
        requestAnimationFrame(check);
      }
    };
    check();
  }

  _init() {
    const rect = this.el.getBoundingClientRect();
    this.w = Math.floor(rect.width);
    this.h = Math.floor(rect.height);
    if (!this.w || !this.h) return;

    this.canvas.width = this.w;
    this.canvas.height = this.h;
    this.canvas.style.cssText = [
      'position:absolute',
      'top:0',
      'left:0',
      'width:100%',
      'height:100%',
      'pointer-events:none',
      'opacity:0',
      'transition:opacity 0.2s',
    ].join(';');

    // Canvas needs a positioned parent to overlay correctly
    const parent = this.el.parentElement;
    if (getComputedStyle(parent).position === 'static') {
      parent.style.position = 'relative';
    }
    parent.appendChild(this.canvas);

    // Two float buffers — current and previous wave heights
    const size = this.w * this.h;
    this.buf[0] = new Float32Array(size);
    this.buf[1] = new Float32Array(size);

    this._drawSource();

    // Smooth transition between canvas and original text
    this.el.style.transition = 'opacity 0.2s';

    this.el.addEventListener('mousemove', this._onMove.bind(this));
    this.el.addEventListener('mouseenter', () => { this.active = true; });
    this.el.addEventListener('mouseleave', () => { this.active = false; });

    this._tick();
  }

  // Draw the text onto the canvas matching the element's computed styles.
  _drawSource() {
    const { w, h } = this;
    const span = this.el.querySelector('.jumbo-text-line');
    const text = (span || this.el).textContent.trim();
    const cs = getComputedStyle(this.el);

    let displayText = text;
    const transform = cs.textTransform;
    if (transform === 'uppercase') displayText = text.toUpperCase();
    else if (transform === 'lowercase') displayText = text.toLowerCase();

    this.ctx.clearRect(0, 0, w, h);
    this.ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    this.ctx.fillStyle = cs.color;
    this.ctx.textBaseline = 'middle';
    this.ctx.textAlign = cs.textAlign || 'left';

    if ('letterSpacing' in this.ctx) {
      this.ctx.letterSpacing = cs.letterSpacing;
    }

    const align = this.ctx.textAlign;
    let x = 0;
    if (align === 'center') x = w / 2;
    else if (align === 'right') x = w;

    this.ctx.fillText(displayText, x, h / 2);

    this.src = this.ctx.getImageData(0, 0, w, h);
    this.out = this.ctx.createImageData(w, h);
  }

  // Create a circular disturbance at (x, y)
  _disturb(x, y) {
    const { w, h, buf, cur } = this;
    const radius = 20;
    const strength = 280;
    const r2 = radius * radius;
    const xi = Math.floor(x);
    const yi = Math.floor(y);

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy > r2) continue;
        const nx = xi + dx;
        const ny = yi + dy;
        if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
        buf[cur][ny * w + nx] += strength;
      }
    }
  }

  // Advance the wave simulation one step
  _step() {
    const { w, h, buf, cur } = this;
    const next = cur ^ 1;
    const b = buf[cur];
    const bn = buf[next];
    const damping = 0.986;

    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        bn[i] = (b[i - 1] + b[i + 1] + b[i - w] + b[i + w]) / 2 - bn[i];
        bn[i] *= damping;
        if (bn[i] > 5000) bn[i] = 5000;
        if (bn[i] < -5000) bn[i] = -5000;
      }
    }

    this.cur ^= 1;
  }

  // Render distorted pixels to output canvas
  _render() {
    const { w, h, buf, cur, src, out } = this;
    const b = buf[cur];
    const sd = src.data;
    const od = out.data;
    const scale = 0.12;

    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;

        const dx = Math.round((b[i + 1] - b[i - 1]) * scale);
        const dy = Math.round((b[i + w] - b[i - w]) * scale);

        const nx = Math.max(0, Math.min(w - 1, x + dx));
        const ny = Math.max(0, Math.min(h - 1, y + dy));

        const si = (ny * w + nx) * 4;
        const oi = i * 4;
        od[oi]     = sd[si];
        od[oi + 1] = sd[si + 1];
        od[oi + 2] = sd[si + 2];
        od[oi + 3] = sd[si + 3];
      }
    }

    this.ctx.putImageData(this.out, 0, 0);
  }

  // Check if the wave has enough energy to bother rendering
  _hasActivity() {
    const b = this.buf[this.cur];
    for (let i = 0; i < b.length; i += 4) {
      if (Math.abs(b[i]) > 0.4) return true;
    }
    return false;
  }

  _tick() {
    this._step();

    if (this._hasActivity()) {
      this._render();
      this.canvas.style.opacity = '1';
      this.el.style.opacity = '0';
    } else {
      this.canvas.style.opacity = '0';
      this.el.style.opacity = '1';
    }

    requestAnimationFrame(this._tick.bind(this));
  }

  _onMove(e) {
    const rect = this.el.getBoundingClientRect();
    this._disturb(e.clientX - rect.left, e.clientY - rect.top);
  }
}

// Find the first jumbo-text on the page and attach the effect
function initRipple() {
  const jt = document.querySelector('jumbo-text');
  if (jt) new WaterRipple(jt);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initRipple);
} else {
  initRipple();
}
