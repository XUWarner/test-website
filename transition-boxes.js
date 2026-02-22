// transition-boxes.js
// 箱子堆叠过场动画特效
// 使用方法：在页面中引入此文件，并添加相应的 HTML 容器和样式

(function() {
  const overlay = document.getElementById('transition-overlay');
  const boxesContainer = document.getElementById('boxes-container');
  
  if (!overlay || !boxesContainer) return;
  
  // 获取所有词条链接（可自定义选择器）
  const links = document.querySelectorAll('.notes-strip, .vocab-special-btn');
  
  links.forEach(link => {
    const clickHandler = function(e) {
      const href = this.getAttribute('href');
      
      // 如果是 # 或空链接，不执行动画
      if (!href || href === '#') return;
      
      e.preventDefault();
      
      // 开始过渡动画
      startTransition(href);
    };
    
    if (window.Effects) {
      Effects.on(link, 'click', clickHandler);
    } else {
      link.addEventListener('click', clickHandler);
    }
  });
  
  function startTransition(targetUrl) {
    overlay.classList.add('active');
    boxesContainer.innerHTML = '';
    
    // 计算需要多少箱子来填满屏幕
    const boxSize = 80;
    const cols = Math.ceil(window.innerWidth / boxSize) + 2;
    const rows = Math.ceil(window.innerHeight / boxSize) + 2;
    const totalBoxes = cols * rows;
    
    // 创建箱子
    const boxes = [];
    for (let i = 0; i < totalBoxes; i++) {
      const box = document.createElement('div');
      box.className = 'box';
      
      const row = Math.floor(i / cols);
      const col = i % cols;
      
      box.style.left = (col * boxSize - boxSize) + 'px';
      box.style.top = (row * boxSize - boxSize) + 'px';
      
      boxesContainer.appendChild(box);
      boxes.push(box);
    }
    
    // 阶段1: 箱子堆叠动画（从下往上，从左往右）
    boxes.forEach((box, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;
      
      // 从底部开始，每行延迟递减
      const delay = (rows - row - 1) * 30 + col * 15;
      
      const timeoutId = setTimeout(() => {
        box.style.animation = 'boxStack 0.4s ease-out forwards';
      }, delay);
      
      if (window.Effects) {
        Effects.setTimeout(() => {
          box.style.animation = 'boxStack 0.4s ease-out forwards';
        }, delay);
      }
    });
    
    // 阶段2: 等待堆叠完成后，箱子统一上飘
    const stackDuration = (rows * 30) + (cols * 15) + 400;
    
    const mainTimeout = setTimeout(() => {
      boxes.forEach((box, index) => {
        // 随机旋转方向和角度
        const randomRotation = (Math.random() - 0.5) * 90;
        const randomDelay = Math.random() * 80;
        const randomDuration = 0.6 + Math.random() * 0.2;
        
        setTimeout(() => {
          // 创建随机的上飘动画
          const keyframeName = `boxFloat-${index}`;
          const keyframes = `
            @keyframes ${keyframeName} {
              0% {
                opacity: 1;
                transform: translateY(0) rotate(0deg) scale(1);
              }
              20% {
                opacity: 1;
                transform: translateY(-30px) rotate(${randomRotation * 0.3}deg) scale(1.02);
              }
              100% {
                opacity: 0;
                transform: translateY(-120vh) rotate(${randomRotation}deg) scale(0.3);
              }
            }
          `;
          
          // 动态添加关键帧
          const styleSheet = document.createElement('style');
          styleSheet.textContent = keyframes;
          document.head.appendChild(styleSheet);
          
          box.style.animation = `${keyframeName} ${randomDuration}s ease-in forwards`;
        }, randomDelay);
      });
      
      // 阶段3: 提前开始加载目标页面，箱子飘到一半就跳转
      setTimeout(() => {
        window.location.href = targetUrl;
      }, 500);
      
    }, stackDuration + 200);
    
    if (window.Effects) {
      Effects.setTimeout(() => {
        // 清理逻辑
      }, stackDuration + 700);
    }
  }
  
  // 添加清理函数（如果使用 Effects 管理器）
  if (window.Effects) {
    Effects.addCleanup(() => {
      if (boxesContainer) {
        boxesContainer.innerHTML = '';
      }
      if (overlay) {
        overlay.classList.remove('active');
      }
    });
  }
})();
