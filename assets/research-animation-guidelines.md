# Research demo animation guidelines

> 本文档是 Home 页论文卡片的设计约束。目标不是制造“抽象的科技感”，而是让每个动画在数秒内回答三个问题：原方法哪里失效、论文改变了哪个变量、为什么结果因此改变。

## 1. 两个参考案例真正有效的部分

### Anthropic：一个持续存在、逐步长出的因果场景

参考：[When AI builds itself](https://www.anthropic.com/institute/recursive-self-improvement)

- 全程复用同一个场景。新阶段增加角色、节点或连接，旧状态以弱化形式保留，观众可以直接比较“刚才”和“现在”。
- 每一步只引入一个新的因果关系；路径先画出，节点随后出现，结果最后稳定下来。
- 当前阶段最清楚，已完成阶段降饱和但不消失，未来阶段不抢注意力。
- 镜头只为展示新增关系而移动；动画本身服从叙事，不作为背景装饰。
- 生长动画具有确定规则和固定随机种子，运动来自系统状态变化，而不是无意义粒子。

### Thinking Machines：把时间、同步与空白都变成可读变量

参考：[Interaction Models](https://thinkingmachines.ai/blog/interaction-models/)，尤其是 “Time-aligned micro-turn based”。

- 时间是固定横轴，不同输入、输出和模型状态放在严格对齐的 lane 中。
- 竖直 playhead 同时穿过所有 lane，因此先后、重叠、沉默和延迟一眼可见。
- 坐标系不动，事件在正确时间格中出现；空白也是信息，而不是必须填满的区域。
- 首次进入视口播放一次，完成后停在完整结论；用户可以 replay，且 reduced-motion 直接看到最终状态。
- 控件、标签和 tooltip 都在解释时间或状态，没有与论文无关的视觉元素。

## 2. 统一设计原则

1. **先展示矛盾，再展示方法。** 开场必须有一个可见的错误基线或缺失信号。
2. **保持同一个场景。** 阶段切换只改变必要对象，不整屏换图。
3. **一次只改变一个因果变量。** 每个 beat 都能用一句“因为 X 改变，所以 Y 发生”解释。
4. **让时间可见。** 用 playhead、phase rail 或离散时间格表达顺序；不用永远循环的漂浮点。
5. **保留比较依据。** 旧位置、被拒候选或错误结果以淡色残影存在。
6. **坐标必须有语义。** 位置、长度、线宽、颜色分别绑定明确变量，不能只为构图服务。
7. **直接标注。** 标签贴近对象，优先用论文中的准确术语；卡内不塞长公式。
8. **颜色只编码状态。** 同一颜色在五张卡中含义尽量稳定。
9. **结论必须停住。** 动画结束后保留信息最完整的最终帧至少 1–1.5 秒，并一直停留。
10. **静态状态也要成立。** reduced-motion、截图和低性能设备仍能读懂核心关系。

## 3. 动画语法

| 元素 | 语义 | 使用约束 |
| --- | --- | --- |
| Stage | 持续存在的因果场景 | 不在阶段间清空 |
| Lane | 同一时间轴上的不同信号 | 纵向严格对齐 |
| Playhead | 当前因果时刻 | 同时穿过相关 lane |
| Node | 方法中的实体或状态 | 进入后保留 |
| Path | 因果传递 | 先画路径，再显示结果 |
| Trace | 旧状态或被拒选择 | 低饱和、仍可比较 |
| Gauge / threshold | 连续量或预算 | 使用固定尺度 |
| Phase rail | 故事进度 | 3–5 个短阶段名 |

统一播放规则：

- 推荐总时长 `6.0–7.0s`，每个 micro-state `450–700ms`。
- 进入视口首次播放一次；离开视口暂停；结束停在最终帧。
- 提供小型 `Replay` 控件，键盘可操作。
- hover / touch 可以按横向位置 scrub；不要求用户 scrub 才能理解。
- `prefers-reduced-motion` 直接渲染最终帧，不播放开场错误基线。
- 动画使用确定性的时间函数，不使用随机漂浮。

## 4. 视觉系统与卡片约束

- 所有论文复用 `_includes/widgets/research_demo.html`：独立标题栏 + Replay + 图示区。
- 标题来自 `_data/research_demos.yml`，使用同一套全大写、小字号、灰色加粗样式。
- Replay 始终使用相同图标、文字、32px 高度、边框、圆角和焦点样式；手机端也保留文字。
- panel 最小高度由 `--research-demo-height: 260px` 统一管理。标题自然换行，不能覆盖按钮。
- 绘图区域由 `research-panel.js` 统一缩放。新 Konva 场景使用 `y=0..188`；兼容层将旧 Canvas 的 `y=32..220` 映射到同一内容区。
- 论文专属 CSS 只能设置主题变量，禁止另写标题、按钮、间距和媒体查询覆盖。
- 使用平面背景。浅色为默认，SICO 的深色主题通过同一组主题变量实现。
- 建议语义色：
  - cobalt：policy / utility / selected update
  - teal：world signal / verified / accepted / repaired
  - coral：risk / stale / rejected / missing signal
  - amber：history / detector / budget warning
  - violet：shared model / cached prior / prompt
- 正文标签视觉字号不低于约 `10px`；移动端不低于 `9.5px`。
- 同屏永久标签控制在 6–9 个；公式只保留最短、最关键的一条。
- 画面只保留解释论文机制的标签；图形性质与来源写在无障碍说明中，不添加通用页脚标注。
- 每张图必须在无动画截图中仍能看出：输入、关键变化、结论。
- Canvas/SVG 的高 DPI、ResizeObserver、IntersectionObserver 和无障碍文本都必须保留。

## 5. 五篇论文的因果故事板

### PaW — 一条 rollout，两个训练信号

论文：[Policy and World Modeling Co-Training for Language Agents](https://arxiv.org/html/2606.02388v1)

核心问题：标准 agentic RL rollout 已经产生 `o_t → a_t → o_{t+1}`，但通常只用 action 与 reward 更新策略，下一观察中“动作造成了什么”被浪费。

故事：一条共享的 `Obs 0 / Act 0 / Obs 1 / Act 1 / … / Obs T` trajectory 先按列出现。上方 `Policy loss` mask observation columns，仅在 action columns 显示 flame-shaped train marks；下方 `World modeling loss` 把初始 `Obs 0 + Act 0` 合并为一个 mask，训练 resulting observations 并 mask 中间 action。两条 lane 保留到最后，在宽图合流为同一个 policy update。

最少标签：`Policy loss`、`Mask`、`World modeling loss`、`Shared policy`。

视觉变量：横向位置=同一次 rollout 的 token 位置；soft clay/blue cells=action/observation；flame=train；rounded muted mask=不被该 loss 监督。CMAE、entropy gate 与 reward balancing 是论文的次要机制，刻意不放入这个紧凑场景。

最终句：**The same transition teaches which action works and what that action does.**

### HIVE: the moving edge, with selection before rollout

Source: [Train at the Moving Edge, sections 2-3](https://arxiv.org/html/2603.25184v2).

The main story is **target medium difficulty → policy changes → history becomes stale
→ prompt entropy corrects selection before rollout**. Keep a fixed `Easy / Medium /
Hard` horizontal scale with a faint central `Medium` band. Two rows show the **same
prompts**: `History` and `Current policy`. During the policy update, lower-row dots
move toward easier positions while the historical row stays in place. Some historical
favorites visibly leave the medium band. Prompt entropy then fades those stale choices
and selects the currently useful medium-difficulty candidates.

- The history shortlist is broad and retains exploration candidates. Historical
  filled marks illustrate the previous preference, not an extra Stage-1 top-k gate.
- Online verification takes the upper half by current prompt entropy **within the
  shortlisted pool only**; the median is computed from that pool.
- Difficulty coordinates and entropy scores are independent illustrative inputs.
  Do not turn prompt entropy into an exact difficulty estimator or a universal
  entropy-versus-difficulty curve. The paper's edge also requires high uncertainty.
- `Policy changes`, `History is stale`, and `Correct with prompt entropy` appear in
  one changing caption. The final caption is `Select current medium`.
- Keep the common Replay, backward scrub, final frame and reduced-motion behavior.
- Diagram context lives in `demo_description`; on-canvas labels focus on the mechanism.
- Reuse existing nodes and one layer; no new library, particle system or draw loop.

### Is PRM Necessary?: one model, two developing capabilities

Source: [Is PRM Necessary?, section 3.3 and Figure 1](https://arxiv.org/html/2505.11227v2).

Two directly labeled traces (`Solve`, `Judge`) grow along the same outcome-only
RL training axis, with a qualitative `Capability` vertical axis. The panel title is
`SOLVING BUILDS JUDGMENT`, kept on one line. Keep the supervision description in
the accessible text. The dashed trace
can develop earlier than the solid trace: process judgment is not simply a delayed
copy of answer accuracy. Remove the arithmetic cards and the solve-equals-judge sign.

- These are **qualitative, illustrative** trends, not digitized measurements.
- The vertical positions do not numerically compare accuracy with ProcessBench F1.
- The final frame retains the curves, their direct labels and axes, with no cautionary caption.
- Self-PRM reranking is outside this small panel's scope; the central finding gets
  the entire scene instead of competing with a second mechanism.

Both panels use flat light fields, fine lines, a restrained accent, and few labels.
All five panel headings use the shared HTML header and CSS: uppercase, muted text,
weight 720, the same font size, and the same upper-left alignment. No renderer draws
its own heading or controls.
The chart reference was [Lieflat Charts](https://github.com/larashero3-dotcom/lieflat-charts):
F2 Hairline Line and F8 Plumb Scatter were inspected for direct labels, fixed axes,
and restrained marks. L11 Trend Lineage encodes event histories, so it is not a fit
for these mechanisms. All five scenes use static Konva nodes mutated by paused GSAP timelines.
This is visual reference,
not a template-based report or an installed skill.

### Safe Delta — 按安全预算选择参数更新，再修复残余损伤

论文：[Safe Delta](https://arxiv.org/pdf/2505.12038)

核心问题：不同 fine-tuning 数据导致的 safety degradation 不同，固定 defense strength 要么安全不够，要么过度牺牲 utility。

故事：左侧恢复 4×4 圆角 `ΔW` 参数格；每个 cell 内的蓝色 utility bar 与 muted-red safety-cost bar 保留原始相对值。selection 依 greedy order 依次描出五个蓝色边框并弱化其余 cell。右侧仅有两根 live metric bars：SFT 让两者升高；selection 后 Utility 维持高度，Safety loss 降低，淡色 SFT ghost 保留原高度作为参照。

最少标签：`ΔW`、`SFT`、`Utility`、`Safety loss`、`Base / SFT / Select / Safe Delta`。

视觉变量：cell 内双 bar=各 delta 的 utility/safety-cost；blue outline=greedy selected；右侧 bar height=定性 metric state。残余 compensation 是 accessible description 的机制，因此图不承诺零损伤。

最终句：**Keep the useful updates that fit the safety budget, then repair the residual damage.**

### SICO — 固定语义，用 detector feedback 优化可复用 demonstration

论文：[SICO](https://arxiv.org/pdf/2305.10847)

核心问题：detector 依赖可变化的表面统计，而语义可以保持不变；直接放入未经优化的人类示例并不足以显著改变生成分布。

故事：顶部是 `Example → Detector` 的小循环。detector 的 `AI score` meter 随 2–3 个 amber sentence/word edits 缩短，return path 标注 `Rewrite`。底部把同一个 amber example 迁入 `Prompt`，与新 `Input` 合并后经过 `LLM` 生成新的 `Text`。

最少标签：`Example`、`Detector`、`AI score`、`Rewrite`、`Prompt`、`Input`、`LLM`、`Text`。

视觉变量：amber edits=接受的 example revisions；meter length=detector feedback；相同 amber strokes=同一 example 被复用。该图专指 SICO-Gen，不表示对最终输出逐篇改写。

最终句：**Keep meaning fixed, optimize the demonstration, and reuse the resulting prompt.**

## 6. 明确禁止的模式

- 与方法无关的泡泡、星点、漂浮粒子、呼吸光斑。
- 把论文画成若干对称方框和移动光点的通用 pipeline。
- 所有阶段同时出现，或每阶段整张图换掉。
- 用纯颜色代替应该由位置、长度或线宽表达的连续变量。
- 不同候选使用不同尺度的 score gauge。
- 标签小于可读尺寸、公式堆满卡片、只靠 hover 才能理解。
- 无限自动循环，导致读者永远看不到稳定结论。
- 过度声称：尤其不能把 Self-PRM 画成完美 verifier。

## 7. 验收清单

- [ ] 3 秒内能看出错误基线或被遗漏的信号。
- [ ] 每个动画 beat 都能写成明确的“因为 → 所以”。
- [ ] 位置、长度、线宽、颜色各自绑定固定变量。
- [ ] 旧状态有残影，最终结论稳定停留。
- [ ] 永久标签不超过 9 个，移动端仍可读。
- [ ] 动画只播放一次，并提供 Replay。
- [ ] reduced-motion 直接呈现最终态。
- [ ] Canvas/SVG 在 DPR 2 下清晰，resize 后不变形。
- [ ] aria-label 准确概括论文动机和图中结论。
- [ ] 截图状态无需动画也能讲清核心思想。

## 8. 已验证的「共享对象 + 对齐监督」方法

这一方法适合解释：同一份序列、轨迹或数据，在基线中只训练一部分信号，而新方法复用它来增加另一种监督。PaW 的首页动画是当前标准实现。

### 信息结构

1. **只保留一个共享对象。** 中间只画一条 trajectory：`Obs 0 → Act 0 → Obs 1 → Act 1 → … → Obs T`。后续阶段不得复制或重画第二条 trajectory，否则会误导读者以为方法需要额外 rollout。
2. **监督 lane 与 trajectory 单元严格对齐。** `action loss` 只在 action 列出现有效信号；`observation loss` 只在 observation 列出现有效信号。火焰标记表示参与训练，`Mask` 表示该 token 在这一目标下未被监督；world-modeling lane 的初始 observation-action prefix 合并为一个 mask。
3. **先基线、后增量。** 开场显示 trajectory；随后只点亮标准 RL 的 action lane；最后在完全相同的横向位置加入 observation lane。旧 lane 保留，新增 lane 成为当前焦点。
4. **标签与 lane 同步出现。** `Policy loss` 放在上方 lane 外侧，`World modeling loss` 放在下方 lane 外侧；新增 loss 之前不提前显示其标签。宽图最终用两条曲线汇入 `Shared policy update`。
5. **最终帧回答一个句子。** 读者无需播放动画，也应能看出：同一条 rollout 同时训练「采取什么动作」与「动作后世界如何变化」。

### 何时不使用 playhead

- 对齐 lane 不等于一定需要竖直 playhead。
- 只有当论文结论依赖实时同步、延迟、重叠或 micro-turn 时，playhead 才承担真实语义。
- 如果图要表达的是「哪些位置收到哪些 loss」，固定列对齐已经足够；竖线会错误暗示当前时刻、扫描过程或额外因果关系。
- PaW 因此不使用贯穿 `Obs / Act` trajectory 的竖线。动画进度由单元逐步显露和 lane 高亮表达。

### 视觉语言

- 采用暖白或浅纸色画布、深色正文、低饱和语义色和充足留白。
- trajectory 单元使用平面色块，不使用发光、气泡、漂浮粒子、网格背景或装饰性连线。
- action 与 observation 使用两种稳定颜色；颜色只编码 token 类型或监督类型，不承担装饰作用。
- inactive 单元仍保留轮廓，使「没有训练」成为可比较的信息，而不是把它从图中删除。
- 公式区弱于图形主叙事，但字号必须在卡片与移动端都可读。

### 阶段验收

- 约 30% 进度：只能看到 trajectory 与标准 RL 的 action supervision。
- 约 70% 进度：observation supervision 与对应公式出现，原 action lane 仍保留。
- 最终帧：共享 trajectory、两条 loss lane 与同一个 policy update 同时成立。
- `prefers-reduced-motion` 直接显示最终帧。
- 桌面和窄屏都不得产生横向溢出；Original 模式的历史论文卡片不复用这一 demo。

## 9. 公共组件与论文实现的边界

- **数据**：`_data/research_demos.yml` 存标题，每篇论文 front matter 的
  `demo_description` 提供无障碍说明。正文内容不由组件生成。
- **外壳**：`_includes/widgets/research_demo.html` 与 `assets/css/research-demos.css`
  统一标题栏、Replay、内容区、尺寸、留白、焦点和主题变量。
- **行为**：`assets/js/research-panel.js` 的 `ResearchPanel` 统一管理首次入场播放、
  重播、离屏/后台暂停、最终帧、scrub、reduced-motion 实时切换、DPR、resize 和销毁。
- **场景**：`assets/js/research-scenes.js` 中的 Konva 场景实现
  `create({ Konva, gsap, root, width, height, theme }) → { timeline, render }`。
  `timeline` 必须初始暂停；`render` 将 timeline 驱动的状态应用到已有节点。
  使用具名阶段和 GSAP 缓动，不在新场景中复制 `phase(progress, start, end)`。
  `research-demos.js` 只注册全部五个 Konva 场景。
  场景不能创建按钮、观察器、计时器或独立动画循环。
- **加载**：`research-loader.js` 在 panel 距视口 500px 内才加载共享库和场景；
  并发请求复用同一 Promise。只有开启 `research_demos` 的页面引入 loader。
  Konva 10.5.0 与 GSAP 3.15.0 的官方浏览器发行文件保存在项目 `vendor` 下，
  保留版权、许可说明和 npm 完整性校验记录，无全局安装或新增构建框架。
- **运行成本**：每个 Konva panel 只有一个 `listening: false` 图层；
  依靠 Konva 自动合并绘制，GSAP 只驱动播放中的场景。离屏/后台暂停，完成停住，
  不添加 Konva.Animation 或第二套 requestAnimationFrame 循环。DPR 上限为 2。
  resize 时释放旧节点与 timeline，并恢复原进度；destroy 释放资源。
- **页面接入**：Home 和 Studio 只 include 同一个模板。Studio 的年份放在论文信息中，
  Paper 链接放在原有链接区；不能用链接包住带 Replay 按钮的整个 panel。

新增论文：在数据表中添加标题，注册一个 Konva 场景，设置 `studio_viz` 和无障碍说明；
需要新配色时只增加主题变量。无需复制标题、按钮或播放逻辑，也无需写页面专属适配。

验证：`node --test tests/research-panel.test.cjs tests/research-loader.test.cjs` 使用实际 GSAP 时间轴，覆盖按需加载、请求去重、失败重试、独立重播、暂停恢复、最终帧、
动态 reduced-motion、scrub 恢复、DPR/resize、重复挂载和销毁。Jekyll 构建后核对
Home 与 Studio 的 5 个 panel 都有相同外壳，且按钮不嵌套在链接内。
