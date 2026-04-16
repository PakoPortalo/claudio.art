// @ts-nocheck
/**
 * claudio-ripple.js
 * Fluid WebGL distortion effect for the hero jumbo text.
 * Replaces the old 2D water-ripple with a GPU fluid simulation.
 * Transparent background — the hero video/image shows through.
 */

import * as THREE from 'https://unpkg.com/three@0.158.0/build/three.module.js';

// ─── SHADERS ─────────────────────────────────────────────────────────────────

const VS = /* glsl */`
  varying vec2 vUv;
  #ifdef USE_OFFSETS
    varying vec2 vL, vR, vT, vB;
    uniform vec2 texelSize;
  #endif
  void main() {
    vUv = uv;
    #ifdef USE_OFFSETS
      vL = uv - vec2(texelSize.x, 0.0);
      vR = uv + vec2(texelSize.x, 0.0);
      vT = uv + vec2(0.0, texelSize.y);
      vB = uv - vec2(0.0, texelSize.y);
    #endif
    gl_Position = vec4(position, 1.0);
  }
`;

const FS_CLEAR = `precision highp float;
  varying vec2 vUv; uniform sampler2D uTexture; uniform float uClearValue;
  void main() { gl_FragColor = uClearValue * texture2D(uTexture, vUv); }`;

const FS_CURL = `precision highp float;
  varying vec2 vL,vR,vT,vB; uniform sampler2D uVelocity;
  void main() {
    float L=texture2D(uVelocity,vL).y, R=texture2D(uVelocity,vR).y,
          T=texture2D(uVelocity,vT).x, B=texture2D(uVelocity,vB).x;
    gl_FragColor=vec4(R-L-T+B,0,0,1); }`;

const FS_VORTICITY = `precision highp float;
  varying vec2 vUv,vL,vR,vT,vB; uniform sampler2D uVelocity,uCurl;
  uniform float uCurlValue,dt;
  void main() {
    float L=texture2D(uCurl,vL).x, R=texture2D(uCurl,vR).x,
          T=texture2D(uCurl,vT).x, B=texture2D(uCurl,vB).x, C=texture2D(uCurl,vUv).x;
    vec2 f=vec2(abs(T)-abs(B),abs(R)-abs(L))*0.5;
    f/=length(f)+1.; f*=uCurlValue*C; f.y*=-1.;
    gl_FragColor=vec4(texture2D(uVelocity,vUv).xy+f*dt,0,1); }`;

const FS_DIVERGENCE = `precision highp float;
  varying vec2 vUv,vL,vR,vT,vB; uniform sampler2D uVelocity;
  void main() {
    float L=texture2D(uVelocity,vL).x, R=texture2D(uVelocity,vR).x,
          T=texture2D(uVelocity,vT).y, B=texture2D(uVelocity,vB).y;
    vec2 C=texture2D(uVelocity,vUv).xy;
    if(vL.x<0.)L=-C.x; if(vR.x>1.)R=-C.x;
    if(vT.y>1.)T=-C.y; if(vB.y<0.)B=-C.y;
    gl_FragColor=vec4(.5*(R-L+T-B),0,0,1); }`;

const FS_PRESSURE = `precision highp float;
  varying vec2 vUv,vL,vR,vT,vB; uniform sampler2D uPressure,uDivergence;
  void main() {
    float L=texture2D(uPressure,vL).x, R=texture2D(uPressure,vR).x,
          T=texture2D(uPressure,vT).x, B=texture2D(uPressure,vB).x;
    gl_FragColor=vec4((L+R+B+T-texture2D(uDivergence,vUv).x)*.25,0,0,1); }`;

const FS_GRADIENT = `precision highp float;
  varying vec2 vUv,vL,vR,vT,vB; uniform sampler2D uPressure,uVelocity;
  void main() {
    float L=texture2D(uPressure,vL).x, R=texture2D(uPressure,vR).x,
          T=texture2D(uPressure,vT).x, B=texture2D(uPressure,vB).x;
    vec2 v=texture2D(uVelocity,vUv).xy; v-=vec2(R-L,T-B);
    gl_FragColor=vec4(v,0,1); }`;

const FS_SPLAT = `precision highp float;
  varying vec2 vUv; uniform sampler2D uTarget;
  uniform float aspectRatio, uRadius; uniform vec3 uColor; uniform vec2 uPointer;
  void main() {
    vec2 p = vUv - uPointer;
    p.x *= aspectRatio;
    vec2 velDir = length(uColor.xy) > 0.0001 ? normalize(uColor.xy) : vec2(1.0,0.0);
    float along = dot(p, velDir);
    float perp  = length(p - along * velDir);
    float d = (along * along) / uRadius + (perp * perp) / uRadius;
    gl_FragColor = vec4(texture2D(uTarget, vUv).xyz + exp(-d) * uColor, 1.0);
  }`;

const FS_ADVECTION = `precision highp float;
  varying vec2 vUv; uniform sampler2D uVelocity,uSource;
  uniform vec2 texelSize; uniform float dt,uDissipation;
  void main() {
    vec2 c=vUv-dt*texture2D(uVelocity,vUv).xy*texelSize;
    gl_FragColor=uDissipation*texture2D(uSource,c); gl_FragColor.a=1.; }`;

// Transparent display: distorts text pixels, no solid background
const FS_DISPLAY = /* glsl */`
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D tVelocity, tText;
  uniform float uDistort;
  void main() {
    vec2 vel = texture2D(tVelocity, vUv).xy;
    vec2 distUv = clamp(vUv - vel * uDistort, 0.0, 1.0);
    vec4 text = texture2D(tText, distUv);
    gl_FragColor = vec4(text.rgb, text.a);
  }
`;

// ─── FluidRipple ─────────────────────────────────────────────────────────────

class FluidRipple {
  constructor(el) {
    this.el = el;
    this._ptr      = { x: -1, y: -1 };
    this._momentum = { x: 0, y: 0 };
    this._lastPos  = { x: 0.5, y: 0.5 };
    this._hasPos   = false;
    this._movedThisFrame = false;
    this._dpr = Math.min(devicePixelRatio, 2);
    this._raf = null;

    this._waitForReady();
  }

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
    const { el } = this;
    const rect = el.getBoundingClientRect();
    this.w = Math.floor(rect.width);
    this.h = Math.floor(rect.height);
    if (!this.w || !this.h) return;

    // Canvas same size as element — no DOM layout impact
    this.cw = this.w;
    this.ch = this.h;

    this.canvas = document.createElement('canvas');

    const parent = el.parentElement;
    if (getComputedStyle(parent).position === 'static') {
      parent.style.position = 'relative';
    }
    parent.appendChild(this.canvas);

    this._setupGL();

    // Set CSS AFTER setupGL so Three.js doesn't override positioning
    Object.assign(this.canvas.style, {
      position:      'absolute',
      top:           '0',
      left:          '0',
      width:         '100%',
      height:        '100%',
      pointerEvents: 'none',
      opacity:       '0',
      transition:    'opacity 0.15s',
    });
    el.style.transition = 'opacity 0.15s';
    this._bindEvents();

    let last = performance.now();
    const loop = (now) => {
      this._raf = requestAnimationFrame(loop);
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      this._tick(dt);
    };
    this._raf = requestAnimationFrame(loop);
  }

  _setupGL() {
    const S = 128;
    const { canvas } = this;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true });
    this.renderer.setPixelRatio(this._dpr);
    this.renderer.setSize(this.cw, this.ch); // sets canvas px = cw*dpr × ch*dpr
    this.renderer.setClearColor(0x000000, 0);

    // Slight zoom-out so the oversized texture fits with breathing room at edges
    this.camera = new THREE.OrthographicCamera(-1.5, 1.5, 1.5, -1.5, 0, 1);
    this.scene  = new THREE.Scene();
    this.quad   = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    this.scene.add(this.quad);

    const pp = (w, h) => {
      const o = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
                  type: THREE.HalfFloatType, format: THREE.RGBAFormat, depthBuffer: false };
      const a = new THREE.WebGLRenderTarget(w, h, o);
      const b = new THREE.WebGLRenderTarget(w, h, o);
      return { read: a, write: b,
        swap() { const t = this.read; this.read = this.write; this.write = t; } };
    };
    const rt = (w, h) => new THREE.WebGLRenderTarget(w, h, {
      minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
      type: THREE.HalfFloatType, format: THREE.RGBAFormat, depthBuffer: false });

    this.rtVel  = pp(S, S);
    this.rtPres = pp(S, S);
    this.rtDiv  = rt(S, S);
    this.rtCurl = rt(S, S);

    const ts = new THREE.Vector2(1 / S, 1 / S);
    const mk = (fs, def = {}) => new THREE.ShaderMaterial({
      vertexShader: VS, fragmentShader: fs, uniforms: {},
      defines: def, depthTest: false, depthWrite: false,
    });

    this.mClear = mk(FS_CLEAR);
    this.mClear.uniforms = { uTexture: { value: null }, uClearValue: { value: 0.8 } };

    this.mCurl = mk(FS_CURL, { USE_OFFSETS: '' });
    this.mCurl.uniforms = { uVelocity: { value: null }, texelSize: { value: ts.clone() } };

    this.mVort = mk(FS_VORTICITY, { USE_OFFSETS: '' });
    this.mVort.uniforms = { uVelocity: { value: null }, uCurl: { value: null },
      uCurlValue: { value: 0.8 }, dt: { value: 1 / 60 }, texelSize: { value: ts.clone() } };

    this.mDiv = mk(FS_DIVERGENCE, { USE_OFFSETS: '' });
    this.mDiv.uniforms = { uVelocity: { value: null }, texelSize: { value: ts.clone() } };

    this.mPres = mk(FS_PRESSURE, { USE_OFFSETS: '' });
    this.mPres.uniforms = { uPressure: { value: null }, uDivergence: { value: null },
      texelSize: { value: ts.clone() } };

    this.mGrad = mk(FS_GRADIENT, { USE_OFFSETS: '' });
    this.mGrad.uniforms = { uPressure: { value: null }, uVelocity: { value: null },
      texelSize: { value: ts.clone() } };

    this.mSplat = mk(FS_SPLAT);
    this.mSplat.uniforms = { uTarget: { value: null },
      aspectRatio: { value: this.cw / this.ch },
      uColor: { value: new THREE.Vector3() },
      uPointer: { value: new THREE.Vector2() },
      uRadius: { value: 0.0015 } };

    this.mAdv = mk(FS_ADVECTION);
    this.mAdv.uniforms = { uVelocity: { value: null }, uSource: { value: null },
      texelSize: { value: ts.clone() }, dt: { value: 1 / 60 },
      uDissipation: { value: 0.90 } };

    this.mDisplay = mk(FS_DISPLAY);
    this.mDisplay.uniforms = {
      tVelocity: { value: null },
      tText:     { value: this._buildTex() },
      uDistort:  { value: 0.012 },
    };
  }

  // Reads text + computed styles from the DOM element — matches the real font
  _buildTex() {
    const { el, cw, ch, _dpr } = this;
    // Render at 2× the canvas size so the text sits centred with breathing room
    const SCALE  = 1.5;
    const pw = Math.ceil(cw * _dpr * SCALE);
    const ph = Math.ceil(ch * _dpr * SCALE);

    const span = el.querySelector('.jumbo-text-line');
    const text = (span || el).textContent.trim();
    const cs   = getComputedStyle(el);

    let displayText = text;
    if (cs.textTransform === 'uppercase') displayText = text.toUpperCase();
    else if (cs.textTransform === 'lowercase') displayText = text.toLowerCase();

    const c   = document.createElement('canvas');
    c.width   = pw;
    c.height  = ph;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, pw, ph);

    const baseFontSize = parseFloat(cs.fontSize) * _dpr;
    ctx.font         = `${cs.fontWeight} ${baseFontSize}px ${cs.fontFamily}`;
    ctx.fillStyle    = cs.color || '#ffffff';
    ctx.textBaseline = 'middle';
    ctx.textAlign    = 'center';
    if ('letterSpacing' in ctx) ctx.letterSpacing = cs.letterSpacing;

    // Draw centred — maxWidth = 80% of texture so letters never clip edges
    ctx.fillText(displayText, pw / 2, ph / 2, pw * 0.80);

    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    return tex;
  }

  _r(mat, target) {
    this.quad.material = mat;
    this.renderer.setRenderTarget(target ?? null);
    this.renderer.render(this.scene, this.camera);
  }

  _simulate(dt) {
    const { mVort: mv, mAdv, mCurl, mDiv, mPres, mGrad, mClear,
            rtVel, rtPres, rtDiv, rtCurl } = this;
    const S = 128;

    mv.uniforms.dt.value  = dt;
    mAdv.uniforms.dt.value = dt;

    mCurl.uniforms.uVelocity.value = rtVel.read.texture;
    this._r(mCurl, rtCurl);

    mv.uniforms.uVelocity.value = rtVel.read.texture;
    mv.uniforms.uCurl.value     = rtCurl.texture;
    this._r(mv, rtVel.write); rtVel.swap();

    mDiv.uniforms.uVelocity.value = rtVel.read.texture;
    this._r(mDiv, rtDiv);

    mClear.uniforms.uTexture.value = rtPres.read.texture;
    this._r(mClear, rtPres.write); rtPres.swap();

    for (let i = 0; i < 25; i++) {
      mPres.uniforms.uPressure.value   = rtPres.read.texture;
      mPres.uniforms.uDivergence.value = rtDiv.texture;
      this._r(mPres, rtPres.write); rtPres.swap();
    }

    mGrad.uniforms.uPressure.value = rtPres.read.texture;
    mGrad.uniforms.uVelocity.value = rtVel.read.texture;
    this._r(mGrad, rtVel.write); rtVel.swap();

    mAdv.uniforms.uVelocity.value    = rtVel.read.texture;
    mAdv.uniforms.uSource.value      = rtVel.read.texture;
    mAdv.uniforms.texelSize.value.set(1 / S, 1 / S);
    mAdv.uniforms.uDissipation.value = 0.90;
    this._r(mAdv, rtVel.write); rtVel.swap();
  }

  _splat(x, y, dx, dy) {
    const { mSplat, rtVel } = this;
    mSplat.uniforms.aspectRatio.value = this.cw / this.ch;
    mSplat.uniforms.uPointer.value.set(x, y);
    mSplat.uniforms.uRadius.value     = 0.0015;
    mSplat.uniforms.uTarget.value     = rtVel.read.texture;
    mSplat.uniforms.uColor.value.set(dx, dy, 0.0);
    this._r(mSplat, rtVel.write); rtVel.swap();
  }

  _hasActivity() {
    // Check if fluid has meaningful velocity — avoids running GPU when idle
    return this._hasPos && (
      Math.abs(this._momentum.x) + Math.abs(this._momentum.y) > 1
    );
  }

  _tick(dt) {
    this._simulate(dt);

    if (!this._movedThisFrame && this._hasPos) {
      const mag = Math.sqrt(this._momentum.x ** 2 + this._momentum.y ** 2);
      if (mag > 40) {
        this._splat(this._lastPos.x, this._lastPos.y,
          this._momentum.x * 0.4, this._momentum.y * 0.4);
        this._momentum.x *= 0.78;
        this._momentum.y *= 0.78;
      }
    }
    this._movedThisFrame = false;

    const active = this._hasActivity() ||
      Math.abs(this._momentum.x) + Math.abs(this._momentum.y) > 5;

    this.mDisplay.uniforms.tVelocity.value = this.rtVel.read.texture;
    this._r(this.mDisplay, null);

    if (active) {
      this.canvas.style.opacity = '1';
      this.el.style.opacity     = '0';
    } else {
      this.canvas.style.opacity = '0';
      this.el.style.opacity     = '1';
    }
  }

  _bindEvents() {
    const move = (cx, cy) => {
      const rect = this.el.getBoundingClientRect();
      const nx = (cx - rect.left) / rect.width;
      const ny = 1.0 - (cy - rect.top) / rect.height;
      const p  = this._ptr;

      if (p.x >= 0) {
        const rawDx = (nx - p.x) * 4000;
        const rawDy = (ny - p.y) * 4000;
        const blend = 0.55;
        this._momentum.x = this._momentum.x * (1 - blend) + rawDx * blend;
        this._momentum.y = this._momentum.y * (1 - blend) + rawDy * blend;
        if (Math.abs(rawDx) + Math.abs(rawDy) > 0.5) {
          this._splat(nx, ny, this._momentum.x, this._momentum.y);
        }
      }

      p.x = nx; p.y = ny;
      this._lastPos.x      = nx;
      this._lastPos.y      = ny;
      this._hasPos         = true;
      this._movedThisFrame = true;
    };

    this.el.addEventListener('mousemove',  e => move(e.clientX, e.clientY));
    this.el.addEventListener('touchmove',  e => {
      e.preventDefault();
      move(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });
    this.el.addEventListener('mouseleave', () => {
      this._ptr.x = -1; this._ptr.y = -1;
    });
  }
}

// ─── INIT ────────────────────────────────────────────────────────────────────

function init() {
  const jt = document.querySelector('jumbo-text');
  if (jt) new FluidRipple(jt);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
