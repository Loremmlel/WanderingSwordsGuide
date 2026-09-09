# 再入江湖 · Wandering Swords Guide

《逸剑风云决》二周目剧情路书。不是另一张全收集表，而是把 **新主线、人物支线、DLC 与容易错过的剧情** 串成一条可以边玩边勾选的路线。

## 怎么用

先读「启程之前」，再按左侧章节前进。每条任务先给出地点、下一步行动；涉及截止时间、准备和选择时，会单独提示。点击「展开步骤」查看操作说明，通过「原文」直接跳到原攻略的对应章节与行号。

- **流程路书**：21 个整理章节、161 个条目；按当前分支与是否显示顺路见闻计算进度，不要求每个条目都做。
- **易错过内容**：集中查看需要提前准备、限时完成和做出选择的任务。
- **全路书搜索**：搜索任务、人物和地点；点击结果可回到所在流程，支持中文输入法。
- **路线分支**：默认药圣／商葶苧路线，可切换娜乌、商人／元疆；切换不会删除其它分支进度。
- **旅途札记**：每章独立笔记；完成、跳过分别统计，不把跳过当作完成。
- **原文查阅**：保留上下两篇完整文字与世界地图，并提醒原文仍包含全收集、旧主线和刷结局安排。
- **行囊与进度**：导入、导出 JSON 备份；替换和重置均需确认。本地存储失败、损坏或多标签页冲突会明确提示。

进度只保存在当前浏览器、当前站点来源的 localStorage，不读取游戏存档，不跨设备自动同步。更换浏览器、清理站点数据或换域名前，请先导出备份。所有已加载页面交互在本地执行；这不是带服务工作线程缓存的离线安装包。

## 资料范围与编排原则

资料来自用户提供的 `逸剑风云决全收集攻略.zip`，原文标注 **ver.1.24.32 + 碧海仙踪 + 武家旧事**。本项目不声称该资料覆盖之后所有补丁；原作者署名在收到的材料中未得到可靠确认。

保留影响剧情体验的前置、人物关系、入队要求、任务截止和分歧。移除为开图鉴而故意战败、反复读档、压低好感刷另一结局、大量装备切磋等安排。对不影响后续剧情的见闻单独归为可选，不挤占默认路线。不是保全员、全结局或最短路线的保证书；重要分歧仍建议独立存档。

原攻略 15 张配图中，世界地图压缩为 WebP；其余 14 张切磋／装备索引表不随站点发布，原文相应位置保留说明。完整表格仍在用户的原始 ZIP。原始文本只统一换行符，没有修改措辞；校验值见 `docs/source-provenance.json`。

## 本地开发与构建

使用 Node.js **22.12+**（CI 使用 24），Vue 3 Composition API、TypeScript 和 Vite。

```sh
npm ci
npm run dev
npm run check
npm run build
npm run preview
```

构建产物是 **dist/**，不需要后端或运行时 Node 服务。资源使用相对路径，导航使用 hash，可放在根路径或 `/WanderingSwordsGuide/` 等子目录。请通过 HTTP 静态服务访问，不要直接双击 `index.html` 使用 `file://`。

例如仅使用预构建产物：

```sh
cd dist
python -m http.server 8080
```

## GitHub Pages

在仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。之后推送 main，`Verify and deploy` 工作流会格式检查、类型检查、测试、构建，并在真实 Chromium 下通过子路径访问，再部署 dist。构建失败不会发布。

每次工作流保留可下载的 **site-dist**（静态成品）及 **browser-evidence**（测试报告与截图）；即使未开通 Pages，也可取得构建产物部署到其它静态托管。

也可以将 dist 内容发布到专门的 gh-pages 分支后，选择从该分支根目录部署。不要把源码根目录作为无需构建的静态站点发布。

官方部署参考：<https://vite.dev/guide/static-deploy#github-pages>。

## 验证

```sh
npm run check
python -m pip install -r tests/requirements.txt
python -m playwright install --with-deps chromium
python tests/browser.py
```

测试涵盖内容来源、章节顺序、分支／进度规则、坏备份和未知条目处理；浏览器测试涵盖勾选、跳过、重载、中文输入、搜索、原文失败重试、导入导出、确认弹窗、多标签页冲突、存储故障、320–1440 像素布局与 axe 自动化可访问性扫描。

真实 HTTP 测试在允许浏览器导航的环境执行；沙箱若出现 `ERR_BLOCKED_BY_ADMINISTRATOR`，请使用 GitHub Actions 的测试报告，不能把注入静态页面当作端到端通过。

## 维护入口

`scripts/route.tsv` 定义章节与原文行号，`scripts/editorial.json` 记录剧情优先的人工改写。运行 `python scripts/build-content.py` 可重新生成 `src/data/guide.json`。后者是整理后的路书；`public/source/guide.json` 是原文与章节索引。`src/lib/progress.js` 管理纯业务规则，`src/composables/useProgress.ts` 管理浏览器存储。通用界面组件在 `src/components/`。视觉与行为约定分别见 `DESIGN.md`、`UX-CONTRACT.md`。

修改已有任务时保持稳定 ID，以免破坏用户进度。新增或删除任务后更新内容测试和来源核对；不要把完整收藏要求重新放回默认剧情路线。未确认原作者授权范围，不要给攻略文字与游戏素材擅自附加开源许可。
