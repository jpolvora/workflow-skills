## Summary
- Add optional `defaults.testingModel` (test executor) beside planner/execution/reviewer models.
- Standard autoMode Step 7 uses non-empty `testingModel`, else `executionModel`, else the active session model.
- Narrow `reviewerModel` to Steps 5–6. Lite does not read or apply `testingModel`.

## Test plan
- [x] `node test/test-testing-executor-model.js`
- [x] `npm run generate-integrity && npm run verify-integrity`
- [x] `npm run test`
