set -e

env_file=".devcontainer/.env"
gitdir="$(git rev-parse --path-format=absolute --git-common-dir)"

touch "$env_file"

if grep -q '^GIT_REPO=' "$env_file"; then
    sed -i "s|^GIT_REPO=.*|GIT_REPO=$gitdir|" "$env_file"
else
    printf '\nGIT_REPO=%s\n' "$gitdir" >> "$env_file"
fi
