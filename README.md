# chat-app

## Git Hooks

This project uses Husky to run pre-push hooks that ensure code quality before pushing to the remote repository.

### Pre-Push Checks

Before pushing, the following checks are automatically run:

- Frontend build verification
- Test suite execution

If any of these checks fail, the push will be blocked.

### Bypassing Pre-Push Hooks

To bypass the pre-push hooks (e.g., for emergency fixes or when you're certain the checks will pass), use:

```bash
git push --no-verify
```

**Note:** `-f` or `--force` is for force pushing (overwriting remote branches), not for bypassing hooks. Use `--no-verify` or `-n` to skip pre-push checks.

## Deployment

| Branch | Environment | Auto-deploy |
|--------|-------------|-------------|
| `main` | QA/Staging  | ✅ Yes      |
| `prod` | Production  | ✅ Yes      |

### Workflow
1. Create feature branch from `main`
2. Open PR to `main`
3. Merge to `main` → auto-deploys to QA
4. Test in QA
5. Open PR from `main` to `prod`
6. Merge to `prod` → auto-deploys to Production

### Guardrails
- CI now runs for both `main` and `prod` PRs/pushes so branch protection can block unsafe deploys.
- `prod` branch should remain protected (required PR review + required status checks).
- Railway branch mapping must stay pinned to `main → staging` and `prod → production`.
