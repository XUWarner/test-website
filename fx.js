(() => {
  const canvas = document.getElementById("fx-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d", { alpha: true });
  let W = 0, H = 0, DPR = Math.min(2, window.devicePixelRatio || 1);

  function resize() {
    W = Math.floor(window.innerWidth);
    H = Math.floor(window.innerHeight);
    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  window.addEventListener("resize", resize, { passive: true });
  resize();

  // ===== Theme selection =====
  const FX_KEY = "site_fx_mode";
  const btns = Array.from(document.querySelectorAll(".fx-btn"));

  function monthToSeason(m){
    // Northern hemisphere default: spring 3-5, summer 6-8, autumn 9-11, winter 12-2
    if (m >= 3 && m <= 5) return "spring";
    if (m >= 6 && m <= 8) return "summer";
    if (m >= 9 && m <= 11) return "autumn";
    return "winter";
  }
  function getMode(){
    const saved = localStorage.getItem(FX_KEY) || "auto";
    if (saved === "auto") return monthToSeason(new Date().getMonth() + 1);
    return saved; // spring/summer/autumn/winter/none
  }

  // ===== Particle engine =====
  let mode = getMode();
  let particles = [];
  let bokeh = [];
  let running = true;

  const CONFIG = {
    spring: { count: 14, bokeh: 10 },
    summer: { count: 35, bokeh: 22 },
    autumn: { count: 12, bokeh: 10 },
    winter: { count: 35, bokeh: 22 },
    none:   { count: 0,  bokeh: 0  },
  };/*调整count可调整粒子数量，bokeh可调整透明光点*/

  function rand(a,b){ return a + Math.random()*(b-a); }

  function resetParticle(p){
    p.x = rand(0, W);
    p.y = rand(-H * 0.2, H);
    p.vx = rand(-0.25, 0.25);
    p.vy = rand(0.25, 0.9);
    p.size = rand(6, 14);
    p.rot = rand(0, Math.PI*2);
    p.spin = rand(-0.015, 0.015);
    p.wobble = rand(0.6, 1.6);
    p.phase = rand(0, Math.PI*2);
    p.alpha = rand(0.18, 0.38);
    p.kind = mode;
    // mode tweaks
    if (mode === "summer"){ p.size = rand(3, 8); p.vy = rand(0.2, 0.6); p.alpha = rand(0.14, 0.28); }
    if (mode === "autumn"){ p.size = rand(7, 16); p.vy = rand(0.3, 0.9); p.alpha = rand(0.16, 0.34); }
    if (mode === "winter"){ p.size = rand(4, 10); p.vy = rand(0.25, 0.7); p.alpha = rand(0.16, 0.32); }
    if (mode === "spring"){ p.size = rand(7, 14); p.vy = rand(0.25, 0.75); }
    return p;
  }

  function makeParticle(){
    return resetParticle({});
  }

  function resetBokeh(b){
    b.x = rand(0, W);
    b.y = rand(0, H);
    b.r = rand(6, 28);
    b.a = rand(0.03, 0.07);
    b.v = rand(0.05, 0.12);
    return b;
  }
  function makeBokeh(){ return resetBokeh({}); }

  function setMode(next){
    mode = next;
    particles = [];
    bokeh = [];
    const cfg = CONFIG[mode] || CONFIG.spring;
    for (let i=0;i<cfg.count;i++) particles.push(makeParticle());
    for (let i=0;i<cfg.bokeh;i++) bokeh.push(makeBokeh());
    running = (mode !== "none");
  }

  // init
  setMode(getMode());

  // UI buttons
  function markActive(key){
    btns.forEach(b => b.classList.toggle("is-active", b.dataset.fx === key));
  }
  btns.forEach(b => {
    b.addEventListener("click", () => {
      const key = b.dataset.fx;
      localStorage.setItem(FX_KEY, key);
      const actual = (key === "auto") ? monthToSeason(new Date().getMonth()+1) : key;
      markActive(key);
      setMode(actual);
    });
  });
  // highlight saved
  markActive(localStorage.getItem(FX_KEY) || "auto");

  // ===== Drawing shapes (no images needed) =====
  function drawPetal(p){
    // soft pink petal
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = "rgba(255, 164, 190, 0.9)"; // gentle pink
    ctx.beginPath();
    // simple petal: two bezier curves
    const s = p.size;
    ctx.moveTo(0, -s*0.9);
    ctx.bezierCurveTo(s*0.9, -s*0.4, s*0.8, s*0.8, 0, s);
    ctx.bezierCurveTo(-s*0.8, s*0.8, -s*0.9, -s*0.4, 0, -s*0.9);
    ctx.fill();
    ctx.restore();
  }

  function drawSeed(p){
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rot);

  // Slightly stronger alpha for visibility
  ctx.globalAlpha = Math.min(0.55, p.alpha + 0.18);

  const s = p.size;

  // Soft glow to lift it off light background
  ctx.shadowColor = "rgba(248, 213, 152, 0.55)";
  ctx.shadowBlur = 6;

  // Parachute (warm white)
  ctx.strokeStyle = "rgba(255, 234, 140, 0.95)";
  ctx.lineWidth = 1.2;

  ctx.beginPath();
  for (let i=0;i<6;i++){
    const ang = (Math.PI*2/6)*i;
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(ang)*s*1.4, Math.sin(ang)*s*1.4);
  }
  ctx.stroke();

  // Stem
  ctx.shadowBlur = 0; // keep stem crisp
  ctx.strokeStyle = "rgba(245, 232, 210, 0.75)";
  ctx.lineWidth = 1;

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, s*2.1);
  ctx.stroke();

  // Seed dot (slightly darker tip)
  ctx.fillStyle = "rgba(250, 240, 225, 1)";
  ctx.beginPath();
  ctx.arc(0, s*2.2, 1.4, 0, Math.PI*2);
  ctx.fill();

  ctx.restore();
}


  function drawLeaf(p){
    // small red maple-ish leaf (stylized)
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.globalAlpha = p.alpha;
    const s = p.size;
    ctx.fillStyle = "rgba(220, 80, 70, 0.95)";
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.lineTo(s*0.35, -s*0.2);
    ctx.lineTo(s, -s*0.25);
    ctx.lineTo(s*0.45, s*0.1);
    ctx.lineTo(s*0.7, s*0.85);
    ctx.lineTo(0, s*0.4);
    ctx.lineTo(-s*0.7, s*0.85);
    ctx.lineTo(-s*0.45, s*0.1);
    ctx.lineTo(-s, -s*0.25);
    ctx.lineTo(-s*0.35, -s*0.2);
    ctx.closePath();
    ctx.fill();
    // small stem
    ctx.strokeStyle = "rgba(120, 60, 40, 0.45)";
    ctx.beginPath();
    ctx.moveTo(0, s*0.35);
    ctx.lineTo(0, s*1.15);
    ctx.stroke();
    ctx.restore();
  }

  function drawSnow(p){
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rot);

  // Slightly stronger alpha for visibility
  ctx.globalAlpha = Math.min(0.55, p.alpha + 0.16);

  const s = p.size;

  // Icy glow
  ctx.shadowColor = "rgba(160, 220, 255, 0.55)";
  ctx.shadowBlur = 7;

  ctx.strokeStyle = "rgba(175, 230, 255, 0.95)"; // ice blue
  ctx.lineWidth = 1.3;

  for (let i=0;i<3;i++){
    ctx.rotate(Math.PI/3);
    ctx.beginPath();
    ctx.moveTo(-s, 0);
    ctx.lineTo(s, 0);
    ctx.stroke();
  }

  ctx.restore();
}


  function drawBokeh(b){
    ctx.save();
    ctx.globalAlpha = b.a;
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
  }

  // ===== Animation loop =====
  let last = performance.now();
  function tick(now){
    const dt = Math.min(0.033, (now-last)/1000);
    last = now;

    ctx.clearRect(0,0,W,H);

    // bokeh drift
    if (running){
      for (const b of bokeh){
        b.y += b.v;
        b.x += Math.sin((b.y/80)) * 0.08;
        if (b.y - b.r > H) resetBokeh(b), b.y = -b.r;
        drawBokeh(b);
      }
    }

    // particles
    if (running){
      for (const p of particles){
        p.phase += dt * p.wobble;
        const sway = Math.sin(p.phase) * 0.35; // gentle
        p.x += (p.vx + sway) * 60 * dt;
        p.y += p.vy * 60 * dt;
        p.rot += p.spin;

        // wrap
        if (p.y > H + 30) { resetParticle(p); p.y = -30; }
        if (p.x < -50) p.x = W + 50;
        if (p.x > W + 50) p.x = -50;

        if (mode === "spring") drawPetal(p);
        else if (mode === "summer") drawSeed(p);
        else if (mode === "autumn") drawLeaf(p);
        else if (mode === "winter") drawSnow(p);
      }
    }

    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

})();
