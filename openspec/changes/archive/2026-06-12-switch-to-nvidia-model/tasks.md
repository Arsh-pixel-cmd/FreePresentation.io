## 1. Code Cleanup

- [x] 1.1 Clean up old and unused Gemini and DeepSeek endpoints and helper functions in the generation routes

## 2. Outline Generation Route Integration

- [x] 2.1 Update `src/app/api/generate/outline/route.ts` to query `google/diffusiongemma-26b-a4b-it` using `process.env["NVIDIA_diffusiongemma-26b-a4b-it_API_KEY"]`

## 3. Slide Generation Route Integration

- [x] 3.1 Update `src/app/api/generate/route.ts` to query `nvidia/nemotron-3-ultra-550b-a55b` using `process.env["NVIDIA_nemotron-3-ultra-550b-a55b_API_KEY"]`


## 4. Compilation Check

- [x] 4.1 Run TypeScript compiler verification using `npx tsc --noEmit`
