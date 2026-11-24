---
title:          "Large Language Models can be Guided to Evade AI-generated Text Detection"
date:           2024-05-12 00:01:00 +0800
selected:       true
studio_featured: true
studio_viz:     sico
home_motivation: "AI detectors can depend on writing cues that prompts learn to manipulate."
demo_description: "A SICO-Gen schematic: an unoptimized example starts with high AI score above the detector threshold. Proxy detector feedback guides word-level substitutions and sentence paraphrasing to one in-context example while keeping its meaning fixed, stepping its AI score below threshold. The optimized same example is then reused in a prompt with a new input so the LLM directly generates human-like text below the detection threshold without per-output rewriting."
pub:            "Transactions on Machine Learning Research (TMLR)"
# pub_pre:        "Submitted to "
# pub_post:       'Under review.'
#pub_last:       ' <span class="badge badge-pill badge-publication badge-success">Spotlight</span>'
pub_date:       "2024"

abstract: >-
  Showing that LLMs themselves can evade AI detectors with fine-grained prompting.
cover: /assets/images/covers/sico.jpg
authors:
  - Ning Lu
  - Shengcai Liu
  - Rui He
  - Qi Wang
  - Yew-Soon Ong
  - Ke Tang
links:
  Paper: https://arxiv.org/pdf/2305.10847
  Code: https://github.com/ColinLu50/Evade-GPT-Detector=
---
