# SPDX-FileCopyrightText: 2026 Aleksandr 'Aux' Ivanov
# SPDX-License-Identifier: MIT
#
# Shared by install.sh and uninstall.sh: where the parts come from, where
# they go, and the install record that lists what install wrote.

amber_repo=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
amber_parts=${AMBER_PARTS:-$amber_repo/parts}

# An XDG folder is used only when it is an absolute path, as the XDG
# specification asks; otherwise the default under $HOME.
amber_xdg() {
  if [[ ${1:-} == /* ]]; then printf '%s' "$1"; else printf '%s' "$HOME/$2"; fi
}
amber_data=$(amber_xdg "${XDG_DATA_HOME:-}" .local/share)
amber_cache=$(amber_xdg "${XDG_CACHE_HOME:-}" .cache)
amber_config=$(amber_xdg "${XDG_CONFIG_HOME:-}" .config)
amber_record=$amber_data/amber/installed
amber_style=$amber_data/union/styles/amber

# The parts: label, source under the parts folder, target under the data home.
# A source that is a folder is copied file by file.
amber_table=(
  "colour scheme|colour-scheme/Amber.colors|color-schemes/Amber.colors"
  "Union style|union-style/amber|union/styles/amber"
  "window decoration|decoration/amber|aurorae/themes/amber"
  "terminal colours|terminal-colours/Amber.colorscheme|konsole/Amber.colorscheme"
  "editor theme|editor-theme/Amber.theme|org.kde.syntax-highlighting/themes/Amber.theme"
)

# Prints "source<TAB>target" for every file of one part.
amber_files() {
  local src=$amber_parts/$1 dst=$amber_data/$2 rel
  if [[ -d $src ]]; then
    while IFS= read -r rel; do
      printf '%s\t%s\n' "$src/$rel" "$dst/$rel"
    done < <(cd "$src" && find . -type f -printf '%P\n' | LC_ALL=C sort)
  else
    printf '%s\t%s\n' "$src" "$dst"
  fi
}

# The name Union gives a style's cache file: the unpadded base64url SHA-256
# of the style's folder path (verified in P6.1).
amber_cache_name() {
  local hex
  hex=$(printf '%s' "$1" | sha256sum | cut -c1-64)
  # shellcheck disable=SC2059
  printf "$(sed 's/../\\x&/g' <<<"$hex")" | base64 -w0 | tr '+/' '-_' | tr -d '='
}

# Removes what the record lists, then the record. Folders are removed with
# rmdir only, so a folder holding a file Amber did not install stays; each
# such file is printed unless $1 is "quiet".
amber_remove() {
  local quiet=${1:-} kind path
  local -a dirs=() absent=()
  while IFS=' ' read -r kind path; do
    case $kind in
      file) rm -f -- "$path" ;;
      dir) dirs+=("$path") ;;
      absent) absent+=("$path") ;;
    esac
  done < "$amber_record"
  rm -f -- "$amber_cache/union/$(amber_cache_name "$amber_style")" "$amber_record"
  local i
  for ((i = ${#absent[@]} - 1; i >= 0; i--)); do rmdir -- "${absent[i]}" 2>/dev/null || true; done
  for ((i = ${#dirs[@]} - 1; i >= 0; i--)); do rmdir -- "${dirs[i]}" 2>/dev/null || true; done
  if [[ $quiet != quiet ]]; then
    for path in "${dirs[@]}"; do
      if [[ -d $path ]]; then find "$path" -type f -printf 'left %p: Amber did not install it\n'; fi
    done | LC_ALL=C sort -u
  fi
  return 0
}

amber_usage_args() {
  local usage=$1; shift
  case ${1:-} in
    '') ;;
    -h | --help) printf '%s\n' "$usage"; exit 0 ;;
    *) printf '%s\n' "$usage" >&2; exit 2 ;;
  esac
  [[ $# -le 1 ]] || { printf '%s\n' "$usage" >&2; exit 2; }
}
