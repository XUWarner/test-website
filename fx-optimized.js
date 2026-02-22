// fx-optimized.js - 优化版特效系统
// 集成特效管理器，防止卡顿和内存泄漏

(() => {
  const canvas = document.getElementById("fx-canvas");
  if (!canvas) return;

  // 检测设备性能
  const lowPower = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4;
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  // 根据设备性能调整粒子数量
  const PERFORMANCE_MULTIPLIER = lowPower || isMobile ? 0.5 : 1;

  // 特效开关：点击展开/收起面板
  const panelToggle = document.querySelector(".js-fx-panel-toggle");
  const panelBody = document.getElementById("fx-panel-body");
  if (panelToggle && panelBody) {
    const toggleHandler = () => {
      const willBeOpen = panelBody.hidden;
      panelBody.hidden = !panelBody.hidden;
      panelToggle.setAttribute("aria-expanded", String(willBeOpen));
    };
    Effects.on(panelToggle, "click", toggleHandler);
  }

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
  
  Effects.on(window, "resize", resize, { passive: true });
  resize();

  // ===== Theme selection =====
  const FX_KEY = "site_fx_mode";
  const btns = Array.from(document.querySelectorAll(".fx-btn"));

  function monthToSeason(m){
    if (m >= 3 && m <= 5) return "spring";
    if (m >= 6 && m <= 8) return "summer";
    if (m >= 9 && m <= 11) return "autumn";
    return "winter";
  }
  
  function getMode(){
    const saved = localStorage.getItem(FX_KEY) || "auto";
    if (saved === "auto") return monthToSeason(new Date().getMonth() + 1);
    return saved;
  }

  // ===== Particle engine =====
  let mode = getMode();
  let particles = [];
  let bokeh = [];
  let running = true;
  let animationId = null;

  // 根据性能调整配置
  const CONFIG = {
    spring: { 
      count: Math.floor(14 * PERFORMANCE_MULTIPLIER), 
      bokeh: Math.floor(10 * PERFORMANCE_MULTIPLIER) 
    },
    summer: { 
      count: Math.floor(35 * PERFORMANCE_MULTIPLIER), 
      bokeh: Math.floor(22 * PERFORMANCE_MULTIPLIER) 
    },
    autumn: { 
      count: Math.floor(12 * PERFORMANCE_MULTIPLIER), 
      bokeh: Math.floor(10 * PERFORMANCE_MULTIPLIER) 
    },
    winter: { 
      count: Math.floor(35 * PERFORMANCE_MULTIPLIER), 
      bokeh: Math.floor(22 * PERFORMANCE_MULTIPLIER) 
    },
    none: { count: 0, bokeh: 0 },
  };

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
    
    if (mode === "summer"){ p.size = rand(3, 8); p.vy = rand(0.2, 0.6); p.alpha = rand(0.14, 0.28); }
    if (mode === "autumn"){ p.size = rand(7, 16); p.vy = rand(0.3, 0.9); p.alpha = rand(0.16, 0.34); }
    if (mode === "winter"){ p.size = rand(4, 10); p.vy = rand(0.25, 0.7); p.alpha = rand(0.16, 0.32); }
    if (mode === "spring"){ p.size = rand(7, 14); p.vy = rand(0.25, 0.75); }
    return p;
  }

  function makeParticle(){ return resetParticle({}); }

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
    const clickHandler = () => {
      const key = b.dataset.fx;
      localStorage.setItem(FX_KEY, key);
      const actual = (key === "auto") ? monthToSeason(new Date().getMonth()+1) : key;
      markActive(key);
      setMode(actual);
    };
    Effects.on(b, "click", clickHandler);
  });
  
  markActive(localStorage.getItem(FX_KEY) || "auto");

  // ===== Drawing shapes (复用原有的绘制函数) =====
  function drawPetal(p){
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.globalAlpha = p.alpha;
    
    const s = p.size;
    ctx.shadowColor = "rgba(255, 120, 150, 0.3)";
    ctx.shadowBlur = 8;
    
    const gradient = ctx.createRadialGradient(0, -s*0.3, 0, 0, 0, s);
    gradient.addColorStop(0, "rgba(255, 220, 230, 0.95)");
    gradient.addColorStop(0.5, "rgba(255, 182, 205, 0.92)");
    gradient.addColorStop(1, "rgba(255, 150, 180, 0.88)");
    ctx.fillStyle = gradient;
    
    ctx.beginPath();
    ctx.moveTo(0, -s*0.95);
    ctx.bezierCurveTo(s*0.95, -s*0.5, s*0.85, s*0.7, 0, s*0.95);
    ctx.bezierCurveTo(-s*0.85, s*0.7, -s*0.95, -s*0.5, 0, -s*0.95);
    ctx.fill();
    
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(255, 140, 170, 0.25)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(0, -s*0.8);
    ctx.quadraticCurveTo(s*0.15, 0, 0, s*0.8);
    ctx.moveTo(0, -s*0.8);
    ctx.quadraticCurveTo(-s*0.15, 0, 0, s*0.8);
    ctx.stroke();
    
    ctx.restore();
  }

  function drawSeed(p){
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.globalAlpha = Math.min(0.85, p.alpha + 0.35);
    
    const s = p.size;
    ctx.shadowColor = "rgba(255, 240, 180, 0.8)";
    ctx.shadowBlur = 12;
    
    const rays = 10;
    for (let i = 0; i < rays; i++) {
      const angle = (Math.PI * 2 / rays) * i;
      const length = s * (1.4 + Math.sin(p.phase + i) * 0.2);
      
      ctx.strokeStyle = "rgba(255, 248, 220, 0.95)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      const endX = Math.cos(angle) * length;
      const endY = Math.sin(angle) * length;
      ctx.lineTo(endX, endY);
      ctx.stroke();
      
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(255, 245, 210, 0.85)";
      const forkAngle1 = angle - 0.15;
      const forkAngle2 = angle + 0.15;
      const forkLength = length * 0.7;
      
      ctx.beginPath();
      ctx.moveTo(endX * 0.6, endY * 0.6);
      ctx.lineTo(Math.cos(forkAngle1) * forkLength, Math.sin(forkAngle1) * forkLength);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(endX * 0.6, endY * 0.6);
      ctx.lineTo(Math.cos(forkAngle2) * forkLength, Math.sin(forkAngle2) * forkLength);
      ctx.stroke();
      
      ctx.shadowBlur = 6;
      ctx.fillStyle = "rgba(255, 250, 230, 1)";
      ctx.beginPath();
      ctx.arc(endX, endY, 1.8, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.beginPath();
      ctx.arc(Math.cos(forkAngle1) * forkLength, Math.sin(forkAngle1) * forkLength, 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(Math.cos(forkAngle2) * forkLength, Math.sin(forkAngle2) * forkLength, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.shadowBlur = 8;
    ctx.strokeStyle = "rgba(250, 235, 200, 0.95)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, s * 2.8);
    ctx.stroke();
    
    ctx.shadowBlur = 5;
    ctx.fillStyle = "rgba(240, 225, 195, 1)";
    ctx.beginPath();
    ctx.ellipse(0, s * 2.9, 2.5, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255, 245, 220, 0.6)";
    ctx.beginPath();
    ctx.ellipse(-0.8, s * 2.7, 1, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }

  function drawLeaf(p){
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.globalAlpha = p.alpha;
    
    const s = p.size;
    ctx.shadowColor = "rgba(180, 60, 40, 0.35)";
    ctx.shadowBlur = 6;
    
    const gradient = ctx.createRadialGradient(0, -s*0.3, 0, 0, 0, s);
    gradient.addColorStop(0, "rgba(255, 140, 80, 0.95)");
    gradient.addColorStop(0.4, "rgba(235, 90, 70, 0.93)");
    gradient.addColorStop(1, "rgba(200, 60, 50, 0.90)");
    ctx.fillStyle = gradient;
    
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.lineTo(s*0.4, -s*0.3);
    ctx.lineTo(s*0.95, -s*0.4);
    ctx.lineTo(s*0.5, s*0.05);
    ctx.lineTo(s*0.75, s*0.9);
    ctx.lineTo(s*0.15, s*0.5);
    ctx.lineTo(0, s*0.65);
    ctx.lineTo(-s*0.15, s*0.5);
    ctx.lineTo(-s*0.75, s*0.9);
    ctx.lineTo(-s*0.5, s*0.05);
    ctx.lineTo(-s*0.95, -s*0.4);
    ctx.lineTo(-s*0.4, -s*0.3);
    ctx.closePath();
    ctx.fill();
    
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(150, 50, 40, 0.4)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -s*0.9);
    ctx.lineTo(0, s*0.6);
    ctx.moveTo(0, -s*0.3);
    ctx.lineTo(s*0.4, -s*0.2);
    ctx.moveTo(0, -s*0.3);
    ctx.lineTo(-s*0.4, -s*0.2);
    ctx.moveTo(0, s*0.1);
    ctx.lineTo(s*0.5, s*0.2);
    ctx.moveTo(0, s*0.1);
    ctx.lineTo(-s*0.5, s*0.2);
    ctx.stroke();
    
    ctx.strokeStyle = "rgba(140, 70, 50, 0.6)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, s*0.6);
    ctx.lineTo(0, s*1.2);
    ctx.stroke();
    
    ctx.restore();
  }

  function drawSnow(p){
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.globalAlpha = Math.min(0.9, p.alpha + 0.4);
    
    const s = p.size;
    ctx.shadowColor = "rgba(200, 240, 255, 0.9)";
    ctx.shadowBlur = 14;
    
    for (let i = 0; i < 6; i++) {
      ctx.save();
      ctx.rotate((Math.PI / 3) * i);
      
      ctx.strokeStyle = "rgba(230, 250, 255, 1)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -s);
      ctx.stroke();
      
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = "rgba(220, 245, 255, 0.95)";
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.35);
      ctx.lineTo(-s * 0.3, -s * 0.55);
      ctx.moveTo(0, -s * 0.35);
      ctx.lineTo(s * 0.3, -s * 0.55);
      ctx.stroke();
      
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.6);
      ctx.lineTo(-s * 0.28, -s * 0.78);
      ctx.moveTo(0, -s * 0.6);
      ctx.lineTo(s * 0.28, -s * 0.78);
      ctx.stroke();
      
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.8);
      ctx.lineTo(-s * 0.22, -s * 0.95);
      ctx.moveTo(0, -s * 0.8);
      ctx.lineTo(s * 0.22, -s * 0.95);
      ctx.stroke();
      
      ctx.fillStyle = "rgba(240, 252, 255, 1)";
      ctx.shadowBlur = 6;
      
      ctx.beginPath();
      ctx.arc(-s * 0.3, -s * 0.55, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(s * 0.3, -s * 0.55, 1.5, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.beginPath();
      ctx.arc(-s * 0.28, -s * 0.78, 1.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(s * 0.28, -s * 0.78, 1.3, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.beginPath();
      ctx.arc(-s * 0.22, -s * 0.95, 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(s * 0.22, -s * 0.95, 1.2, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.beginPath();
      ctx.arc(0, -s, 2, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.restore();
    }
    
    ctx.shadowBlur = 8;
    ctx.fillStyle = "rgba(245, 252, 255, 0.95)";
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      const x = Math.cos(angle) * s * 0.25;
      const y = Math.sin(angle) * s * 0.25;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    
    ctx.shadowBlur = 5;
    ctx.fillStyle = "rgba(255, 255, 255, 1)";
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.12, 0, Math.PI * 2);
    ctx.fill();
    
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

    if (running){
      // bokeh drift
      for (const b of bokeh){
        b.y += b.v;
        b.x += Math.sin((b.y/80)) * 0.08;
        if (b.y - b.r > H) resetBokeh(b), b.y = -b.r;
        drawBokeh(b);
      }

      // particles
      for (const p of particles){
        p.phase += dt * p.wobble;
        const sway = Math.sin(p.phase) * 0.35;
        p.x += (p.vx + sway) * 60 * dt;
        p.y += p.vy * 60 * dt;
        p.rot += p.spin;

        if (p.y > H + 30) { resetParticle(p); p.y = -30; }
        if (p.x < -50) p.x = W + 50;
        if (p.x > W + 50) p.x = -50;

        if (mode === "spring") drawPetal(p);
        else if (mode === "summer") drawSeed(p);
        else if (mode === "autumn") drawLeaf(p);
        else if (mode === "winter") drawSnow(p);
      }
    }

    animationId = Effects.raf(tick);
  }
  
  // 开始动画
  animationId = Effects.raf(tick);
  
  // 添加清理函数
  Effects.addCleanup(() => {
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
    particles = [];
    bokeh = [];
    ctx.clearRect(0, 0, W, H);
  });

})();
