# Contributing

## Git commits

This repository uses a local hook (`.githooks/prepare-commit-msg`) to strip unwanted automatic co-author trailers from commit messages. After clone, enable hooks once:

```bash
git config core.hooksPath .githooks
```

Use your own GitHub identity for commits:

```bash
git config user.name "Your Name"
git config user.email "you@example.com"
```

Do not add third-party co-author lines unless those people contributed to that specific commit.
