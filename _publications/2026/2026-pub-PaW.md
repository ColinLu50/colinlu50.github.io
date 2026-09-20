---
title:          "Policy and World Modeling Co-Training for Language Agents"
date:           2026-06-01 00:01:00 +0800
selected:       true
studio_featured: true
studio_viz:     paw
home_motivation: "RL rollouts already reveal both what to do and what each action causes."
demo_description: "One shared rollout is shown as observation and action tokens. Policy loss trains only the action positions while masking observations; world-modeling loss masks the initial observation-action prefix and trains resulting observations. Both losses update the same policy from the same rollout and forward pass, without extra environment interaction."
pub:            "Conference on Empirical Methods in Natural Language Processing (EMNLP)"
# pub_pre:        "Submitted to "
#pub_post:       'Under review.'
#pub_last:       ' <span class="badge badge-pill badge-publication badge-success">Spotlight</span>'
pub_date:       "2026"

abstract: >-
  The first policy and world-modeling co-training RL framework for LLM agents.
cover:  /assets/images/covers/PaW.png
authors:
  - Ning Lu*
  - Baijiong Lin*
  - Shengcai Liu
  - Jiahao Wu
  - Haoze Lv
  - Yanbin Wei
  - Lingting Zhu
  - Shengju Qian
  - Xin Wang
  - Ying-Cong Chen
  - Qi Wang
  - Ke Tang
links:
  Paper: https://www.alphaxiv.org/abs/2606.02388
  Code: https://github.com/ColinLu50/Policy-WorldModel-Agent
---
