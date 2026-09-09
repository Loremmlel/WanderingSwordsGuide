---
version: alpha
colors:
  paper: '#f1f4f5'
  surface: '#ffffff'
  ink: '#233841'
  muted: '#60717a'
  pine: '#285953'
  pine-light: '#e6efeb'
  night: '#213e46'
  line: '#dce4e7'
  gold: '#8e6024'
  gold-light: '#f7f0e4'
  danger: '#a3413e'
  danger-light: '#fbefeb'
  scroll-thumb: '#a2b5bb'
  scroll-track: '#eef2f4'
  scroll-hover: '#68898c'
  scroll-active: '#285953'
typography:
  body:
    fontFamily: '"PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", system-ui, sans-serif'
  display:
    fontFamily: '"Songti SC", "STSong", "Noto Serif CJK SC", SimSun, serif'
rounded:
  panel: '10px'
spacing:
  sidebar: '246px'
components:
  task-card:
    backgroundColor: '{colors.surface}'
    color: '{colors.ink}'
---

## Overview

这是中文武侠游戏二周目玩家放在游戏旁边的流程工具，不是营销首页。像一本在山中行旅时随身翻阅的路书：左侧深松色章回索引，中间明亮而紧凑的任务时间线，右侧是出发前提醒与札记。序号必须表达真实流程顺序，不作无意义装饰。

独特之处集中在「章节书脊＋路标时间线」；山形只留在低干扰页眉，不放大幅游戏人物、动效背景或阻碍阅读的水墨纹理。不能变成全收集仪表盘、黑金游戏商城或铺满警报色的表格。

## Colors

采用 **Model B：src/style.css 的 :root 为运行时唯一 token 作者层**。上面的 colors 逐项映射同名 `--变量`，组件通过变量消费；`tests/design.test.mjs` 校验记录没有漂移。更改长期色彩决策必须在同一提交同步本文件与 CSS。

松绿表达当前路线与完成，暖金只用于行动前需要注意的条件，暗红只用于删除／重置／错误；文字与图标同时表达含义，不单凭颜色。背景是冷灰雾色，不用仿旧黄纸。

## Typography

正文使用系统中文无衬线，章节标题使用宋体回退。没有外部字体请求，也不打包字体。正文行动说明手机和宽屏不低于 14px；任务标题 16px，章节标题 26–32px。较小尺寸仅用于原文行号、来源、计数等辅助信息。中文行高约 1.9–2，长名称换行，不用省略号隐藏关键条件。

映射：`typography.body → --font-body`，`display → --font-display`。系统字体缺失时依次回退，不依赖字体加载实现布局。

## Layout

桌面主导航为 246px 书脊（1280px 下收至 226px），阅读区域使用自然文档滚动。宽屏任务与札记分栏；1180px 以下提醒移到任务上方，札记在后；920px 以下章节目录进入可键盘操作的对话框。390px 与 320px 保留全部操作而不是隐藏按钮。

页眉紧凑，继续阅读始终是一项实质导航。正文先地点，再行动，细节主动展开。原文查阅与风险列表保持同一个外壳、搜索和进度语义。

## Elevation & Depth

任务卡以浅边框分隔，无悬浮翻转或装饰性强阴影。浮层仅在真正的模态对话框使用背景遮罩。toast 固定于视口，不改变文档排版；图片预留尺寸，侧栏数量使用等宽数字。

## Shapes

`rounded.panel → --radius`，普通面板 10px，输入和微型标签略小。控制器要有明确可点击外观；选区、键盘焦点和完成状态相互独立。

## Components

TaskCard 统一任务标题、状态、展开细节、前置链接、原文入口与跳过操作。AppDialog 统一所有模态操作。ChapterNav 复用于桌面与手机，手机不是另一份简化信息源。SourceReader 渲染为转义文本，不执行原始 Markdown/HTML。

全局滚动条映射 `scroll-* → --scroll-*`，新滚动区域自动继承。减弱动效偏好取消平滑与过渡，高对比模式保留系统颜色。选中、悬浮、焦点均应可分辨，不能通过颜色区分唯一状态。

## Do's and Don'ts

优先让玩家知道「现在去哪里、先做什么、推进后会失去什么机会」。不要把所有任务渲染成紧急警告，不把正文藏进 tooltip，不让鼠标悬浮改变当前进度，不用浏览器原生 alert/confirm/prompt，不把跳过统计为已完成。任何视觉修订都要查看桌面、手机与打开的设置弹窗，并重新跑自动化对比度检测。
