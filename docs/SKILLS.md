# Claude Code Skills Reference

This document describes custom Claude Code skills available in this project.

## What are Skills?

Skills are reusable sets of instructions that extend Claude Code's capabilities. They're defined in `.claude/skills/` and can be invoked with `/skill-name` commands.

## Available Skills

### `/done` - Auto Commit and Push

Automatically commits all changes with a descriptive commit message and pushes to main branch.

**Location:** `.claude/skills/done/SKILL.md`

**Usage:**
```
/done
```

**Process:**
1. **Review Changes** - Checks `git status` and `git diff --stat` to see what changed
2. **Analyze Code** - Reads 2-3 key modified files to understand the nature of changes
3. **Generate Message** - Creates a clear, descriptive commit message following project conventions
4. **Commit** - Stages all changes and commits with generated message
5. **Push** - Pushes to main branch
6. **Verify** - Confirms success with git log

**Commit Message Rules:**
- Maximum 72 characters
- Present tense, action-oriented
- Format: "Action + what changed + where (if needed)"
- No generic terms like "changes", "updates", "various"

**Examples of Generated Messages:**
- ✅ "Add environment variable autocomplete feature"
- ✅ "Fix mTLS certificate loading in API proxy"
- ✅ "Update Klarna endpoint presets with new fields"
- ❌ "Updated some files" (too vague)
- ❌ "Changes to API" (what changes?)
- ❌ "Fix bug" (what bug?)

**When to Use:**
- Feature work is complete and tested
- Working solo or on personal projects
- Quick iterations where code review isn't required
- All changes are ready to be pushed together

**When NOT to Use:**
- Team projects requiring code review
- Incomplete or untested work
- Breaking changes that need discussion
- Work that should go through a PR process

**Error Handling:**
- If no changes exist, informs user and stops
- If push fails (network, permissions), reports error clearly
- If commit fails, shows error and doesn't attempt push

**Safety Considerations:**
⚠️ **Pushes directly to main branch** - This bypasses code review and is only suitable for:
- Solo projects
- Personal development work
- Quick prototypes
- Non-production code

For team projects or production code, consider:
- Using feature branches instead
- Creating pull requests for review
- Running tests before pushing
- Getting team approval for significant changes

## Creating Custom Skills

To create your own skills:

1. **Create skill directory:**
   ```bash
   mkdir -p .claude/skills/your-skill-name
   ```

2. **Create SKILL.md file:**
   ```yaml
   ---
   name: your-skill-name
   description: Brief description of what the skill does
   disable-model-invocation: true
   allowed-tools: Bash(git *), Read, Glob
   ---

   Instructions for Claude to follow...
   ```

3. **Skill is auto-discovered** - No registration needed, Claude Code finds it automatically

4. **Invoke with:**
   ```
   /your-skill-name
   ```

**Tips:**
- Keep instructions clear and step-by-step
- Limit allowed tools to what's needed
- Include error handling instructions
- Provide examples of good/bad outputs
- Test thoroughly before relying on it

## Skill Scope

**Project-specific skills** (`.claude/skills/`):
- Only available in this project
- Can be committed to repo and shared with team
- Good for project-specific workflows

**Personal skills** (`~/.claude/skills/`):
- Available across all your projects
- Stored locally, not version controlled
- Good for personal workflow preferences

## More Information

- Claude Code documentation: https://claude.com/claude-code
- Skills feature guide: Check `/help` in Claude Code
- Project documentation: See `CLAUDE.md` for project-specific guidance
