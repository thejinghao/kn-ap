---
name: done
description: Commit changes with auto-generated message and push to main. Use --all to commit everything, otherwise only commits session-related files.
disable-model-invocation: true
allowed-tools: Bash(git *), Read, Glob
---

Complete the current feature by committing and pushing changes.

## Parameters
- `--all` — Commit ALL uncommitted changes (staged, modified, and untracked), not just session-related files

## Step 1: Identify Changes
1. Run `git status` to see all modified/untracked files
2. Run `git diff --stat` to get summary of changes

**If `--all` flag is provided:**
3. ALL modified and untracked files are targets for commit — skip session filtering

**If NO flag (default behavior):**
3. Review the conversation history to determine which files were created or modified during THIS session
4. Build a list of **session files** — only files you edited, created, or explicitly changed in this conversation
5. If there are other uncommitted changes unrelated to this session, leave them alone

## Step 2: Review Changes
1. Run `git diff` on the target files to understand what changed
2. Read key modified files if needed to understand the changes

## Step 3: Generate Commit Message
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

## Step 4: Commit
**If `--all`:**
1. Stage all changes: `git add -A`
2. Commit with generated message: `git commit -m "Your generated message"`

**If default (no flag):**
1. Stage ONLY session-related files: `git add <file1> <file2> ...` (list each file explicitly — do NOT use `git add .` or `git add -A`)
2. Commit with generated message: `git commit -m "Your generated message"`

3. Verify commit succeeded (check exit code)

## Step 5: Push to Main
1. Push to main branch: `git push origin main`
2. Wait for push to complete
3. Confirm success with final `git status` and `git log -1 --oneline`
4. If there are remaining uncommitted changes (from before the session), mention them to the user

## Important Notes
- **Default mode**: Only commit files changed in this session — never stage unrelated uncommitted changes
- **`--all` mode**: Commits everything — useful for catching up on accumulated changes across sessions
- If no changes exist, inform the user and stop
- If push fails (network, permissions), report the error clearly
- The commit message must be specific about what changed
