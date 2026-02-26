# JSON Schema Contract (MVP)

## Request Schema

Path: `docs/schemas/analysis-request.schema.json`

Required fields:

- `sourceText`: 80-1200 chars.
- `platform`: `douyin | xiaohongshu`
- `tone`: `rational | emotional | storytelling`
- `audienceLevel`: `beginner | intermediate`

## Output Schema

Path: `docs/schemas/analysis-output.schema.json`

Top-level fields:

- `verticalId`
- `sourceMeta`
- `structure`
- `scoring`
- `template`
- `rewriteScript`

The `scoring.dimensions` array enforces explainability with:

- `dimension`
- `weight`
- `score`
- `evidenceSpan`
- `improveAdvice`

The final `totalScore` must be calculated in backend by formula, not trusted directly from model text.

## Formula

Version: `v1-weighted-five-dim`

`totalScore = sum(weight_i * score_i)`

Weights:

- hookStrength: 0.25
- narrativeProgression: 0.20
- valueDensity: 0.20
- credibilityEvidence: 0.15
- ctaEffectiveness: 0.20
