# 过场动画特效使用说明

## 文件说明

已创建的独立特效文件：

1. **transition-ripple.js** - 水波纹过场动画
2. **transition-boxes.js** - 箱子堆叠过场动画
3. **transition-effects.css** - 两种特效的样式文件

## 使用方法

### 水波纹过场动画

#### 1. 引入文件
```html
<head>
  <link rel="stylesheet" href="transition-effects.css" />
  <script src="effects-manager.js"></script> <!-- 可选，用于资源管理 -->
</head>
<body>
  <!-- 页面内容 -->
  
  <!-- 在 body 结束前添加 -->
  <canvas id="ripple-canvas" aria-hidden="true"></canvas>
  <script src="transition-ripple.js"></script>
</body>
```

#### 2. 自动应用
脚本会自动为所有链接和按钮添加水波纹效果，跳过：
- `href="#"` 或空链接
- 带有 `.fx-btn` 类的元素

#### 3. 自定义选择器（可选）
如果需要自定义哪些元素触发动画，修改 `transition-ripple.js` 中的：
```javascript
const clickables = document.querySelectorAll('你的选择器');
```

---

### 箱子堆叠过场动画

#### 1. 引入文件
```html
<head>
  <link rel="stylesheet" href="transition-effects.css" />
  <script src="effects-manager.js"></script> <!-- 可选，用于资源管理 -->
</head>
<body>
  <!-- 页面内容 -->
  
  <!-- 添加容器 -->
  <div id="transition-overlay" class="transition-overlay" aria-hidden="true">
    <div id="boxes-container" class="boxes-container"></div>
  </div>
  
  <script src="transition-boxes.js"></script>
</body>
```

#### 2. 自动应用
脚本会自动为以下元素添加箱子堆叠效果：
- `.notes-strip` 类的元素
- `.vocab-special-btn` 类的元素

#### 3. 自定义选择器（可选）
修改 `transition-boxes.js` 中的：
```javascript
const links = document.querySelectorAll('你的选择器');
```

---

## 特效参数调整

### 水波纹动画参数

在 `transition-ripple.js` 中可调整：

```javascript
const duration = 1100;        // 动画持续时间（毫秒）
const waveCount = 12;         // 波纹层数（越多越绵密）
const waveDelay = 0.035;      // 层间延迟（越小越连续）
const revealDelay = 0.12;     // 页面显示延迟
```

### 箱子动画参数

在 `transition-boxes.js` 中可调整：

```javascript
const boxSize = 80;           // 箱子大小（像素）
const stackDelay = 30;        // 行间延迟（毫秒）
const colDelay = 15;          // 列间延迟（毫秒）
const floatDuration = 0.6;    // 上飘持续时间（秒）
const jumpDelay = 500;        // 跳转延迟（毫秒）
```

在 `transition-effects.css` 中可调整箱子样式：
```css
.box {
  width: 80px;              /* 箱子宽度 */
  height: 80px;             /* 箱子高度 */
  background: ...;          /* 箱子颜色渐变 */
  border-radius: 8px;       /* 圆角大小 */
}
```

---

## 性能优化

### 使用 Effects 管理器（推荐）

两个特效文件都支持 `effects-manager.js`：

```html
<script src="effects-manager.js"></script>
<script src="transition-ripple.js"></script>
```

优势：
- 自动清理资源
- 防止内存泄漏
- 页面隐藏时停止动画

### 不使用 Effects 管理器

如果不引入 `effects-manager.js`，特效仍然可以正常工作，但不会自动清理资源。

---

## 浏览器兼容性

✅ Chrome/Edge 90+
✅ Firefox 88+
✅ Safari 14+
✅ Opera 76+
✅ 移动端浏览器

---

## 注意事项

1. **水波纹动画**
   - 需要 `<canvas id="ripple-canvas">` 元素
   - 会拦截链接点击事件
   - 使用 iframe 预加载下一页

2. **箱子堆叠动画**
   - 需要 `#transition-overlay` 和 `#boxes-container` 容器
   - 会动态创建大量 DOM 元素
   - 动画完成后自动清理

3. **同时使用两种特效**
   - 可以在同一页面使用
   - 确保选择器不冲突
   - 建议只对不同类型的链接使用不同特效

---

## 示例：完整页面

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>过场动画示例</title>
  <link rel="stylesheet" href="style.css" />
  <link rel="stylesheet" href="transition-effects.css" />
  <script src="effects-manager.js"></script>
</head>
<body>
  <nav>
    <a href="page1.html">页面1</a>
    <a href="page2.html">页面2</a>
  </nav>
  
  <!-- 水波纹画布 -->
  <canvas id="ripple-canvas" aria-hidden="true"></canvas>
  
  <!-- 箱子容器 -->
  <div id="transition-overlay" class="transition-overlay" aria-hidden="true">
    <div id="boxes-container" class="boxes-container"></div>
  </div>
  
  <!-- 引入特效脚本 -->
  <script src="transition-ripple.js"></script>
  <script src="transition-boxes.js"></script>
</body>
</html>
```

---

## 故障排除

### 水波纹不显示
- 检查是否有 `<canvas id="ripple-canvas">` 元素
- 检查 CSS 是否正确引入
- 打开控制台查看错误信息

### 箱子不显示
- 检查是否有 `#transition-overlay` 容器
- 检查选择器是否匹配你的链接
- 确认 CSS 动画关键帧已加载

### 动画卡顿
- 减少波纹层数或箱子数量
- 使用 `effects-manager.js` 优化性能
- 检查设备性能

### 页面不跳转
- 检查链接 href 是否正确
- 查看控制台是否有 JavaScript 错误
- 确认没有其他脚本拦截点击事件

---

## 自定义开发

### 修改颜色主题

水波纹颜色（青绿色系）：
```javascript
// 在 transition-ripple.js 中修改
waveGradient.addColorStop(0, `rgba(120, 210, 195, ...)`);
```

箱子颜色（绿白渐变）：
```css
/* 在 transition-effects.css 中修改 */
.box {
  background: linear-gradient(135deg, 
    rgba(255, 255, 255, 0.9) 0%,
    rgba(你的颜色) 50%,
    rgba(你的颜色) 100%);
}
```

### 添加音效

```javascript
// 在动画开始时播放音效
function startRippleTransition(x, y, targetUrl) {
  const audio = new Audio('ripple-sound.mp3');
  audio.play();
  // ... 其余代码
}
```

---

## 更新日志

### v1.0.0 (2026-02-22)
- 初始版本
- 支持水波纹过场动画
- 支持箱子堆叠过场动画
- 集成 Effects 管理器
- 提供完整样式文件
