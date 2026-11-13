#!/bin/bash
# SPDX-FileCopyrightText: 2026 Aleksandr 'Aux' Ivanov
# SPDX-License-Identifier: MIT
#
# Installs Amber's five parts into the data home ($XDG_DATA_HOME, or
# ~/.local/share) and writes the install record, amber/installed, that
# uninstall.sh reads. Changes no setting: select the parts in System Settings.
set -euo pipefail
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

amber_usage_args "Usage: install.sh [--help]
Installs Amber's parts into $amber_data. Run it again to update them." "$@"

# What the record of an earlier install lists, so that its files may be replaced.
declare -A ours=()
if [[ -f $amber_record ]]; then
  while IFS=' ' read -r kind path; do [[ $kind == file ]] && ours[$path]=1; done < "$amber_record"
fi

# Refuse before writing anything: a part missing from the repository, or a
# target file that Amber did not write.
refused=()
for row in "${amber_table[@]}"; do
  IFS='|' read -r label src dst <<<"$row"
  [[ -e $amber_parts/$src ]] || { echo "install.sh: missing part $amber_parts/$src" >&2; exit 1; }
  while IFS=$'\t' read -r from to; do
    [[ -e $to && -z ${ours[$to]:-} ]] && refused+=("$to")
  done < <(amber_files "$src" "$dst")
done
if ((${#refused[@]})); then
  echo "install.sh: these files exist and were not installed by Amber; move them away first:" >&2
  printf '  %s\n' "${refused[@]}" >&2
  exit 1
fi

[[ -f $amber_record ]] && amber_remove quiet

# Makes a folder and its missing parents, printing a "dir" line for each one made.
make_dir() {
  local p=$1
  local -a missing=()
  while [[ ! -d $p ]]; do missing=("$p" "${missing[@]}"); p=$(dirname "$p"); done
  for p in "${missing[@]}"; do mkdir -- "$p"; printf 'dir %s\n' "$p"; done
}

lines=$(make_dir "$(dirname "$amber_record")")
printf '%s\n' "$lines" | sed '/^$/d' > "$amber_record"
[[ -d $amber_cache/union ]] || printf 'absent %s\n' "$amber_cache/union" >> "$amber_record"

for row in "${amber_table[@]}"; do
  IFS='|' read -r label src dst <<<"$row"
  while IFS=$'\t' read -r from to; do
    make_dir "$(dirname "$to")" >> "$amber_record"
    cp -- "$from" "$to"
    printf 'file %s\n' "$to" >> "$amber_record"
  done < <(amber_files "$src" "$dst")
  printf '%s → %s\n' "$label" "$amber_data/$dst"
done
echo "Installed. Select the parts in System Settings; uninstall with scripts/uninstall.sh."
