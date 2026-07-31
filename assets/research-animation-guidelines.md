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

- 逻辑画布：约 `720 × 210`；桌面高度约 `220px`，移动端约 `205px`。
- 背景采用暖黑/石墨色的编辑式平面；允许非常轻的区域光，不使用泡泡、星点或点阵纹理。
- 主文字：暖白；次要文字：中性灰。
- 建议语义色：
  - cobalt：policy / utility / selected update
  - teal：world signal / verified / accepted / repaired
  - coral：risk / stale / rejected / missing signal
  - amber：history / detector / budget warning
  - violet：shared model / cached prior / prompt
- 正文标签视觉字号不低于约 `10px`；移动端不低于 `9.5px`。
- 同屏永久标签控制在 6–9 个；公式只保留最短、最关键的一条。
- 每张图必须在无动画截图中仍能看出：输入、关键变化、结论。
- Canvas/SVG 的高 DPI、ResizeObserver、IntersectionObserver 和无障碍文本都必须保留。

## 5. 五篇论文的因果故事板

### PaW — 一条 rollout，两个训练信号

论文：[Policy and World Modeling Co-Training for Language Agents](https://arxiv.org/html/2606.02388v1)

核心问题：标准 agentic RL rollout 已经产生 `o_t → a_t → o_{t+1}`，但通常只用 action 与 reward 更新策略，下一观察中“动作造成了什么”被浪费。

故事：

1. rollout 时间轴生成 `obs → action → next obs`；基线只接走 action，`next obs unused` 变灰。
2. 同一 transition 分成两条监督 lane：全部 action 进入 `RL`；高 action entropy 的 transition 经 `top-α` 选择后，其 next observation 进入 `WM · CMAE`。
3. CMAE 用 token 状态显示“低概率噪声梯度被封顶、高置信 token 停止更新”，而不是笼统地删除噪声。
4. `RL` 与 `WM · CMAE` 汇入同一个 `policy πθ`，明确没有额外模型和额外 rollout。
5. 回报 gauge 改变 `λ=1−R̄/Rmax`，只改变 WM lane 的线宽；更新反馈回下一轮 rollout。

最少标签：`rollout`、`H(aₜ|hₜ)`、`top-α`、`RL`、`WM · CMAE`、`λ=1−R̄/Rmax`、`same policy πθ`。

视觉变量：横向位置=交互时间；stem 高度=action entropy；饱和/halo=是否入选；线宽=`λ`；空心/封顶 token=CMAE 状态。

最终句：**The same transition teaches which action works and what that action does.**

### HIVE — 在昂贵 rollout 之前追踪移动的学习边缘

论文：[Train at the Moving Edge](https://arxiv.org/html/2603.25184v2)

核心问题：prompt utility 不是固定属性。随着 policy 变强，真正有梯度的中等难度、高不确定样本会移动；只靠历史统计会变 stale，并把 rollout 浪费在 zero-variance prompt 上。

故事：

1. 固定散点坐标中，current learning edge 与历史候选带起初重合。
2. policy 更新后 current edge 向更难区域移动，历史带留在旧位置；旧候选落到阈值下并显示 `stale`，其昂贵 rollout 分支淡去。
3. `Stage 1 · history` 用 reward trajectory 与 response entropy 做便宜的宽候选带。
4. `Stage 2 · online verify` 由当前 policy 的 prompt entropy 更新候选纵向位置；`γₜ median` 只保留线上样本。
5. 只有 teal survivors 生成 rollout 并进入 `GRPO`；新 reward 与 response entropy 回写 history。

最少标签：`easy`、`learning edge`、`hard`、`history: reward + response H`、`current Vₜ(x)`、`γₜ median`、`rollout`、`GRPO`。

视觉变量：x=当前难度；y=current prompt entropy；amber=历史候选；teal=当前验证；coral ring=stale；rollout 分支=昂贵计算。

最终句：**History narrows cheaply; current-policy entropy catches the edge before rollout.**

### Is PRM Necessary? — outcome RL 同时长出解题与过程判断能力

论文：[Is PRM Necessary?](https://arxiv.org/html/2505.11227v2)

核心问题：显式 process labels 是否是过程判断能力的必要来源？论文观察到纯 outcome RL 在提高解题能力时，也诱导出可观的 PRM 能力。

故事：

1. 开场显示常见假设：`process labels → PRM`；随后将 labels 标为 absent，只保留 final outcome reward。
2. 一条 RL training playhead 从左向右推进；同一模型上两条对齐曲线分别表示 `solve` 与 `process judgment`，后者随训练共同上升。
3. 多条 candidate reasoning path 从同一问题展开；外部 PRM 路径变成弱残影，表示它对强 reasoning model 的 rerank 帮助有限。
4. 同一个模型切换为 `Self-PRM`，用内部 reward 对自己的路径排序，选中的路径回到主 lane。
5. 最终保留一个明确 caveat：对最难问题，self-judgment 仍可能出现 false positive，不能画成完美 verifier。

最少标签：`outcome reward only`、`solve ↑`、`process judgment ↑`、`same model`、`Self-PRM`、`rerank`、`hard-case FP`。

视觉变量：同一横轴=RL training time；两条曲线=能力共同演化；路径位置=候选；回到主 lane=被选中；coral outline=错误自信。

最终句：**Outcome-only RL improves solving and implicitly induces process judgment in the same model.**

### Safe Delta — 按安全预算选择参数更新，再修复残余损伤

论文：[Safe Delta](https://arxiv.org/pdf/2505.12038)

核心问题：不同 fine-tuning 数据导致的 safety degradation 不同，固定 defense strength 要么安全不够，要么过度牺牲 utility。

故事：

1. 同一个 `Static defense` 作用于不同 `D_sft`：一侧 risk 越过阈值，另一侧 utility 明显缩水。
2. 从 `W_orig + D_safe` 计算并固定 `H⁻¹ once`；随后不重算。
3. fine-tune 产生 `ΔW`，utility 与 risk 同时上升；每个 delta cell 由 `H⁻¹` 得到 safety cost 与 `rₘ`。
4. cells 按 `rₘ` 排序，playhead 逐个接纳；累计 cost 在 `ΣδL<ε` 前停止。
5. mint compensation `C` 只进入未选位置，形成 `W_sd = W_orig + M⊙ΔW + C`。

最少标签：`Static`、`D_sft`、`H⁻¹ once`、`ΔW`、`rₘ`、`ΣδL<ε`、`+C`、`W_sd`。

视觉变量：左右位置=`rₘ` 排名；bar 长度=累计 safety cost；固定线=`ε`；cobalt=selected；coral=risk；mint=未选位置 compensation。

最终句：**Keep the useful updates that fit the safety budget, then repair the residual damage.**

### SICO — 固定语义，用 detector feedback 优化可复用 demonstration

论文：[SICO](https://arxiv.org/pdf/2305.10847)

核心问题：detector 依赖可变化的表面统计，而语义可以保持不变；直接放入未经优化的人类示例并不足以显著改变生成分布。

故事：

1. 原始 AI output 在固定 `P_AI` gauge 上得分高；raw human example 只轻微移动 gauge，显示失败基线。
2. 从 AI/Human pairs 提取 `t_feature`，在固定 meaning anchor 下初始化 `y_ic`。
3. word-level 与 sentence-level substitution 交替发生；每轮 2–3 个候选使用同一 gauge 评分。
4. 最低 `P_AI` 候选回到中央主 lane，其他候选成为 coral 残影；`U(p)` 上升并更新 best `p*`。
5. 最终 prompt stack 为 `feature + task + optimized example`；新 input 生成 output，detector 仅以虚线 evaluation probe 出现。

最少标签：`AI / Human`、`t_feature`、`y_ic`、`word`、`sentence`、`P_AI↓`、`keep min`、`U(p)↑`、`p*`。

视觉变量：统一 gauge 位置=`P_AI`；返回主 lane=greedy selection；gold lock=语义固定；coral=rejected；teal=accepted；violet=最终 prompt。

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

1. **只保留一个共享对象。** 顶部只画一条 trajectory：`Obs 0 → Act 0 → Obs 1 → Act 1 → … → Obs T`。后续阶段不得复制或重画第二条 trajectory，否则会误导读者以为方法需要额外 rollout。
2. **监督 lane 与 trajectory 单元严格对齐。** `action loss` 只在 action 列出现有效信号；`observation loss` 只在 observation 列出现有效信号。空白或短横线表示该 token 在这一目标下未被监督。
3. **先基线、后增量。** 开场显示 trajectory；随后只点亮标准 RL 的 action lane；最后在完全相同的横向位置加入 observation lane。旧 lane 保留，新增 lane 成为当前焦点。
4. **公式与 lane 同步出现。** 每条公式放在对应 lane 的右侧或相邻区域。新增 observation loss 之前，不提前显示 world-modeling 公式。
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
- 最终帧：共享 trajectory、两条 loss lane 和两条公式同时成立。
- `prefers-reduced-motion` 直接显示最终帧。
- 桌面和窄屏都不得产生横向溢出；Original 模式的历史论文卡片不复用这一 demo。
