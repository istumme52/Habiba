# AI storyboard planner

This folder adds the first AI-assisted stage to the cartoon engine: turn a written story idea into structured, validated storyboard JSON.

## Requirements

- Node.js 20 or newer; no extra npm packages.
- An API key and model name for an OpenAI-compatible Chat Completions endpoint.
- Store the API key as an environment variable or GitHub Actions Secret. Never put it in source code, commit it, or paste it into chat.

## Configure and run

Set AI_API_KEY and AI_MODEL in your shell. Optionally set AI_API_URL for a compatible provider other than OpenAI (default endpoint: https://api.openai.com/v1/chat/completions).

Then run:

    node ai/plan_story.mjs --prompt "A mysterious lighthouse story" --duration 60 --language English --output out/storyboard.json

Bangla example:

    node ai/plan_story.mjs --prompt "একটি রহস্যময় নদীর গল্প" --duration 60 --language Bangla --output out/storyboard.json

The planner requests JSON mode and validates the result before saving. It checks character references, required scene descriptions, vertical 9:16 format, 30 fps and exact total scene duration (15–600 seconds).

Run its offline validation test:

    node ai/plan_story.mjs --self-test

## Current boundary

This stage creates storyboard.json; it does not yet convert that JSON into the renderer's hand-authored Web/story.js, generate character/background images, synthesize narration, or export a new MP4. Those are separate integration stages. The existing renderer still renders the included fixed sample episode.

The endpoint defaults to OpenAI Chat Completions. For another provider, set AI_API_URL, AI_MODEL and AI_API_KEY to values supplied by that provider. Check your provider's pricing and data-handling terms before sending story content.
