---
layout: page
title: Showcases
description: "Marginalia 上的多页 HTML 作品集——独立排版的 deck，不被博客模板包裹。"
permalink: /showcases/
wide: true
---

带版式的多页作品集。每一份都是独立的 HTML deck，不走博客模板。配图均为 deck 实际页面截图。

<section data-filter data-filter-all="全部" data-filter-order="影视 · 导演,Agent · 治理,Claude · LLM,佛经 · 短剧,游戏设计">
<div class="mg-filter-bar" data-filter-chips></div>

<ul class="cover-list" role="list">

<li class="cover-row" data-cats="Claude · LLM">
<a class="cover-media" href="https://ftp.ssbx.site/showcases/opus55-video/"><img src="/assets/img/site/covers/opus55-video.jpg" alt="代码出片 deck 封面：左侧标题与 126 帖、61 支原片等数字，右侧是中英文区作品截帧拼成的马赛克" loading="lazy"></a>
<div class="cover-body" markdown="1">
## 代码出片 · Opus 5.5 发布后五天的中英文区动画

Claude Opus 5.5 在 9 月 22 日发布，之后五天 X 上冒出一大批「模型写代码、逐帧渲染、ffmpeg 编码」做出来的动画。用 Grok 的 X 搜索分两轮抓了英文区 82 条、中文区 44 条，**共 126 条帖子**，逐条回查原帖（125 条在，1 条已删）。

英文区留了三支百万级爆款细讲：157 万浏览的 15 秒动效简历和那句被复制几百遍的提示词，同一台机器上 Opus 对 GPT-6 Astra，241 万浏览的 P(Doom) MV。中文区细讲十一个：宝玉四行提示词出的 12 分钟 Transformer 课，WY 用 1% 周额度做的五千年线稿史，Axton 把 83 秒真人口播改成线稿动画，歸藏把产品片经验写成 skill 一周出四条，92 万浏览、被评「AE 动效设计师天塌了」的 14 秒 UI 形变，海辛的中秋拼贴，还有鹈鹕骑车、雨夜便利店这类 3D 网页。

**61 支原片全长都能在页内播放**，案例页下方镜头条点一下跳到对应时间；末尾四面视频墙按浏览量排好，点任一格弹出大窗放原片。

后半部分是通用工作流、从 $0 到 $3000 的账单图、和别家模型比的证言（结论不一致），以及两边的反对意见：同一句提示词跑出来的片子越来越像，音乐最常被点名，中文区也有人直说「没有提示词和素材，出来的就是廉价版」。

→ [打开 Showcase](https://ftp.ssbx.site/showcases/opus55-video/)

*整理时间：2026-09-27。*

<div class="mg-card-react" data-mg-react data-mode="compact" data-slug="showcase:opus55-video" data-title="代码出片 · Opus 5.5 发布后五天的中英文区动画" data-url="https://ftp.ssbx.site/showcases/opus55-video/"></div>
</div>
</li>

<li class="cover-row" data-cats="游戏设计">
<a class="cover-media" href="/showcases/junqi-ai/"><img src="/assets/img/site/covers/junqi-ai.jpg" alt="四国军棋神经网络 deck 第 13 页：一整局自动复盘，左侧棋盘，右侧胜率曲线与逐手战报" loading="lazy"></a>
<div class="cover-body" markdown="1">
## 四国军棋神经网络

给四国暗棋训练一个神经网络对手的全过程，16 页。数据来自网上散落多年的 **QQ 游戏 .jgs 复盘**：44 个压缩包去重后得到 4151 局，逐手用自家引擎重放校验（69.8 万手，只有 9 处对不上，还顺带揪出一条和 QQ 不一致的炸弹扛旗规则），最后 4049 局、**69 万个局面**进训练集。

局面编码成 130 个 token，每格只写走子方能知道的信息，敌方暗子用排除法缩小成「还可能是哪几种」。模型是一个 **498 万参数**的小 Transformer，家里一张 RTX 5060 Ti 训练 37 分钟。验证集上猜中人类实际走法 35.3%（原来的启发式引擎 9.1%），和旧引擎对下 100 局全胜。

第 13 页是**一整局真实对局的自动复盘**：神经网络执南北、旧引擎执东西，从第一手播到扛下两面军旗，旁边一条胜率曲线实时走，可以点曲线跳到任意一手。开局它被两个司令连吃好几子，胜率估计跌到 10%，后面翻盘。

模型导出 ONNX 后量化到 5.4MB，在浏览器里单线程推理，一手约 30 毫秒。倒数第二页老实写了局限：它现在只是个像人的新手。

→ [打开 Showcase](/showcases/junqi-ai/) · [和它下一局](https://game.panyifeng.xyz/junqi/)

*整理时间：2026-09-24。*

<div class="mg-card-react" data-mg-react data-mode="compact" data-slug="showcase:junqi-ai" data-title="四国军棋神经网络" data-url="/showcases/junqi-ai/"></div>
</div>
</li>

<li class="cover-row" data-cats="影视 · 导演">
<a class="cover-media" href="https://ftp.ssbx.site/showcases/studiobinder-zh/"><img src="/assets/img/site/covers/studiobinder-zh.jpg" alt="导演技巧公开课在线剧场首屏截图：暗调片场主视觉与五个类别卡" loading="lazy"></a>
<div class="cover-body" markdown="1">
## 电影导演技巧公开课 · StudioBinder 中文版

一个在线剧场：把 StudioBinder 频道的导演公开课做成**中文配音 + 中文字幕**版，**154 集 / 28 小时**，按循序渐进的学习序排成五类——**镜头语言**（91 集，从景别角度构图打底，到器材光学、运镜、场面调度、摄影指导个案）、**光色声**（31 集）、**剪辑节奏**（14 集）、**叙事结构**（16 集）、**导演个案研究**。每一类里再按「基础 / 镜头类型 / 专项」等阶段分组，列表直接给缩略图与时长。

结构是**首页 + 类别页**：首页放主视觉、五类总览与「继续观看」；点进任一类才是剧场（播放器 + 该类剧集清单），切换类别时正在播的影片也跟着切过去。

播放器是**重写的，不用浏览器原生控件**：进度条带缓冲区与悬停时间预览、±10 秒、上一集/下一集与播完自动续播、倍速、字幕开关与**四档字幕字号**（随播放器/全屏尺寸自适应）、画中画、全屏、下载（整集 mp4 与中文字幕），键盘 `空格 / ←→ / N·P / F / C` 全覆盖；每集**记住上次看到哪儿**，列表上用一条金色进度线标出看过多少，下次进来直接「继续观看」。视觉走暗调片场：胶片颗粒、暖金与冷青双色光、本地子集化中文衬线标题，零外链。

视频不进任何图床——**从家里 NAS 经内网加密链路直连透传**，页面只做壳。外链托管，跳转打开。

→ [打开 Showcase](https://ftp.ssbx.site/showcases/studiobinder-zh/)

*整理时间：2026-07-26。片源版权归 StudioBinder，本地化仅供学习交流。*

<div class="mg-card-react" data-mg-react data-mode="compact" data-slug="showcase:studiobinder-zh" data-title="电影导演技巧公开课 · StudioBinder 中文版" data-url="https://ftp.ssbx.site/showcases/studiobinder-zh/"></div>
</div>
</li>

<li class="cover-row" data-cats="影视 · 导演">
<a class="cover-media" href="https://ftp.ssbx.site/showcases/bodhi-seedance-principles/"><img src="/assets/img/site/covers/bodhi-seedance-principles.jpg" alt="Seedance 2.0 原理拆解 deck 内页截图：音画同步的时间轴重标定" loading="lazy"></a>
<div class="cover-body" markdown="1">
## 声音是怎么长在画面上的 · Seedance 2.0 原理拆解

28 页技术分享：从第一性原理讲清一台原生音视频生成模型的四件事。**视频生成**——为什么没人直接画像素、VAE 为何决定清晰度天花板、文本只在空间层握手所以运镜比构图难指挥、以及**你写的 prompt 模型根本没看见**（中间隔着一个 Qwen 改写器）。**声音合成**——声音被当成一张窄长的图；它配得上环境不是因为懂声学，而是在拟合 p(声音│画面, 文字)，而现实里画面与声学环境本就物理耦合。**音画同步**——三根钉子：把差 5 倍的两种 token 密度重标定到同一条时间轴、共享同一个去噪 timestep、每一层双向互看；**没有任何损失函数在教它对齐，同步是涌现的**，所以画外音是架构盲区，不是没调好。**导演分镜**——帧内硬切写在架构里，参考图是焊死进张量的硬约束。

先划知识边界再讲原理：**Seedance 2.0 的技术报告 26 页没有方法章节**，架构口径只有一句话，所以每条机制都标明属于「官方事实 / 血缘推定 / 同构类比」哪一档。嵌了 5 张论文官方原图（点击放大），包括 Ovi 那张 RoPE 缩放前后的注意力亲和矩阵——不缩放时亮带斜率全错，缩放后收成一条锐利的对角线，一图说尽「同步的本质是一次单位换算」。键盘翻页，本地字体零外链。外链托管，跳转打开。

→ [打开 Showcase](https://ftp.ssbx.site/showcases/bodhi-seedance-principles/)

*整理时间：2026-07-14。*

<div class="mg-card-react" data-mg-react data-mode="compact" data-slug="showcase:bodhi-seedance-principles" data-title="声音是怎么长在画面上的 · Seedance 2.0 原理拆解" data-url="https://ftp.ssbx.site/showcases/bodhi-seedance-principles/"></div>
</div>
</li>

<li class="cover-row" data-cats="佛经 · 短剧">
<a class="cover-media" href="https://ftp.ssbx.site/showcases/bodhi-e01-making/"><img src="/assets/img/site/covers/bodhi-e01-making.jpg" alt="恒伽达尊者 AI 制作复盘 deck 封面截图" loading="lazy"></a>
<div class="cover-body" markdown="1">
## 一个人，一支「模型剧组」· 恒伽达尊者 AI 制作复盘

30 页制作分享：一个人如何借一套 AI 工具链扮演整支剧组，做出一集 16 分钟的佛经故事电视剧。三部分——**AI 电影导演要练的九种技能**（叙事改编 / 镜头反向设计 / prompt 工程与多模型调度 / 角色一致性管控 / 声音设计 / 工程化追溯 / 成本管控 / 合规 / 跨职能调度）；**从灵感到成片的完整工具链**（剧本 8 件产出 → 人物 face-lock → 道具场景 → 分镜 → Seedance 2.0 三通道视频 → 5 轨声音 → 后期合规）；**E01《恒伽达尊者》真实数据复盘**——122 镜 / 16:40 / ¥1673（视频生成占 90% 成本）/ 838 次工具调用 / 全 AI 零真人，在自建「制片人预览板」dashboard 里逐镜核对。暖金电影调、键盘翻页、本地字体零外链。外链托管，跳转打开。

→ [打开 Showcase](https://ftp.ssbx.site/showcases/bodhi-e01-making/)

*整理时间：2026-06-20。*

<div class="mg-card-react" data-mg-react data-mode="compact" data-slug="showcase:bodhi-e01-making" data-title="一个人，一支模型剧组 · 恒伽达尊者 AI 制作复盘" data-url="https://ftp.ssbx.site/showcases/bodhi-e01-making/"></div>
</div>
</li>

<li class="cover-row" data-cats="Agent · 治理">
<a class="cover-media" href="/showcases/arm/"><img src="/assets/img/site/covers/arm.jpg" alt="ARM deck 封面截图" loading="lazy"></a>
<div class="cover-body" markdown="1">
## 智能体分层治理模型 · ARM

20 页演讲 deck：从 OpenClaw「小龙虾」一夜爆火讲起——拆开它，你已经看见天然的分层；各家 agent 框架百花齐放，却没有一张共同的分层图。于是抛砖引玉，给出一套「分层治理模型」，把眼前乱象逐个**归位**，再用九条原理把它从分类法升级成能解释、能预测的理论；最后回到实践，展示照着这张图搭出的自治 AI 军团（army）。面向大众，术语可悬停看注解，侧边目录 + 键盘翻页。

→ [打开 Showcase](/showcases/arm/)

*整理时间：2026-06-01。*

<div class="mg-card-react" data-mg-react data-mode="compact" data-slug="showcase:arm" data-title="智能体分层治理模型 · ARM" data-url="/showcases/arm/"></div>
</div>
</li>

<li class="cover-row" data-cats="Agent · 治理">
<a class="cover-media" href="/showcases/army-ops/"><img src="/assets/img/site/covers/army-ops.jpg" alt="AI 军团作战看板截图" loading="lazy"></a>
<div class="cover-body" markdown="1">
## AI 军团 · 作战日志看板（LIVE）

一个自治多 agent 软件组织的对外作战日志：人只在飞书点「批准」，其余全自动——PM 分诊 GitHub Issue 并派工、Worker 建独立 worktree 改码开 PR、Auditor 只读审查、Redline 红线守卫在工具调用前确定性拦截。底座 Claude Code 骑 Claude Max，跑在自有 WSL + systemd 真 7×24。页面由执行账本 `runs.jsonl` 自动渲染、脱敏后内联——war-room 终端美学，含端到端闭环 pipeline 图与按角色染色的作战时间线。

→ [打开看板](/showcases/army-ops/)

*整理时间：2026-05-26。*

<div class="mg-card-react" data-mg-react data-mode="compact" data-slug="showcase:army-ops" data-title="AI 军团 · 作战日志看板（LIVE）" data-url="/showcases/army-ops/"></div>
</div>
</li>

<li class="cover-row" data-cats="影视 · 导演">
<a class="cover-media" href="https://ftp.ssbx.site/showcases/ai-director/"><img src="/assets/img/site/covers/ai-director.jpg" alt="AI 时代如何成为导演 deck 封面截图" loading="lazy"></a>
<div class="cover-body" markdown="1">
## AI 时代如何成为导演 · Directing in the Age of AI

面向学生的电影感七页 deck：从传统影视的工种分工（编剧 / 导演 / 摄影 / 美术 / 剪辑 / 声音）出发，过渡到纯 AI 工具做电影的新范式——「指挥人」变「指挥模型」、线性流水线变可重来的循环、成本曲线坍缩。含传统↔AI 角色对照表、技能三象限（替代 / 增强 / 独占）、30 天上手路线图、短片九步拆解与避坑，落到「工具人人有之后，导演的稀缺性回到品味与判断」。配图为即梦 / Gemini 生成的暖金电影调，侧边目录 + 键盘翻页 + 术语悬停。外链托管，跳转打开。

→ [打开 Showcase](https://ftp.ssbx.site/showcases/ai-director/)

*整理时间：2026-06-07。*

<div class="mg-card-react" data-mg-react data-mode="compact" data-slug="showcase:ai-director" data-title="AI 时代如何成为导演" data-url="https://ftp.ssbx.site/showcases/ai-director/"></div>
</div>
</li>

<li class="cover-row" data-cats="影视 · 导演">
<a class="cover-media" href="https://ftp.ssbx.site/showcases/director-masterclass/"><img src="/assets/img/site/covers/director-masterclass.jpg" alt="导演艺术大师课 deck 封面截图" loading="lazy"></a>
<div class="cover-body" markdown="1">
## 导演艺术大师课 · The Director's Craft

七页幻灯，从镜头语言基础到导演思维的完整大师课：六章共 29 个主题——景别 / 运镜 / 蒙太奇 / 构图 / 光影 / 色彩 / 调度 / 风格作者 / 视觉化思维。每章配 AI 生成的电影感剧照背景，第二章带循环运镜视频，全程配 MiniMax 生成的影厅级 BGM（右上角 ♫ 可切换）。影音素材较多，外链托管，跳转打开。

→ [打开 Showcase](https://ftp.ssbx.site/showcases/director-masterclass/)

*整理时间：2026-05-18。*

<div class="mg-card-react" data-mg-react data-mode="compact" data-slug="showcase:director-masterclass" data-title="导演艺术大师课 · The Director's Craft" data-url="https://ftp.ssbx.site/showcases/director-masterclass/"></div>
</div>
</li>

<li class="cover-row" data-cats="佛经 · 短剧">
<a class="cover-media" href="https://ftp.ssbx.site/bodhi/docs/pitch-v2/"><img src="/assets/img/site/covers/bodhi-pitch.jpg" alt="恒伽达尊者 Pitch Deck 封面截图" loading="lazy"></a>
<div class="cover-body" markdown="1">
## 恒伽达尊者 · BODHI 项目 Pitch Deck

S01·E01《恒伽达尊者》立项手册：从《贤愚经》原典出发，七页 deck 覆盖原典 / 剧情 / 佛理 / 人物 / 场景 / 样片——一个"被命运保护得杀不死"的青年最终被前世善业牵回佛前的故事。外链托管，跳转打开。

→ [打开 Pitch Deck](https://ftp.ssbx.site/bodhi/docs/pitch-v2/)

*整理时间：2026-05-09。*

<div class="mg-card-react" data-mg-react data-mode="compact" data-slug="showcase:bodhi-pitch" data-title="恒伽达尊者 · BODHI 项目 Pitch Deck" data-url="https://ftp.ssbx.site/bodhi/docs/pitch-v2/"></div>
</div>
</li>

<li class="cover-row" data-cats="Claude · LLM">
<a class="cover-media" href="/showcases/claude-april-2026/"><img src="/assets/img/site/covers/claude-april-2026.jpg" alt="Claude April 2026 deck 封面截图" loading="lazy"></a>
<div class="cover-body" markdown="1">
## Claude · April 2026

17 页幻灯版本的 Claude 全景速览：从模型代际、产品线、Claude Code 的工程哲学，到 MCP/Skills、企业 RBAC、视频与资源链接。

→ [打开 Showcase](/showcases/claude-april-2026/)

*整理时间：2026-04-30。*

<div class="mg-card-react" data-mg-react data-mode="compact" data-slug="showcase:claude-april-2026" data-title="Claude · April 2026" data-url="/showcases/claude-april-2026/"></div>
</div>
</li>

<li class="cover-row" data-cats="Claude · LLM">
<a class="cover-media" href="/showcases/claude-vs-codex-2026/"><img src="/assets/img/site/covers/claude-vs-codex-2026.jpg" alt="Claude vs Codex 对比 deck 封面截图" loading="lazy"></a>
<div class="cover-body" markdown="1">
## Claude vs Codex · 2026 订阅计划深度对比

单页幻灯：Claude 与 OpenAI Codex 2026 年订阅计划的价格、用量限制、Token / 配额机制、功能特性、性能基准与选择建议。

→ [打开 Showcase](/showcases/claude-vs-codex-2026/)

*整理时间：2026-04-30。*

<div class="mg-card-react" data-mg-react data-mode="compact" data-slug="showcase:claude-vs-codex-2026" data-title="Claude vs Codex · 2026 订阅计划深度对比" data-url="/showcases/claude-vs-codex-2026/"></div>
</div>
</li>

<li class="cover-row" data-cats="Agent · 治理">
<a class="cover-media" href="/showcases/agent-landscape-2026/"><img src="/assets/img/site/covers/agent-landscape-2026.jpg" alt="AI Agent 产品全景 deck 封面截图" loading="lazy"></a>
<div class="cover-body" markdown="1">
## AI Agent 产品全景 · 2026 春

13 页深度横评：中外 28 款主流 AI agent 按 5 条产品线分组对比——终端 CLI、IDE 插件、桌面通用、云端自主 agent、agent 搭建平台。每条线给出选型建议与价格预警。

→ [打开 Showcase](/showcases/agent-landscape-2026/)

*整理时间：2026-04-30。*

<div class="mg-card-react" data-mg-react data-mode="compact" data-slug="showcase:agent-landscape-2026" data-title="AI Agent 产品全景 · 2026 春" data-url="/showcases/agent-landscape-2026/"></div>
</div>
</li>

<li class="cover-row" data-cats="Agent · 治理">
<a class="cover-media" href="/showcases/kiro-2026/"><img src="/assets/img/site/covers/kiro-2026.jpg" alt="Kiro 全景 deck 截图" loading="lazy"></a>
<div class="cover-body" markdown="1">
## Kiro · AWS Agentic IDE 全景

两份独立 deck 看清 Kiro 这款 AWS 推出的 agentic IDE：一份是**全面能力介绍**（单页长卷，覆盖 AI 编码、AWS 集成、前后端 / 数据 / 数据库 / DevOps / 移动 / 测试 / 安全 / 文档 / 多语言支持与工作流），一份是**面向软件工程师的能力深度解析**（SE 视角的结构化拆解）。

→ [打开·全面能力介绍](/showcases/kiro-2026/)　|　→ [打开·SE 深度解析](/showcases/kiro-2026/se/)

*整理时间：2026-04-28。*

<div class="mg-card-react" data-mg-react data-mode="compact" data-slug="showcase:kiro-2026" data-title="Kiro · AWS Agentic IDE 全景" data-url="/showcases/kiro-2026/"></div>
</div>
</li>

<li class="cover-row" data-cats="游戏设计">
<a class="cover-media" href="/showcases/game-ideas-2026/"><img src="/assets/img/site/covers/game-ideas-2026.jpg" alt="20 个单机游戏设计灵感 deck 截图" loading="lazy"></a>
<div class="cover-body" markdown="1">
## 20 个单机游戏设计灵感

互动幻灯：20 个原创单机游戏概念提案，按叙事驱动 / 机制创新等维度分类，每个灵感给出核心玩法、卖点与一句话立意。左右翻页浏览。

→ [打开 Showcase](/showcases/game-ideas-2026/)

*整理时间：2026-04-28。*

<div class="mg-card-react" data-mg-react data-mode="compact" data-slug="showcase:game-ideas-2026" data-title="20 个单机游戏设计灵感" data-url="/showcases/game-ideas-2026/"></div>
</div>
</li>

</ul>
</section>

<script src="{{ '/assets/js/filter.js' | relative_url }}" defer></script>
