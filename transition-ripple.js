// transition-ripple.js
// 水波纹过场动画特效
// 使用方法：在页面中引入此文件，并添加 <canvas id="ripple-canvas"></canvas>

(function() {
  const rippleCanvas = document.getElementById('ripple-canvas');
  if (!rippleCanvas) return;
  
  const ctx = rippleCanvas.getContext('2d');
  let W = window.innerWidth;
  let H = window.innerHeight;
  
  function resizeCanvas() {
    W = window.innerWidth;
    H = window.innerHeight;
    rippleCanvas.width = W;
    rippleCanvas.height = H;
  }
  resizeCanvas();
  
  if (window.Effects) {
    Effects.on(window, 'resize', resizeCanvas);
  } else {
    window.addEventListener('resize', resizeCanvas);
  }
  
  // 获取所有可点击的链接和按钮
  const clickables = document.querySelectorAll('a[href]:not([href="#"]):not([href=""]), .btn, .chip--link, .nav__link');
  
  clickables.forEach(element => {
    const clickHandler = function(e) {
      const href = this.getAttribute('href');
      
      // 跳过无效链接和特效按钮
      if (!href || href === '#' || href === '' || this.classList.contains('fx-btn')) {
        return;
      }
      
      e.preventDefault();
      
      // 获取点击位置
      const rect = this.getBoundingClientRect();
      const clickX = rect.left + rect.width / 2;
      const clickY = rect.top + rect.height / 2;
      
      // 开始水波纹动画
      startRippleTransition(clickX, clickY, href);
    };
    
    if (window.Effects) {
      Effects.on(element, 'click', clickHandler);
    } else {
      element.addEventListener('click', clickHandler);
    }
  });
  
  function startRippleTransition(x, y, targetUrl) {
    rippleCanvas.classList.add('active');
    
    // 计算需要的最大半径（到屏幕最远角）
    const maxRadius = Math.sqrt(
      Math.max(x, W - x) ** 2 + Math.max(y, H - y) ** 2
    );
    
    let currentRadius = 0;
    const startTime = performance.now();
    const duration = 1100;
    
    // 创建一个隐藏的 iframe 预加载下一个页面
    const preloadFrame = document.createElement('iframe');
    preloadFrame.style.position = 'fixed';
    preloadFrame.style.top = '0';
    preloadFrame.style.left = '0';
    preloadFrame.style.width = '100%';
    preloadFrame.style.height = '100%';
    preloadFrame.style.border = 'none';
    preloadFrame.style.opacity = '0';
    preloadFrame.style.pointerEvents = 'none';
    preloadFrame.style.zIndex = '9999';
    preloadFrame.src = targetUrl;
    document.body.appendChild(preloadFrame);
    
    function animate(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // 使用更自然的缓动曲线（类似水波传播）
      const eased = progress < 0.5 
        ? 2 * progress * progress 
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      currentRadius = maxRadius * eased;
      
      // 清空画布
      ctx.clearRect(0, 0, W, H);
      
      // 绘制更多层水波纹（12层，更绵密连续）
      const waveCount = 12;
      for (let i = 0; i < waveCount; i++) {
        const waveProgress = Math.max(0, progress - i * 0.035);
        
        if (waveProgress <= 0) continue;
        
        const waveEased = waveProgress < 0.5 
          ? 2 * waveProgress * waveProgress 
          : 1 - Math.pow(-2 * waveProgress + 2, 2) / 2;
        const waveRadius = maxRadius * waveEased;
        
        // 添加微小的波动效果，模拟真实水波
        const rippleOscillation = Math.sin(waveProgress * Math.PI * 3) * 2;
        const actualRadius = waveRadius + rippleOscillation;
        
        if (actualRadius > 0) {
          // 更柔和细腻的波纹渐变
          const waveGradient = ctx.createRadialGradient(
            x, y, actualRadius * 0.92,
            x, y, actualRadius
          );
          
          const baseAlpha = (0.12 - i * 0.008) * (1 - waveProgress * 0.25);
          
          waveGradient.addColorStop(0, `rgba(120, 210, 195, ${baseAlpha * 0.2})`);
          waveGradient.addColorStop(0.15, `rgba(110, 205, 190, ${baseAlpha * 0.4})`);
          waveGradient.addColorStop(0.35, `rgba(100, 200, 185, ${baseAlpha * 0.7})`);
          waveGradient.addColorStop(0.6, `rgba(95, 195, 180, ${baseAlpha})`);
          waveGradient.addColorStop(0.85, `rgba(85, 185, 170, ${baseAlpha * 1.1})`);
          waveGradient.addColorStop(1, `rgba(75, 175, 160, ${baseAlpha * 0.8})`);
          
          ctx.fillStyle = waveGradient;
          ctx.beginPath();
          ctx.arc(x, y, actualRadius, 0, Math.PI * 2);
          ctx.fill();
          
          // 波纹边缘线
          const edgeAlpha = (0.35 - i * 0.025) * (1 - waveProgress * 0.35);
          ctx.strokeStyle = `rgba(110, 205, 190, ${edgeAlpha})`;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(x, y, actualRadius * 0.97, 0, Math.PI * 2);
          ctx.stroke();
          
          // 内层高光
          if (i < 5) {
            const highlightGradient = ctx.createRadialGradient(
              x, y, actualRadius * 0.75,
              x, y, actualRadius * 0.88
            );
            highlightGradient.addColorStop(0, `rgba(190, 245, 235, 0)`);
            highlightGradient.addColorStop(0.3, `rgba(180, 240, 230, ${baseAlpha * 0.12})`);
            highlightGradient.addColorStop(0.7, `rgba(170, 235, 225, ${baseAlpha * 0.18})`);
            highlightGradient.addColorStop(1, `rgba(160, 230, 220, 0)`);
            
            ctx.fillStyle = highlightGradient;
            ctx.beginPath();
            ctx.arc(x, y, actualRadius * 0.88, 0, Math.PI * 2);
            ctx.fill();
          }
          
          // 次级波纹
          if (i % 2 === 0 && i < 8) {
            const secondaryAlpha = baseAlpha * 0.4;
            ctx.strokeStyle = `rgba(130, 220, 205, ${secondaryAlpha})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.arc(x, y, actualRadius * 0.94, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
      }
      
      // 使用圆形遮罩逐渐显示下一个页面
      if (preloadFrame) {
        const revealProgress = Math.max(0, progress - 0.12);
        const revealEased = revealProgress < 0.5 
          ? 2 * revealProgress * revealProgress 
          : 1 - Math.pow(-2 * revealProgress + 2, 2) / 2;
        const revealRadius = maxRadius * revealEased;
        
        preloadFrame.style.opacity = '1';
        preloadFrame.style.clipPath = `circle(${revealRadius}px at ${x}px ${y}px)`;
        preloadFrame.style.filter = `blur(${Math.max(0, (1 - revealProgress) * 1.5)}px)`;
      }
      
      // 继续动画或跳转
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setTimeout(() => {
          window.location.href = targetUrl;
        }, 50);
      }
    }
    
    requestAnimationFrame(animate);
  }
  
  // 添加清理函数（如果使用 Effects 管理器）
  if (window.Effects) {
    Effects.addCleanup(() => {
      ctx.clearRect(0, 0, W, H);
    });
  }
})();
