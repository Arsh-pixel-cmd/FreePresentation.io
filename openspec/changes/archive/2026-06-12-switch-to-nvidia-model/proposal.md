## Why

The application's Gemini and DeepSeek API keys are no longer being used. The environment variables have been updated to target model-specific Nvidia NIM API keys: `NVIDIA_diffusiongemma-26b-a4b-it_API_KEY` and `NVIDIA_nemotron-3-ultra-550b-a55b_API_KEY`. We need to adapt the presentation generation and outline generation pipelines to connect to the Nvidia NIM endpoints.

## What Changes

- **API Integration Update**: Replace the Google Gemini and DeepSeek HTTP requests with requests to Nvidia's OpenAI-compatible NIM endpoint (`https://integrate.api.nvidia.com/v1`).
- **Nvidia Model Configuration**:
  - Route outline generation request to `google/diffusiongemma-26b-a4b-it` using the corresponding key.
  - Route main presentation and content generation request to `nvidia/nemotron-3-ultra-550b-a55b` using the corresponding key.
- **JSON Output Constraints**: Ensure custom prompts and parameters are adapted to Nvidia models for structured JSON output formatting.

## Capabilities

### New Capabilities
- `presentation-generation`: Generate presentation outlines and slides using Nvidia NIM models via the OpenAI-compatible API.

### Modified Capabilities
*(None)*

## Impact

- **Affected Files**:
  - `src/app/api/generate/outline/route.ts` (API endpoint calling the LLM for outlines)
  - `src/app/api/generate/route.ts` (API endpoint calling the LLM for slides)
  - `.env` (already updated with Nvidia keys by user)
- **External Services**: Migrating from Google Generative Language & DeepSeek APIs to Nvidia NIM APIs.
