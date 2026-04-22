# 校内评分社区网站 MVP 设计文档
> 版本 v1.0 | 技术栈：Next.js + PostgreSQL(Neon) + Prisma + Vercel

---

## 目录
1. [MVP 功能清单（按优先级）](#1-mvp-功能清单)
2. [数据模型与状态机](#2-数据模型与状态机)
3. [API 设计](#3-api-设计)
4. [前端路由与页面职责](#4-前端路由与页面职责)
5. [UML / 用例图 / 时序图（Mermaid）](#5-uml--用例图--时序图)
6. [部署步骤与环境变量](#6-部署步骤与环境变量)
7. [测试计划](#7-测试计划)
8. [课程文档模板大纲](#8-课程文档模板大纲)
9. [5 人团队分工建议](#9-5-人团队分工建议)

---

## 1. MVP 功能清单

### P0 — 必须做（核心演示路径）

| # | 功能 | 数据实体 | API/页面 | 审核可见性影响 |
|---|------|----------|----------|----------------|
| 1 | 邀请码注册 + 登录 | User, InviteCode | POST /api/auth/register, /api/auth/login | 无 |
| 2 | 榜单列表页 | Board, BoardItem | GET /api/boards → /boards | 只展示 Board.status=APPROVED；只展示 item.status=APPROVED 的 BoardItem |
| 3 | 榜单详情页 | Board, BoardItem, Review | GET /api/boards/[id] → /boards/[id] | 同上；Review 跟随 BoardItem 可见性 |
| 4 | 创建榜单（含新增/选择 BoardItem，≥3 个） | Board, BoardItem, BoardBoardItem | POST /api/boards → /boards/new | 创建后进入 PENDING，前台不展示 |
| 5 | 对 BoardItem 评分与可选评论（覆盖更新） | Review | PUT /api/reviews → /boards/[id] 内 | 仅当 BoardItem.status=APPROVED 时可提交与展示 |
| 6 | 管理员审核后台（Board/BoardItem 通过/驳回） | Board, BoardItem, ModerationLog | PATCH /api/admin/boards/[id]/moderate, /api/admin/items/[id]/moderate → /admin | 通过后前台可见；驳回后创建者可重新提交 |
| 7 | 驳回后补传再提交流程 | Board, BoardItem | PATCH /api/boards/[id]/resubmit → /boards/[id]/edit | 仅 REJECTED 状态可编辑并重新提交 |

### P1 — 建议做（演示加分）

| # | 功能 | 说明 |
|---|------|------|
| 8 | 榜单排行/排序（按平均分） | GET /api/boards/[id]?sort=rating |
| 9 | 已有 BoardItem 搜索接口 | GET /api/items?q=keyword，创建榜单时复用 |
| 10 | 个人中心（我创建的榜单/评分历史） | /profile |
| 11 | 图片上传（Supabase Storage） | POST /api/upload → 返回 URL 存入 image_url |
| 12 | 内置示例榜单（seed 脚本） | npx prisma db seed |

### P2 — 第二阶段（小程序/增强）

| # | 功能 | 说明 |
|---|------|------|
| 13 | 微信小程序前端壳 | 复用同一套 REST API，仅重写前端 |
| 14 | 管理员批量审核 | 提高运营效率 |
| 15 | 下架/软删除 | Board.status=ARCHIVED，前台隐藏 |
| 16 | 评论举报 | 用户举报评论，管理员处理 |
| 17 | 通知系统 | 审核结果推送 |

---

## 2. 数据模型与状态机

### 2.1 Prisma Schema

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─────────────────────────────────────────
// 枚举
// ─────────────────────────────────────────

enum Role {
  USER
  ADMIN
}

enum ModerationStatus {
  PENDING   // 待审核
  APPROVED  // 已通过
  REJECTED  // 已驳回
  ARCHIVED  // 已下架（P2）
}

// ─────────────────────────────────────────
// 用户 & 邀请码
// ─────────────────────────────────────────

model User {
  id            String      @id @default(cuid())
  username      String      @unique
  passwordHash  String
  role          Role        @default(USER)
  createdAt     DateTime    @default(now())

  // 邀请关系
  inviteCodeUsed   InviteCode? @relation("UsedBy", fields: [inviteCodeId], references: [id])
  inviteCodeId     String?
  issuedCodes      InviteCode[] @relation("IssuedBy")

  boards           Board[]
  boardItems       BoardItem[]
  reviews          Review[]
  moderationLogs   ModerationLog[]
}

model InviteCode {
  id          String    @id @default(cuid())
  code        String    @unique           // 8位随机字符串
  issuer      User      @relation("IssuedBy", fields: [issuerId], references: [id])
  issuerId    String
  createdAt   DateTime  @default(now())
  isActive    Boolean   @default(true)    // A 方案：单码可重复无限使用
}

// ─────────────────────────────────────────
// 榜单
// ─────────────────────────────────────────

model Board {
  id          String           @id @default(cuid())
  title       String
  description String?
  status      ModerationStatus @default(PENDING)
  isLocked    Boolean          @default(false)  // 审核通过后锁定
  creator     User             @relation(fields: [creatorId], references: [id])
  creatorId   String
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt

  boardItems      BoardBoardItem[]
  moderationLogs  ModerationLog[]

  // 复合索引：只查已通过的 Board
  @@index([status])
}

// ─────────────────────────────────────────
// 榜单内对象
// ─────────────────────────────────────────

model BoardItem {
  id          String           @id @default(cuid())
  name        String
  description String           // 必填：简短描述
  imageUrl    String           // 必填：Supabase Storage URL
  status      ModerationStatus @default(PENDING)
  isLocked    Boolean          @default(false)  // 审核通过后内容锁定
  creator     User             @relation(fields: [creatorId], references: [id])
  creatorId   String
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt

  boards          BoardBoardItem[]
  reviews         Review[]
  moderationLogs  ModerationLog[]

  @@index([status])
}

// ─────────────────────────────────────────
// 榜单 ↔ 对象 多对多关系表
// ─────────────────────────────────────────

model BoardBoardItem {
  board       Board     @relation(fields: [boardId], references: [id])
  boardId     String
  boardItem   BoardItem @relation(fields: [boardItemId], references: [id])
  boardItemId String
  addedAt     DateTime  @default(now())

  @@id([boardId, boardItemId])
}

// ─────────────────────────────────────────
// 评分与评论
// ─────────────────────────────────────────

model Review {
  id          String    @id @default(cuid())
  rating      Float     // 1.0 ~ 5.0，步长 0.5（业务层校验）
  comment     String?   // 可选评论
  user        User      @relation(fields: [userId], references: [id])
  userId      String
  boardItem   BoardItem @relation(fields: [boardItemId], references: [id])
  boardItemId String
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  // 唯一约束：每用户每对象只能有一条 Review
  @@unique([userId, boardItemId])
  @@index([boardItemId])
}

// ─────────────────────────────────────────
// 审核日志
// ─────────────────────────────────────────

model ModerationLog {
  id          String           @id @default(cuid())
  targetType  String           // "Board" | "BoardItem"
  targetId    String
  status      ModerationStatus
  reason      String?          // 驳回原因
  admin       User             @relation(fields: [adminId], references: [id])
  adminId     String
  createdAt   DateTime         @default(now())

  board       Board?     @relation(fields: [boardId], references: [id])
  boardId     String?
  boardItem   BoardItem? @relation(fields: [boardItemId], references: [id])
  boardItemId String?
}
```

### 2.2 状态机说明

#### Board 状态机
```
PENDING ──[管理员通过]──▶ APPROVED（isLocked=true，不可再修改）
PENDING ──[管理员驳回]──▶ REJECTED
REJECTED ──[创建者补传]──▶ PENDING（重新进入队列）
APPROVED ──[管理员下架P2]──▶ ARCHIVED
```

#### BoardItem 状态机
```
PENDING ──[管理员通过]──▶ APPROVED（isLocked=true）
PENDING ──[管理员驳回]──▶ REJECTED
REJECTED ──[创建者补传]──▶ PENDING
APPROVED ──[管理员下架P2]──▶ ARCHIVED
```

#### 前台可见性规则（业务层强制执行）

| 条件 | 前台可见？ |
|------|-----------|
| Board.status = APPROVED | ✅ 榜单可见 |
| Board.status ≠ APPROVED | ❌ 不展示 |
| BoardItem.status = APPROVED **且** 所属至少一个 APPROVED Board | ✅ 对象可见 |
| BoardItem.status ≠ APPROVED | ❌ 不展示（同 Board 下其他通过的正常展示） |
| Review（无需审核） | 跟随 BoardItem 可见性 |

#### 锁定实现方式
- **数据层**：`isLocked=true` 时，API 写操作直接返回 403。
- **业务层**：`PATCH /api/boards/[id]` 与 `PATCH /api/items/[id]` 首先检查 `isLocked`。
- 若必须修改已通过审核的 BoardItem 内容：先将状态切回 `PENDING` 并进入复审，复审通过后再对前台展示生效。

### 2.3 评分精度规则
- 范围：1.0 ~ 5.0
- 步长：0.5（支持半颗星）
- 实现：Float 存储，API 入参校验 `rating % 0.5 === 0 && rating >= 1.0 && rating <= 5.0`
- 均分计算：`AVG(rating)` 在 Prisma 聚合查询中完成，返回保留 1 位小数

---

## 3. API 设计

> 所有接口统一前缀 `/api`，鉴权使用 **JWT（存 httpOnly Cookie）**。
> 管理员接口额外校验 `user.role === 'ADMIN'`。

### 3.1 Auth 模块

```
POST /api/auth/register
  Body: { username, password, inviteCode }
  校验: inviteCode 存在且 isActive=true（A 方案：可重复使用、无限拉新）
  逻辑: 注册成功后为新用户生成一个专属 InviteCode（也可被无限复用）
  Response: { user: { id, username }, token }

POST /api/auth/login
  Body: { username, password }
  Response: { user: { id, username, role }, token }

GET /api/auth/me
  Auth: 从 httpOnly Cookie 读取 JWT
  Response: { id, username, role, myInviteCode }

POST /api/auth/logout
  Response: 200
```

### 3.2 Board 模块

```
GET /api/boards
  Query: ?page=1&limit=20&sort=createdAt|avgRating
  Auth: 可选（未登录也可浏览）
  逻辑: WHERE Board.status=APPROVED，附带通过的 BoardItem 数量与平均分
  Response: { boards: [{ id, title, approvedItemCount, avgRating }], total }

GET /api/boards/[id]
  逻辑: Board.status=APPROVED 才返回；
        boardItems 只返回 status=APPROVED 的；
        每个 boardItem 附带 avgRating, reviewCount
  Response: { board, boardItems: [...], myReviews: [...] }

POST /api/boards
  Auth: 必须登录（USER/ADMIN）
  Body: {
    title, description,
    newItems: [{ name, description, imageUrl }],   // 新增对象
    existingItemIds: ["itemId1", "itemId2"]          // 引用已有对象
  }
  校验:
    - newItems.length + existingItemIds.length >= 3
    - existingItemIds 中每个 item 必须 status=APPROVED（可见对象才可引用）
    - Board.isLocked=false（防重复提交）
  逻辑:
    - 创建 Board(status=PENDING)
    - 创建 newItems 的 BoardItem(status=PENDING)
    - 创建 BoardBoardItem 关联
  Response: { boardId }

PATCH /api/boards/[id]/resubmit
  Auth: 必须是 Board.creatorId
  校验: Board.status=REJECTED，Board.isLocked=false
  Body: { title?, description?, addNewItems?, addExistingItemIds?, removeItemIds? }
  逻辑: Board.status → PENDING；相关驳回 BoardItem → PENDING
  Response: { boardId }
```

### 3.3 BoardItem 模块

```
GET /api/items
  Query: ?q=keyword&status=APPROVED&page=1
  Auth: 可选
  逻辑: 仅返回 status=APPROVED 的对象（创建榜单时选择已有对象用）
  Response: { items: [{ id, name, imageUrl, avgRating }] }

GET /api/items/[id]
  逻辑: 校验 status=APPROVED；返回详情 + Reviews
  Response: { item, reviews, avgRating, reviewCount }
```

### 3.4 Review 模块

```
PUT /api/reviews
  Auth: 必须登录（USER）
  Body: { boardItemId, rating, comment? }
  校验:
    - BoardItem.status=APPROVED 且该对象属于至少一个 Board.status=APPROVED（仅可评分前台可见对象）
    - rating ∈ [1.0, 5.0]，步长 0.5
  逻辑: upsert（userId + boardItemId 唯一），存在则更新 rating/comment/updatedAt
  Response: { review }

GET /api/reviews?boardItemId=[id]
  Auth: 可选
  逻辑: 仅当 BoardItem.status=APPROVED 时返回
  Response: { reviews, avgRating, reviewCount }
```

### 3.5 Upload 模块

```
POST /api/upload
  Auth: 必须登录
  Body: FormData { file }
  逻辑: 转发至 Supabase Storage；返回公开 URL
  Response: { url }
```

### 3.6 Admin 模块（role=ADMIN）

```
GET /api/admin/boards
  Query: ?status=PENDING|APPROVED|REJECTED&page=1
  Response: { boards }

PATCH /api/admin/boards/[id]/moderate
  Body: { action: "approve"|"reject", reason? }
  逻辑:
    - approve → Board.status=APPROVED, Board.isLocked=true
    - reject  → Board.status=REJECTED，记录 ModerationLog(reason)
  Response: { board }

GET /api/admin/items
  Query: ?status=PENDING|APPROVED|REJECTED&page=1
  Response: { items }

PATCH /api/admin/items/[id]/moderate
  Body: { action: "approve"|"reject", reason? }
  逻辑:
    - approve → BoardItem.status=APPROVED, BoardItem.isLocked=true
    - reject  → BoardItem.status=REJECTED，记录 ModerationLog(reason)
  Response: { item }

GET /api/admin/logs
  Query: ?targetType=Board|BoardItem&page=1
  Response: { logs }
```

---

## 4. 前端路由与页面职责

| 路由 | 文件 | 职责 | 可见性处理 |
|------|------|------|-----------|
| `/` | `app/page.tsx` | 首页：精选榜单卡片入口 | 只调用 status=APPROVED 接口 |
| `/boards` | `app/boards/page.tsx` | 榜单列表，支持排序/搜索 | 同上 |
| `/boards/[id]` | `app/boards/[id]/page.tsx` | 榜单详情：只展示 APPROVED BoardItem + 评分区 | Server Component 直接过滤 |
| `/boards/new` | `app/boards/new/page.tsx` | 创建榜单（新增/选择 BoardItem，≥3 验证） | 需登录；提交后跳转"待审核提示" |
| `/boards/[id]/edit` | `app/boards/[id]/edit/page.tsx` | 驳回后重新补传页 | 只有 creatorId=me 且 status=REJECTED 可访问 |
| `/profile` | `app/profile/page.tsx` | 个人中心：我的榜单/评分/邀请码 | 需登录 |
| `/admin` | `app/admin/page.tsx` | 管理员总览 | role=ADMIN，中间件鉴权 |
| `/admin/boards` | `app/admin/boards/page.tsx` | 审核榜单队列 | role=ADMIN |
| `/admin/items` | `app/admin/items/page.tsx` | 审核对象队列 | role=ADMIN |
| `/auth/register` | `app/auth/register/page.tsx` | 邀请码注册 | 未登录 |
| `/auth/login` | `app/auth/login/page.tsx` | 登录 | 未登录 |

**中间件 (`middleware.ts`) 保护规则：**
- `/admin/*` → 校验 JWT + role=ADMIN，否则 302 到 /
- `/boards/new`、`/profile` → 校验 JWT，否则 302 到 /auth/login
- `/boards/[id]/edit` → API 层再校验 creatorId

---

## 5. UML / 用例图 / 时序图

### 5.1 用例图

```mermaid
%%{init: {'theme': 'default'}}%%
graph TB
    subgraph 参与者
        S[👤 学生/老师<br/>普通用户]
        A[🛡️ 管理员]
    end

    subgraph 普通用户用例
        UC1(邀请码注册)
        UC2(登录/登出)
        UC3(浏览榜单列表)
        UC4(查看榜单详情)
        UC5(对BoardItem评分与评论)
        UC6(创建榜单<br/>含新增/选择BoardItem)
        UC7(驳回后补传再提交)
        UC8(查看个人中心)
    end

    subgraph 管理员用例
        UC9(查看待审核队列)
        UC10(审核Board<br/>通过/驳回)
        UC11(审核BoardItem<br/>通过/驳回)
        UC12(查看审核日志)
    end

    S --> UC1
    S --> UC2
    S --> UC3
    S --> UC4
    S --> UC5
    S --> UC6
    S --> UC7
    S --> UC8

    A --> UC2
    A --> UC9
    A --> UC10
    A --> UC11
    A --> UC12

    UC5 -.依赖 BoardItem APPROVED.-> UC4
    UC7 -.前提 Board REJECTED.-> UC6
```

### 5.2 领域类图

```mermaid
classDiagram
    class User {
        +String id
        +String username
        +String passwordHash
        +Role role
        +DateTime createdAt
    }
    class InviteCode {
        +String id
        +String code
        +Boolean isActive
        +DateTime createdAt
    }
    class Board {
        +String id
        +String title
        +String? description
        +ModerationStatus status
        +Boolean isLocked
        +DateTime createdAt
    }
    class BoardItem {
        +String id
        +String name
        +String description
        +String imageUrl
        +ModerationStatus status
        +Boolean isLocked
        +DateTime createdAt
    }
    class BoardBoardItem {
        +String boardId
        +String boardItemId
        +DateTime addedAt
    }
    class Review {
        +String id
        +Float rating
        +String? comment
        +DateTime createdAt
        +DateTime updatedAt
    }
    class ModerationLog {
        +String id
        +String targetType
        +String targetId
        +ModerationStatus status
        +String? reason
        +DateTime createdAt
    }
    class ModerationStatus {
        <<enumeration>>
        PENDING
        APPROVED
        REJECTED
        ARCHIVED
    }
    class Role {
        <<enumeration>>
        USER
        ADMIN
    }

    User "1" --> "0..*" InviteCode : issues
    User "1" --> "0..1" InviteCode : usedBy
    User "1" --> "0..*" Board : creates
    User "1" --> "0..*" BoardItem : creates
    User "1" --> "0..*" Review : writes
    User "1" --> "0..*" ModerationLog : adminActions
    Board "1" --> "1..*" BoardBoardItem
    BoardItem "1" --> "1..*" BoardBoardItem
    BoardItem "1" --> "0..*" Review
    Board "1" --> "0..*" ModerationLog
    BoardItem "1" --> "0..*" ModerationLog
    Board --> ModerationStatus
    BoardItem --> ModerationStatus
    User --> Role
```

### 5.3 时序图一：创建榜单流程

```mermaid
sequenceDiagram
    actor U as 普通用户
    participant FE as Next.js 前端
    participant API as Next.js API Route
    participant DB as PostgreSQL (Prisma)
    actor ADM as 管理员

    U->>FE: 打开 /boards/new
    FE->>API: GET /api/items?status=APPROVED
    API->>DB: query BoardItem WHERE status=APPROVED
    DB-->>API: 已有对象列表
    API-->>FE: items[]
    FE-->>U: 展示"选择已有对象"列表

    U->>FE: 填写 title + 新增3个BoardItem（可混合选已有）
    U->>FE: 上传图片 (必填)
    FE->>API: POST /api/upload (file)
    API->>API: 转发至 Supabase Storage
    API-->>FE: { url }

    U->>FE: 点击"提交审核"
    FE->>API: POST /api/boards { title, newItems, existingItemIds }
    API->>API: 校验 newItems.length + existingItemIds.length >= 3
    API->>DB: INSERT Board(status=PENDING)
    API->>DB: INSERT BoardItem[](status=PENDING) for newItems
    API->>DB: INSERT BoardBoardItem[]
    DB-->>API: boardId
    API-->>FE: { boardId }
    FE-->>U: "提交成功，等待审核"

    Note over ADM,DB: 管理员审核流程
    ADM->>FE: 打开 /admin/items
    FE->>API: GET /api/admin/items?status=PENDING
    API->>DB: query BoardItem WHERE status=PENDING
    DB-->>API: pendingItems[]
    API-->>FE: items[]
    ADM->>FE: 点击"通过" 或 "驳回(填原因)"
    FE->>API: PATCH /api/admin/items/[id]/moderate { action, reason? }
    API->>DB: UPDATE BoardItem.status = APPROVED/REJECTED, isLocked=true
    API->>DB: INSERT ModerationLog
    DB-->>API: ok

    ADM->>FE: 打开 /admin/boards
    ADM->>FE: 点击"通过"榜单
    FE->>API: PATCH /api/admin/boards/[id]/moderate { action: "approve" }
    API->>DB: UPDATE Board.status=APPROVED, isLocked=true
    API->>DB: INSERT ModerationLog
    DB-->>API: ok
    API-->>FE: { board }
    FE-->>ADM: 榜单已通过，前台可见

    Note over U,DB: 创建者补传（驳回场景）
    U->>FE: 收到驳回通知，打开 /boards/[id]/edit
    FE->>API: GET /api/boards/[id] (带 creatorId=me)
    API-->>FE: { board: status=REJECTED, rejectedItems, reason }
    U->>FE: 修改被驳回内容并重新提交
    FE->>API: PATCH /api/boards/[id]/resubmit { ... }
    API->>DB: UPDATE Board.status=PENDING; BoardItem.status=PENDING
    DB-->>API: ok
    API-->>FE: 重新进入审核队列
```

### 5.4 时序图二：评分覆盖更新与可见性

```mermaid
sequenceDiagram
    actor U as 普通用户
    participant FE as Next.js 前端
    participant API as Next.js API Route
    participant DB as PostgreSQL (Prisma)

    U->>FE: 打开 /boards/[id]
    FE->>API: GET /api/boards/[id]
    API->>DB: query Board WHERE status=APPROVED
    API->>DB: query BoardItem WHERE boardId=[id] AND status=APPROVED
    API->>DB: query Review JOIN BoardItem(status=APPROVED)
    DB-->>API: board + approvedItems + reviews
    API-->>FE: { board, boardItems, myReview? }
    FE-->>U: 展示榜单（只有 APPROVED 的 BoardItem）

    U->>FE: 对某 BoardItem 拖动星级（1.0~5.0, step=0.5）
    U->>FE: 可选填写评论文本
    U->>FE: 点击"提交评分"

    FE->>API: PUT /api/reviews { boardItemId, rating, comment }
    API->>DB: SELECT BoardItem WHERE id=boardItemId AND status=APPROVED
    alt BoardItem 不存在或未通过
        API-->>FE: 403 "对象不可见或未通过审核"
    else BoardItem APPROVED
        API->>DB: UPSERT Review ON CONFLICT(userId, boardItemId)\n  DO UPDATE SET rating, comment, updatedAt
        DB-->>API: { review }
        API->>DB: SELECT AVG(rating), COUNT(*) WHERE boardItemId
        DB-->>API: { avgRating, reviewCount }
        API-->>FE: { review, avgRating, reviewCount }
        FE-->>U: 实时刷新星级均分与评论
    end

    Note over U,DB: 用户再次修改评分
    U->>FE: 修改星级为新值
    FE->>API: PUT /api/reviews { boardItemId, rating: newValue, comment }
    API->>DB: UPSERT（唯一约束 userId+boardItemId 触发 UPDATE）
    DB-->>API: 覆盖更新成功
    API-->>FE: { review: updatedAt=now }
    FE-->>U: 评分已更新
```

---

## 6. 部署步骤与环境变量

### 6.1 技术选型确认

| 层 | 选择 | 理由 |
|----|------|------|
| 前端+后端 | Next.js 14 (App Router) + Vercel | 零配置部署，API Route 复用 |
| 数据库 | **Neon** PostgreSQL | Serverless 兼容 Vercel，免费额度够 MVP |
| ORM | Prisma | 类型安全，迁移方便 |
| 图片存储 | **Supabase Storage** | S3 兼容，免费 1GB，公开 URL 稳定 |
| 鉴权 | JWT + httpOnly Cookie (jose) | 简单可控，小程序阶段替换为 Bearer Token |

### 6.2 本地开发启动

```bash
# 1. 克隆项目
git clone <repo>
cd campus-rating

# 2. 安装依赖
npm install

# 3. 复制环境变量
cp .env.example .env.local

# 4. 初始化数据库
npx prisma migrate dev --name init

# 5. 种入示例数据
npx prisma db seed

# 6. 启动
npm run dev
```

### 6.3 环境变量清单

```env
# .env.local / Vercel Environment Variables

# ── 数据库 (Neon) ──
DATABASE_URL="postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require"
# Neon 提供 Connection Pooling URL（Serverless 模式必须用）
DATABASE_URL_UNPOOLED="postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require"

# ── JWT ──
JWT_SECRET="your-256-bit-random-secret"
JWT_EXPIRES_IN="7d"

# ── Supabase Storage ──
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="eyJ..."   # 服务端使用，不暴露给前端
SUPABASE_STORAGE_BUCKET="board-images"

# ── 应用 ──
NEXT_PUBLIC_APP_URL="https://your-domain.vercel.app"
ADMIN_INIT_PASSWORD="changeme123"    # 初始管理员密码（seed 脚本用）
```

### 6.4 Neon 配置建议

```
1. 创建 Neon 项目 → 获取 Connection String
2. Vercel Marketplace 中直接集成 Neon（自动注入 DATABASE_URL）
3. Prisma schema datasource 使用 ?sslmode=require
4. 生产环境 migrate：
   npx prisma migrate deploy   # (非 dev，不 reset)
   在 Vercel Build Command 中加入：
   "build": "prisma generate && prisma migrate deploy && next build"
```

### 6.5 Supabase Storage 配置

```
1. 创建 Supabase 项目 → Storage → 新建 Bucket: "board-images"（Public）
2. 设置 RLS Policy：允许 Service Role 上传
3. 上传后 URL 格式：
   https://xxx.supabase.co/storage/v1/object/public/board-images/{filename}
4. 在 /api/upload 中使用 @supabase/supabase-js 的 storage.from().upload()
```

### 6.6 Prisma 生产注意事项

```bash
# 生产不要用 migrate dev（会 reset），用：
npx prisma migrate deploy

# 生成客户端（Vercel 构建时必须）
npx prisma generate

# 回滚：Neon 控制台可以时间点恢复（PITR）
```

---

## 7. 测试计划

### 7.1 关键测试点

| # | 测试点 | 方式 | 期望结果 |
|---|--------|------|---------|
| T1 | 创建榜单：newItems + existingItemIds < 3 | API 单测 | 返回 400 "至少需要3个对象" |
| T2 | 创建榜单：混合 2 新增 + 1 已有 = 3 | API 单测 | 200，Board 创建成功 |
| T3 | Board.status=PENDING 时 GET /api/boards 不返回该 Board | 集成测试 | boards[] 中无该 Board |
| T4 | BoardItem.status=REJECTED，同 Board 中其他 APPROVED 正常展示 | 集成测试 | boardItems 只有 APPROVED 的 |
| T5 | 评分：rating=3.5（合法半星） | API 单测 | 200，Review 保存成功 |
| T6 | 评分：rating=3.3（非法） | API 单测 | 400 "评分需为0.5的倍数" |
| T7 | 同一用户对同一 BoardItem 二次评分 | API 单测 | 第二次 upsert 覆盖，Review 条数仍为 1 |
| T8 | 对 BoardItem.status=PENDING 的对象评分 | API 单测 | 403 "对象不可见" |
| T9 | 邀请码注册：合法邀请码 | 集成测试 | 注册成功，可用邀请码可继续用于邀请，新用户获得新邀请码 |
| T10 | 邀请码注册：非法/禁用邀请码 | 集成测试 | 400 "邀请码无效" |
| T11 | 链式邀请：A邀请B，B邀请C | 集成测试 | C 注册成功，InviteCode.issuerId=B |
| T12 | Board 审核通过后 PATCH /api/boards/[id] 修改内容 | API 单测 | 403 "榜单已锁定" |
| T13 | 图片上传：合法 JPG < 5MB | 集成测试 | 返回 Supabase URL |
| T14 | 图片上传：非图片文件 | 集成测试 | 400 "仅支持图片格式" |
| T15 | 管理员驳回 BoardItem，返回 reason 字段 | 集成测试 | ModerationLog 有 reason 记录 |
| T16 | 非管理员访问 /api/admin/* | 集成测试 | 403 Forbidden |
| T17 | BoardItem 审核通过后直接修改内容 | API 单测 | 403 "对象已锁定，需走复审流程" |
| T18 | BoardItem 修改触发复审 | 集成测试 | 状态变更为 PENDING，复审通过后前台展示更新内容 |

### 7.2 工具建议

```
单元测试: Jest + @prisma/client Mock（prisma-mock 或 vitest）
API 集成测试: Supertest + 测试数据库（单独 Neon branch）
E2E: Playwright（P1，覆盖创建→审核→评分主流程）
```

---

## 8. 课程文档模板大纲

```
《校内评分社区网站》需求规格说明书

1. 项目概述
   1.1 背景与目标
   1.2 用户角色与权限矩阵
   1.3 术语定义（Board / BoardItem / Review / ModerationStatus）

2. 功能需求
   2.1 MVP 功能清单（P0/P1/P2 三级）
   2.2 功能详细描述
       2.2.1 邀请码注册与链式裂变
       2.2.2 榜单创建规则（≥3对象、同页提交、引用已有）
       2.2.3 管理员审核流程与驳回补传
       2.2.4 评分规则（半星、唯一覆盖更新）
       2.2.5 前台可见性规则（部分通过展示）

3. 非功能需求
   3.1 性能（列表页 < 1s，详情页 < 2s）
   3.2 安全（JWT、SQL 注入防护、图片格式校验）
   3.3 可扩展性（API 复用于微信小程序）

4. UML 图
   4.1 用例图（5.1节）
   4.2 领域类图（5.2节）
   4.3 时序图：创建榜单（5.3节）
   4.4 时序图：评分覆盖更新（5.4节）
   4.5 状态机图（Board / BoardItem ModerationStatus）

5. 数据模型
   5.1 ER 图
   5.2 Prisma Schema（字段级说明）
   5.3 可见性规则汇总表

6. API 清单
   6.1 Auth 模块
   6.2 Board 模块
   6.3 BoardItem 模块
   6.4 Review 模块
   6.5 Admin 模块
   6.6 Upload 模块

7. 前端路由清单
   7.1 路由表
   7.2 可见性处理说明

8. 测试计划
   8.1 测试点清单（见第7章）
   8.2 测试工具与环境

9. 部署方案
   9.1 技术选型依据
   9.2 环境变量清单
   9.3 部署步骤

10. 团队分工（见第9章）

附录 A：邀请码生成算法
附录 B：图片上传流程图
附录 C：Prisma Migration 命令速查
```

---

## 9. 5 人团队分工建议

> 负责人（你）承担架构与整体协调，可不分配具体模块开发任务。

| 成员 | 职责 | 交付物 | 可追溯贡献 |
|------|------|--------|-----------|
| **负责人** | 架构设计、Prisma Schema、API 规范、评审与合并 | schema.prisma、API 文档、README | PR Review 记录、架构文档 |
| **成员 B** | 后端：Auth + InviteCode 模块 | `/api/auth/*`、InviteCode 生成/校验、JWT 中间件 | Git commits in `/app/api/auth` |
| **成员 C** | 后端：Board + BoardItem + Review 模块 | `/api/boards/*`、`/api/items/*`、`/api/reviews` | Git commits in `/app/api/boards` |
| **成员 D** | 后端：Admin 模块 + Upload 接口 | `/api/admin/*`、`/api/upload`、ModerationLog | Git commits in `/app/api/admin` |
| **成员 E** | 前端：普通用户页面（首页/列表/详情/创建/评分） | `/boards/*`、`/auth/*`、`/profile` | Git commits in `/app/(user)` |
| **成员 F（可选）** | 前端：管理后台页面 + 部署配置 | `/admin/*`、Vercel 配置、seed 脚本 | Git commits in `/app/admin` |

> **注**：若为严格 5 人团队，成员 E 与 F 合并，前端整体由一人负责；后端由 B/C/D 三人负责；负责人做架构+文档+PR Review。

### 模块边界说明

```
后端接口完成后，用 Postman Collection 或 OpenAPI YAML 文档化，
前端按文档对接，减少耦合。

建议工作流：
1. 负责人确认 Schema → migrate dev
2. 后端各自开发对应 API Route + 单测
3. 前端用 mock data 先完成页面，再对接真实 API
4. 统一在 /docs/api.md 维护 API 变更记录
```

---

## 附录 A：邀请码生成算法

```typescript
// lib/inviteCode.ts
import { customAlphabet } from 'nanoid'
const nanoid = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 8)

export async function createInviteCode(issuerId: string, prisma: PrismaClient) {
  const code = nanoid() // e.g. "K7MNPQ3X"
  return prisma.inviteCode.create({
    data: { code, issuerId }
  })
}

export async function validateAndUseInviteCode(
  code: string,
  newUserId: string,
  prisma: PrismaClient
) {
  const invite = await prisma.inviteCode.findUnique({ where: { code } })
  if (!invite || !invite.isActive) throw new Error('邀请码无效或已禁用')

  await prisma.user.update({
    where: { id: newUserId },
    data: { inviteCodeId: invite.id }
  })

  // 为新用户生成一个新邀请码（链式裂变）
  await createInviteCode(newUserId, prisma)
}
```

---

## 附录 B：图片上传流程

```
前端 → FormData → POST /api/upload
API Route（服务端）:
  1. 读取 file Buffer
  2. 校验 MIME type（image/jpeg|png|webp|gif）
  3. 生成唯一文件名：${cuid()}.${ext}
  4. supabase.storage.from('board-images').upload(filename, buffer)
  5. 获取 publicURL 返回给前端
  6. 前端将 URL 存入 newItem.imageUrl 字段，随 POST /api/boards 提交
```

---

*文档生成时间：2025 | 版本 v1.0*
