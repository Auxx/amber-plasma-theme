#!/bin/bash
# SPDX-FileCopyrightText: 2026 Aleksandr 'Aux' Ivanov
# SPDX-License-Identifier: MIT
#
# Removes what install.sh wrote, as its install record lists it, and Amber's
# Union cache file. Changes no setting: a setting that still names Amber is
# reported, for the owner to change in System Settings.
set -euo pipefail
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

amber_usage_args "Usage: uninstall.sh [--help]
Removes Amber's parts from $amber_data." "$@"

report() {
  local file=$amber_config/$1 line=$2 what=$3
  if [[ -f $file ]] && grep -qx -- "$line" "$file"; then
    echo "Still selected: $line in $file. Choose another $what in System Settings."
  fi
}

if [[ ! -f $amber_record ]]; then
  echo "Nothing is installed: $amber_record does not exist."
else
  for row in "${amber_table[@]}"; do
    IFS='|' read -r label src dst <<<"$row"
    if grep -q -F -- " $amber_data/$dst" "$amber_record"; then
      printf 'removed %s: %s\n' "$label" "$amber_data/$dst"
    fi
  done
  amber_remove
fi
report kdeglobals ColorScheme=Amber "colour scheme"
report kwinrc theme=__aurorae__svg__amber "window decoration"
exit 0
