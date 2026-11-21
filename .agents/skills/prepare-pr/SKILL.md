# Prepare a pull request

Use this skill when preparing or updating a PR. It produces a reviewable title
and description independently of publication. Follow the general
[verification evidence rules](../../../docs/engineering.md#verification-evidence).

The workspace PR helper is `npm run pr:merge`, defined in
[`package.json`](../../../package.json) and implemented by
[`tools/pr-merge.mjs`](../../../tools/pr-merge.mjs). It publishes the supplied
title and description, watches checks, and squash-merges the PR. Use it only
when publication and merging are part of the request; preparing the title and
description for review does not require running it. The helper requires a
non-empty description with non-empty Summary and Verification sections.

## Workflow

1. Inspect the base-to-head scope. Identify the objective, resulting behavior,
   and any unrelated or inherited changes.
2. Draft a concise title that describes this change. Write the description for
   a developer reviewing the actual change against its base. Lead with the
   objective and resulting behavior; include implementation details only when
   they help assess the change, and scale the description to the diff.
3. Assess available verification evidence using the engineering rules linked
   above. Distinguish intended behavior from observed results. Record concise
   checks, outcomes, checked state or CI links, and material gaps. Mention
   limitations when they matter; omit an empty gaps section.
4. Compare the title and every description claim against the actual
   base-to-head diff. Remove inherited claims and correct anything the diff
   does not support. Check that an automatically filled title clearly
   describes this change.
5. Return the title and description for review. This preparation does not
   depend on publishing the PR.

## Description template

Keep the sections concise. Include a gaps note only when a gap is material.

```md
## Summary

Problem or objective, followed by the resulting behavior.

## Verification

Checks run and outcomes, with a CI link when available. Mention material gaps
only when there are any.
```

These structural checks cannot establish whether the description accurately
explains the diff; authors and reviewers must make that assessment. The helper
handles deterministic validation and, when invoked, publication, check
watching, and merging.
