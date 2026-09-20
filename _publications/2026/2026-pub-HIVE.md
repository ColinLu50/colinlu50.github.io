---
title:          "Train at the Moving Edge: Efficient RL for Large Reasoning Models via Rollout Selection"
date:           2026-03-15 00:01:00 +0800
selected:       true
studio_featured: true
studio_viz:     hive
demo_description: "Schematic: target prompts of medium difficulty for the current policy. The same prompts are shown under historical estimates and the updated policy. Some historically favored prompts become easy as the policy improves. HIVE keeps a broad history-informed candidate pool, including exploration, then uses current-policy prompt entropy to reject stale candidates before rollout. Filled lower-row points show the corrected selection. Difficulty positions and entropy scores are illustrative; prompt entropy verifies uncertainty rather than measuring difficulty exactly."
home_motivation: "Useful prompts move as the policy learns; selection should move with them."
# pub:            "Conference on Neural Information Processing Systems (NeurIPS)"
# pub_pre:        "Submitted to "
pub_post:       'Under review.'
#pub_last:       ' <span class="badge badge-pill badge-publication badge-success">Spotlight</span>'
pub_date:       "2026"

abstract: >-
  The first online policy-verified data selection framework for efficient RL training.  
cover:  /assets/images/covers/HiVE.png
authors:
  - Jiahao Wu*
  - Ning Lu*
  - Shengcai Liu
  - Kun Wang
  - Yanting Yang
  - Li Qing
  - Ke Tang
links:
  Paper: https://arxiv.org/pdf/2603.25184
#  Code: https://github.com/ColinLu50/SafeDelta
---
