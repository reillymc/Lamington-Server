set -e

env_file=".devcontainer/.env"

# Derive a per-worktree slug so parallel devcontainers (opened side-by-side in
# different git worktrees) get isolated compose projects, images and volumes.
# Falls back to a fixed "default" slug when git is unavailable or HEAD is
# detached, so a plain (non-worktree) checkout or standalone copy still works.
branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || true)"
case "$branch" in
    HEAD | '')
        slug="default"
        ;;
    *)
        slug="$(printf '%s' "$branch" | tr '[:upper:]' '[:lower:]' | tr -cs 'a-z0-9._-' '-' | tr -s '-' | sed 's/^-//; s/-$//')"
        ;;
esac
[ -n "$slug" ] || slug="default"

touch "$env_file"

if grep -q '^WORKTREE_SLUG=' "$env_file"; then
    sed -i "s|^WORKTREE_SLUG=.*|WORKTREE_SLUG=$slug|" "$env_file"
else
    printf '\nWORKTREE_SLUG=%s\n' "$slug" >> "$env_file"
fi

gitdir="$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null || true)"
if [ -n "$gitdir" ]; then
    if grep -q '^GIT_REPO=' "$env_file"; then
        sed -i "s|^GIT_REPO=.*|GIT_REPO=$gitdir|" "$env_file"
    else
        printf '\nGIT_REPO=%s\n' "$gitdir" >> "$env_file"
    fi
fi
