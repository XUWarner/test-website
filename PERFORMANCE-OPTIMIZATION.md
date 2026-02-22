# 性能优化说明

## 问题分析

你提供的代码解决了以下关键问题：

### 1. **Effects Manager (effects-manager.js)**
这个管理器解决了内存泄漏和资源未释放的问题：

- **问题**：当用户在页面间跳转时，动画、定时器、事件监听器没有被清理，导致内存泄漏
- **解决方案**：
  - 包装所有 `requestAnimationFrame`、`setInterval`、`setTimeout`
  - 统一管理所有事件监听器
  - 在 `pagehide` 和 `visibilitychange` 事件时自动清理所有资源

### 2. **性能检测 (lowPower)**
```javascript
const lowPower = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4;
const MAX_PARTICLES = lowPower ? 20 : 60;
```

- **作用**：检测设备 CPU 核心数，低性能设备减少粒子数量
- **效果**：4核及以下设备粒子数减半，避免卡顿

### 3. **页面恢复处理 (pageshow)**
```javascript
let inited = false;
window.addEventListener("pageshow", (e) => {
  if (e.persisted) {  // 从 bfcache 恢复
    inited = false;
    initEffects();
  }
});
```

- **作用**：处理浏览器后退缓存 (bfcache)
- **效果**：从缓存恢复时重新初始化特效，避免特效失效

## 使用方法

### 方案 1：替换现有文件（推荐）

1. **在所有 HTML 文件的 `<head>` 中添加**：
```html
<script src="effects-manager.js"></script>
```

2. **替换 fx.js 引用**：
```html
<!-- 旧的 -->
<script src="fx.js"></script>

<!-- 新的 -->
<script src="fx-optimized.js"></script>
```

### 方案 2：修改现有 fx.js

如果不想创建新文件，可以直接修改 `fx.js`：

1. **在文件开头添加 Effects 管理器代码**
2. **替换所有动画和事件调用**：
   - `requestAnimationFrame(tick)` → `Effects.raf(tick)`
   - `window.addEventListener(...)` → `Effects.on(window, ...)`
   - `setInterval(...)` → `Effects.setInterval(...)`

3. **添加性能检测**：
```javascript
const lowPower = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4;
const PERFORMANCE_MULTIPLIER = lowPower ? 0.5 : 1;

const CONFIG = {
  spring: { 
    count: Math.floor(14 * PERFORMANCE_MULTIPLIER), 
    bokeh: Math.floor(10 * PERFORMANCE_MULTIPLIER) 
  },
  // ... 其他配置
};
```

4. **添加清理函数**：
```javascript
Effects.addCleanup(() => {
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
  particles = [];
  bokeh = [];
  ctx.clearRect(0, 0, W, H);
});
```

## 需要修改的文件

以下文件需要添加 `effects-manager.js` 引用：

1. `index.html`
2. `experience_in_school.html`
3. `vertical_farming_system.html`
4. `vocabulary.html`
5. `notes/notes.html`
6. `projects/project.html`
7. `pages/vertical-farming.html`
8. `pages/about.html`

## 优化效果

### 修改前：
- ❌ 页面切换后动画继续运行（内存泄漏）
- ❌ 低性能设备卡顿
- ❌ 从缓存恢复时特效失效
- ❌ 事件监听器累积

### 修改后：
- ✅ 页面隐藏/离开时自动停止所有特效
- ✅ 低性能设备自动减少粒子数量
- ✅ 从缓存恢复时正确重新初始化
- ✅ 所有资源正确清理，无内存泄漏

## 测试方法

1. **测试内存泄漏**：
   - 打开开发者工具 → Performance/Memory
   - 在页面间来回切换 10 次
   - 检查内存是否持续增长

2. **测试性能**：
   - 在低性能设备上打开页面
   - 检查是否流畅（应该粒子数减少）

3. **测试缓存恢复**：
   - 访问页面 → 点击链接跳转 → 点击浏览器后退
   - 检查特效是否正常工作

## 注意事项

1. **effects-manager.js 必须在 fx.js 之前加载**
2. **所有使用特效的页面都需要引入 effects-manager.js**
3. **如果有其他自定义动画（如水波纹、箱子堆叠），也应该使用 Effects 管理器**

## 进一步优化建议

1. **添加 Intersection Observer**：只在特效可见时运行
2. **使用 OffscreenCanvas**：在 Web Worker 中渲染（高级）
3. **添加帧率限制**：低性能设备降低到 30fps
4. **懒加载特效**：首屏加载完成后再启动特效
