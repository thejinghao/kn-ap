---
name: done
description: Commit all changes with auto-generated message and push to main. Use when feature work is complete.
disable-model-invocation: true
allowed-tools: Bash(git *), Read, Glob
---

Complete the current feature by committing and pushing changes:

## Step 1: Review Changes
1. Run `git status` to see all modified/untracked files
2. Run `git diff --stat` to get summary of changes
3. Read 2-3 key modified files to understand what changed

## Step 2: Generate Commit Message
Create a clear, descriptive commit message following these rules:
- **Format**: "Action + what changed + where (if needed)"
- **Length**: Maximum 72 characters
- **Tense**: Present tense (not past)
- **Style**: Action-oriented, no period at end
- **No generic terms**: Don't use words like "changes", "updates", "various"

**Good examples:**
- "Add environment variable autocomplete feature"
- "Fix mTLS certificate loading in API proxy"
- "Update Klarna endpoint presets with new fields"

**Bad examples:**
- "Updated some files" (too vague)
- "Changes to API" (what changes?)
- "Fix bug" (what bug?)

## Step 3: Commit
1. Stage all changes: `git add .`
2. Commit with generated message: `git commit -m "Your generated message"`
3. Verify commit succeeded (check exit code)

## Step 4: Push to Main
1. Push to main branch: `git push origin main`
2. Wait for push to complete
3. Confirm success with final `git status` and `git log -1 --oneline`

## Important Notes
- If there are no changes to commit, inform the user and stop
- If push fails (network, permissions), report the error clearly
- The commit message must be specific about what changed
