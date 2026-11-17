# Human validation still required

Automated checks and synthetic AI runs do not establish that this is a validated career assessment. The RIASEC-inspired tags and generated options need teacher/counsellor review.

Before student trials, resolve the provider's audience terms and arrange the school's/parent's appropriate permissions. This document does not record any completed trials or endorsements.

## Content review

- Have a teacher or counsellor review every starter option tag in `src/profile.js`.
- Review whether generated scenario choices are equally appealing and genuinely reflect their labelled interests. Structural validation only ensures there are six unique choices and six trait keys; it cannot establish semantic validity.
- Review the equal 2-point first choice / 1-point second choice budget. Split-tag options intentionally divide that budget: a first choice tagged R and I gives 1 point to each. A second choice tagged only I also gives 1 point to I. This conserves the total budget and is a design decision, not a validated weighting.
- Check the opportunity normalisation and broad/sparse thresholds against trial data. Equal theoretical maxima do not remove every form of bias.

## Usability sessions

For each grade band (5–7, 8–10, 11–12), observe five or six students. Keep recruitment and notes outside this app. Do not collect identifiers in developer logs.

Record where wording is misunderstood, how students interpret first/second choice, whether they can remove or change ranks, whether six generated options feel overwhelming, completion time, and what they think the report claims. Test keyboard, screen-reader and small-screen use with people who use those tools.

## Retake comparison

Invite willing participants to repeat a week later under the same conditions. Compare normalised trait scores, close-score uncertainty and leading areas. AI generates different scenarios for a new session, so distinguish wording variation from actual interest changes. Inspect examples with large changes; do not assume a changed ranking means the student changed.

## Current evidence

See `npm test`, `npm run test:e2e` and CI. Browser tests use an explicitly injected fake generator to be repeatable and avoid external quota. Real-provider smoke tests use anonymous synthetic answers separately. Automated accessibility scanning does not replace screen-reader usability testing.
