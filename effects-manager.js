// effects-manager.js
// 特效管理器 - 防止内存泄漏和页面卡顿

const Effects = {
  rafIds: new Set(),
  intervals: new Set(),
  timeouts: new Set(),
  cleanupFns: new Set(),
  listeners: [],

  // 包装 requestAnimationFrame
  raf(fn) {
    const id = requestAnimationFrame(fn);
    this.rafIds.add(id);
    return id;
  },

  // 包装 setInterval
  setInterval(fn, ms) {
    const id = window.setInterval(fn, ms);
    this.intervals.add(id);
    return id;
  },

  // 包装 setTimeout
  setTimeout(fn, ms) {
    const id = window.setTimeout(fn, ms);
    this.timeouts.add(id);
    return id;
  },

  // 包装事件监听器
  on(target, event, handler, options) {
    target.addEventListener(event, handler, options);
    this.listeners.push([target, event, handler, options]);
  },

  // 添加自定义清理函数
  addCleanup(fn) {
    this.cleanupFns.add(fn);
  },

  // 停止所有特效
  stopAll() {
    // 停止所有 RAF
    for (const id of this.rafIds) {
      cancelAnimationFrame(id);
    }
    this.rafIds.clear();

    // 停止所有定时器
    for (const id of this.intervals) {
      clearInterval(id);
    }
    this.intervals.clear();

    for (const id of this.timeouts) {
      clearTimeout(id);
    }
    this.timeouts.clear();

    // 移除所有事件监听器
    for (const [target, event, handler, options] of this.listeners) {
      target.removeEventListener(event, handler, options);
    }
    this.listeners = [];

    // 调用自定义清理函数
    for (const fn of this.cleanupFns) {
      try {
        fn();
      } catch (err) {
        console.warn('Cleanup error:', err);
      }
    }
    this.cleanupFns.clear();
  }
};

// 在页面隐藏/离开时停止所有特效（关键优化）
window.addEventListener("pagehide", () => {
  Effects.stopAll();
}, { capture: true });

// 当页面不可见时停止特效
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    Effects.stopAll();
  }
});

// 导出供其他脚本使用
window.Effects = Effects;
