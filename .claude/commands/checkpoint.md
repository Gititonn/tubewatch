Create a git checkpoint so we can safely rewind here if needed.

Steps:
1. Run `git add -A`
2. Run `git commit -m "checkpoint: $ARGUMENTS"`
3. Show the resulting commit hash with `git log --oneline -1`
4. Tell the user: "Checkpoint saved. To rewind here later, run: git reset --soft <hash>"
