```
# 🌟 校内评分社区 Web UI 设计与开发规范 (Cursor System Prompt)

## 1. 项目约束与业务逻辑 (核心红线，不可违背)
- **项目定义**: 校内评分社区（Web端，PC优先，响应式兼容Mobile）。MVP阶段，要求极简科技风、高信噪比。
- **角色权限**: 分为「普通用户(学生/老师)」与「管理员」。普通用户不可见、不可访问 `/admin` 路由（需做拦截）。
- **榜单逻辑**: 用户可创建榜单（Board），但创建时必须包含 >= 3 个评价对象（Item）。
- **审核逻辑**: 榜单(Board) 和 对象(Item) 需管理员审核通过后前台可见。**评分(Rating)行为不需要审核**。
- **评分规则**: 支持 1.0 ~ 5.0 分，步长 `0.5` 分。同一用户对同一对象只能有一条评分（再次评分视为**覆盖更新**）。

---

## 2. 设计系统与 CSS Tokens (请直接应用于全局样式)
请将以下 CSS 变量应用到 `global.css` 或 `tailwind.config.js` 中。不要使用花哨的渐变，依靠高对比度和留白区分层级。

​```css
:root {
  /* 基础色彩 Base Colors */
  --pk-bg-base: #F8FAFC;       /* 页面大背景 Slate 50 */
  --pk-bg-surface: #FFFFFF;    /* 卡片/弹窗背景 */
  
  /* 品牌与状态色彩 Brand & Status */
  --pk-primary: #2563EB;       /* 核心交互色 Blue 600 */
  --pk-primary-hover: #1D4ED8; /* 悬停色 Blue 700 */
  --pk-accent: #10B981;        /* 榜单Top3高亮/极高分 Emerald 500 */
  --pk-star-active: #F59E0B;   /* 星星激活色 Amber 500 */
  --pk-star-bg: #E2E8F0;       /* 星星底色 Slate 200 */
  
  --pk-status-success: #059669; /* 成功/已评 Green 600 */
  --pk-status-warning: #D97706; /* 审核中 Amber 600 */
  --pk-status-error: #DC2626;   /* 报错/删除 Red 600 */

  /* 文本系统 Typography */
  --pk-text-main: #0F172A;     /* 标题/正文 Slate 900 */
  --pk-text-sub: #475569;      /* 描述/副标题 Slate 600 */
  --pk-text-muted: #94A3B8;    /* 占位符/时间/不可用 Slate 400 */
  
  /* 边框与投影 Borders & Shadows */
  --pk-border: #E2E8F0;
  --pk-radius-sm: 4px;         /* 表单/按钮，偏直角体现科技感 */
  --pk-radius-md: 8px;         /* 卡片/下拉框 */
  --pk-radius-lg: 12px;        /* 模态框 */
  
  /* 极简阴影：抛弃重阴影，用细边框+轻微弥散阴影 */
  --pk-shadow-card: 0 1px 3px 0 rgba(15, 23, 42, 0.05);
  --pk-shadow-float: 0 10px 15px -3px rgba(15, 23, 42, 0.08);
  
  --pk-transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
```

------



## 3. 核心组件开发规格 (Component Specs)

### 3.1 评分星星组件 (RatingControl)

- **Props**: value (0-5), readonly (boolean), onChange (function).
- **交互逻辑**: 必须支持 **0.5步长**。
  - 实现方式要求：使用 SVG 渲染 5 颗星。
  - 在非 readonly 状态下，监听 mousemove 事件。
  - 获取鼠标在当前星星容器内的相对 X 坐标 (offsetX)。
  - 如果 offsetX < width / 2，则当前星亮一半 (例如 3.5 分)；否则全亮 (4.0分)。
- **UI 联动**: 星星右侧需实时展示当前悬停的大字号分数（如：大写粗体 3.5 + 对应文案辅助，如"还不错"）。

### 3.2 热门榜单卡片 (HotBoardCard)

- **容器结构**: border: 1px solid var(--pk-border); border-radius: var(--pk-radius-md);
- **Header**: 榜单名称 (text-main, 16px, Bold) + 参与人数。
- **Body**: 灰色底色区块 (bg-slate-100, p-3)，使用 Flex 布局列出 Top 3 的 Item 及其均分。
- **悬停动画**: Hover 时触发 transform: translateY(-2px) 及 --pk-shadow-float。

### 3.3 对象评分列表项 (ItemRatingCard)

- **布局规则**: Flex Row 布局，底部带 1px 分割线，列表内联。
- **排版**:
  - 左侧：排名标识 (宽度固定 40px，1/2/3名用特定颜色)。
  - 中间：名称 (text-main, 18px, Bold) + 描述 Tags (text-sub, 12px)。
  - 右侧1：大字号均分 (--pk-primary, 24px) + 评分总人数。
  - 右侧2（操作区）：
    - **状态A (未评)**：显示 Primary 按钮 [去打分]。
    - **状态B (已评)**：显示 Outline 按钮 [我的评分: 4.5]，文字颜色为 --pk-status-success。点击均唤起覆盖评分弹窗。

------



## 4. 页面级结构与响应式规则

### 4.1 响应式断点策略

请在开发时遵循 Mobile First，并在以下断点做调整：

- **>= 1200px (Desktop)**: 核心内容区域 max-width: 1152px 居中。首页采用 Grid 3-4列。榜单详情页采用 左右分栏 (Main 8 : Sidebar 4 栅格)。评分弹窗为居中 Dialog。
- **768px ~ 1199px (Tablet)**: 首页 Grid 2列。榜单详情 Sidebar 沉到底部。
- **< 768px (Mobile)**: width: 100%。首页单列。顶导变为汉堡菜单。评分交互由弹窗(Dialog)改为**底部抽屉(Bottom Sheet)**。

### 4.2 核心页面布局指南

1. **首页 (Home)**:
   - 顶部：文字驱动的极简 Banner + 全局搜索框。
   - 主体：瀑布流或网格排列的 HotBoardCard。
2. **榜单详情 (Board Detail)**:
   - Header：榜单元信息展示（标题、创建者、总评价数）。
   - 左侧 Main 区：向下排布的 ItemRatingCard 列表。
   - 右侧 Sidebar：图表统计信息展示。
3. **创建榜单 (Create Board Form)**:
   - 采用分步或左右布局。**强制校验**：必须成功添加至少 3 个 Item 到列表后，底部的“提交审核”按钮才从 Disabled 变为可用状态。

------



## 5. 通用交互与状态机 (State Guidelines)

- **Hover**: 按钮和卡片需有明显的亮度/位移变化反馈。
- **Focus**: 表单 Input 获取焦点时，边框变为 --pk-primary，且外加 3px 的浅色 outline (box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2)以确保无障碍访问)。
- **Loading**:
  - 页面/组件加载时，优先使用 **骨架屏 (Skeleton)** 占位，而非转圈。
  - 按钮提交时（如发送评分），文字变为 Loading Spinner，且处于 Disabled 状态防止重复提交。
- **表单校验反馈**: 在 Input 下方预留 20px 高度用于显示绝对定位的红色错误提示语，避免报错时引起页面抖动。

------



> **致 Cursor / AI**: 当读取到本文件后，在生成后续 React/Vue 组件、Tailwind 类名、或原生 CSS 样式时，请务必严格应用上述颜色变量、圆角尺寸以及组件结构逻辑。避免生造无关的样式和动画。