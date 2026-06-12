## Context

The application currently connects to Google Gemini (`gemini-2.5-flash`) and DeepSeek APIs via direct REST `fetch` requests to generate presentation outlines and full slide decks. The user has migrated all environment variables to model-specific Nvidia NIM API keys: `NVIDIA_diffusiongemma-26b-a4b-it_API_KEY` and `NVIDIA_nemotron-3-ultra-550b-a55b_API_KEY`. The generation pipelines must be updated to connect to these new cloud-hosted models.

## Goals / Non-Goals

**Goals:**
- Replace Google Gemini API calls in `src/app/api/generate/outline/route.ts` and `src/app/api/generate/route.ts` with requests to the Nvidia NIM endpoints.
- Ensure the prompt payloads, headers, and authentication keys are properly configured.
- Maintain the same output schema and JSON parsing structure on the frontend.

**Non-Goals:**
- Introducing external packages (like the OpenAI SDK) unless strictly necessary. We will use direct `fetch` calls to keep the bundle footprint small and consistent with existing patterns.
- Changing frontend UI components or database models.

## Decisions

### Decision 1: Direct HTTP Fetch requests
- **Choice**: Direct `fetch()` calls to `https://integrate.api.nvidia.com/v1/chat/completions` using the OpenAI chat completions schema.
- **Rationale**: Keeps the code aligned with current patterns and avoids installing external dependencies.
- **Alternatives Considered**: Installing the `openai` npm package. Rejected because direct fetch is lightweight and already working for Gemini and DeepSeek.

### Decision 2: Model Mapping
- **Outline Generation (`/api/generate/outline`)**:
  - Model: `google/diffusiongemma-26b-a4b-it`
  - Auth Key: `process.env["NVIDIA_diffusiongemma-26b-a4b-it_API_KEY"]`
- **Slide Generation (`/api/generate`)**:
  - Model: `nvidia/nemotron-3-ultra-550b-a55b`
  - Auth Key: `process.env["NVIDIA_nemotron-3-ultra-550b-a55b_API_KEY"]`

## Risks / Trade-offs

- **[Risk]** The model names or keys in `.env` contain hyphens (e.g., `NVIDIA_diffusiongemma-26b-a4b-it_API_KEY`).
  - **Mitigation**: Access them in Node.js using bracket notation, e.g., `process.env["NVIDIA_diffusiongemma-26b-a4b-it_API_KEY"]` rather than dot notation.
- **[Risk]** DeepSeek and Gemini are fallback logic. Since DeepSeek is out of credit and Gemini is replaced, we will remove them or clean up fallback references to use Nvidia models exclusively.
  - **Mitigation**: Remove the redundant/deprecated Gemini and DeepSeek fallbacks and rely on the new Nvidia API endpoints directly.
