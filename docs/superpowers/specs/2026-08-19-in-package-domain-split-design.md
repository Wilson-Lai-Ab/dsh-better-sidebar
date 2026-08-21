# better-sidebar 包内域切开

**日期**：2026-08-19  
**状态**：已批准，待实施  
**范围**：`dsh-better-sidebar` 单一插件内的目录整理  
**非目标**：不拆独立安装包、不改安装方式、不改运行时行为

## 1. 背景与决定

侧边卡片里的「添加 Tab 插件 / 添加预览插件」是给**外部**扩展用的（Office、划选追问、sentinel）。资源管理器、源代码管理、改动审查、文件搜索都是 **better-sidebar 的内置能力**，和 Explorer / Git 一样不应变成第二个 `dsh plugin add`。

曾考虑把审查做成平级插件 `dsh-sidebar-review`。否决原因：只装审查没有核心则完全不能工作；多一次安装；和「资源管理器也不是独立插件」不一致。

**采纳**：方案 A — 仍发布、仍安装一个 `dsh-better-sidebar`；用目录把最厚的两摊切开，降低后续互相改坏。

## 2. 不能改坏

- 不新建 npm 包，不改 `package.json` 对外 exports
- 不改 tab id：`review` / `explorer` / `git` 仍是内置
- 不改 host 路由语义：`review.get` / `review.put` / `fs.find` / `fs.tree`
- 不改账本路径（会话目录 `review.json`）、打分、搜索一行展示（类名 / `of` 包 / 模块）
- 设置页卡片布局不变；虚线「添加插件」只列外部插件
- `src/index.ts`、`src/client/index.tsx` 仍是组装口，只改 import 路径
- 第一刀不拆 `sidebar.module.css`、`locales.ts`、`TextEditor.tsx`（编辑器继续引用审查域的着色 / Keep / Undo）

## 3. 第一刀切什么

只切审查和资源管理器（含文件名搜索）。Git / 终端 / 浏览器 / 子代理本已相对成块，留待以后。

```
src/review/                 review-document.ts, review-disk.ts
src/explorer/               fs-tree.ts, fs-find.ts, fs-find-match.ts

src/client/review/          ReviewView / ReviewBar / ReviewHunkBar
                            review-*.ts, use-session-edits.ts
                            index.ts（域出口）
src/client/explorer/        ExplorerView.tsx
                            index.ts（域出口）
src/explorer/index.ts       host + client 共用的列出 / 查找 / 展示
```

壳层留下、只改 import：

- `src/index.ts`、`src/client/api.ts`
- `src/client/builtins/tabs.tsx`
- `src/client/TextEditor.tsx`、`src/client/EditorHost.tsx`
- `src/client/Sidebar.tsx`（审查订阅）

测试跟着域走，断言不变：

- `tests/review/review-disk.spec.ts`（自 `tests/review-disk.spec.ts`）
- `tests/explorer/fs-find.spec.ts`（自 `tests/fs-find.spec.ts`）
- `tests/unit.spec.ts` 里审查 / 搜索相关用例只改 import

## 4. Import 与导出

- **域内**：相对路径互引。
- **域外**：只从该域入口进，不深挖内部文件。
  - `src/client/review/index.ts` 再导出：View、Keep/Undo、store 订阅、hunk 着色、`pendingCount`。
  - `src/explorer/index.ts` 再导出：`listDirectory*`、`findFiles`、`presentFindHit`、`FIND_LIMIT_DEFAULT`。
  - `src/client/explorer/index.ts` 再导出：`ExplorerView`。
- **禁止** `src/review` import `src/explorer`，反之亦然。两边都要的 `api.ts`、prefs、locales 留在壳层。
- 不新增对外 npm API。`tsdown` 入口仍是 `src/index.ts` 与 `src/client/index.tsx`。
- `fs-find-match.ts` 保持无 Node 依赖，client 经 `src/explorer` 引用。

## 5. 搬家步骤（实施时）

1. 建目录，`git mv` 文件（保留历史）。
2. 加三个 `index.ts` 再导出。
3. 改壳层 import；修测试 import。
4. `pnpm test`、`pnpm typecheck`、`pnpm build`。
5. 硬刷新后手测：审查列表 / Keep / 着色；资源管理器搜索一行展示。

Host 路由未改语义则不必重启 `dsh web`；若某次误改了 `index.ts` 装配则重启一次。

## 6. 风险与回退

| 风险 | 处理 |
|---|---|
| 漏改 import，构建红 | 以 typecheck / build 为门；不合并红构建 |
| client 误引带 `node:fs` 的 walker | 查找遍历留在 `src/explorer/fs-find.ts`；client 只引 `fs-find-match` / `presentFindHit` |
| 与 `feat/git-staging-sections` 上未提交功能搅在一起 | 本 spec 只约束「搬家」；实施单独提交，不夹带行为改动 |

回退：还原 `git mv` 与 import。无数据迁移。

## 7. 验收

- 单测、typecheck、build 全绿
- 审查：待处理角标、文件级 / hunk Keep-Undo、`review.json`、同轮不重开
- 搜索：文件名模糊、IDE 一行（类名 / `of` 位置 / 模块）、点开仍走现有编辑器
- 仍只需安装 `dsh-better-sidebar`

## 8. 明确不做

- 独立包 `dsh-sidebar-review`
- 仓内 workspace 子包（方案 B）
- 编辑器 gutter 扩展点（拆外挂才需要）
- 第一刀拆 CSS / 文案 / Git / 终端
