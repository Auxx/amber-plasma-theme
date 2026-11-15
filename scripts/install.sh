#!/bin/bash
# SPDX-FileCopyrightText: 2026 Aleksandr 'Aux' Ivanov
# SPDX-License-Identifier: MIT
#
# Installs Amber's five parts into the data home ($XDG_DATA_HOME, or
# ~/.local/share) and writes the install record, amber/installed, that
# uninstall.sh reads. With --activate it also selects every part in KDE's
# settings and records each earlier value, which uninstall.sh puts back.
set -euo pipefail
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

usage="Usage: install.sh [--activate | --help]
Installs Amber's parts into $amber_data. Run it again to update them.
  --activate  also select every part in $amber_config; uninstall.sh puts
              each setting back"
activate=0
if [[ ${1:-} == --activate ]]; then
  activate=1; shift
  [[ $# -eq 0 ]] || { printf '%s\n' "$usage" >&2; exit 2; }
fi
amber_usage_args "$usage" "$@"

# What the record of an earlier install lists, so that its files may be
# replaced, and its settings, which a new install carries over.
declare -A ours=()
carried=()
if [[ -f $amber_record ]]; then
  while IFS= read -r line; do
    case $line in
      'file '*) ours[${line#file }]=1 ;;
      set$'\t'* | 'created '*) carried+=("$line") ;;
      "dir $amber_config" | "dir $amber_config/"*) carried+=("$line") ;;
    esac
  done < "$amber_record"
fi

# The Konsole profile that takes the terminal colours: the default profile
# if it is the owner's, otherwise Amber.profile, which Amber writes (D-140).
konsole=$amber_data/konsole
amber_profile=$konsole/Amber.profile
owner_profile=
write_profile=0
if ((activate)); then
  dp=$(amber_ini_get "$amber_config/konsolerc" 'Desktop Entry' DefaultProfile) || dp=
  if [[ -n $dp && -f $konsole/$dp && -z ${ours[$konsole/$dp]:-} ]]; then
    owner_profile=$konsole/$dp
  else
    write_profile=1
  fi
fi
[[ -n ${ours[$amber_profile]:-} ]] && write_profile=1

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
((write_profile)) && [[ -e $amber_profile && -z ${ours[$amber_profile]:-} ]] && refused+=("$amber_profile")
if ((${#refused[@]})); then
  echo "install.sh: these files exist and were not installed by Amber; move them away first:" >&2
  printf '  %s\n' "${refused[@]}" >&2
  exit 1
fi

[[ -f $amber_record ]] && amber_remove quiet

lines=$(amber_make_dir "$(dirname "$amber_record")")
printf '%s\n' "$lines" | sed '/^$/d' > "$amber_record"
[[ -d $amber_cache/union ]] || printf 'absent %s\n' "$amber_cache/union" >> "$amber_record"
((${#carried[@]})) && printf '%s\n' "${carried[@]}" >> "$amber_record"

for row in "${amber_table[@]}"; do
  IFS='|' read -r label src dst <<<"$row"
  while IFS=$'\t' read -r from to; do
    amber_make_dir "$(dirname "$to")" >> "$amber_record"
    printf 'file %s\n' "$to" >> "$amber_record"
    cp -- "$from" "$to"
  done < <(amber_files "$src" "$dst")
  printf '%s → %s\n' "$label" "$amber_data/$dst"
done

if ((write_profile)); then
  printf 'file %s\n' "$amber_profile" >> "$amber_record"
  printf '[Appearance]\nColorScheme=Amber\n\n[General]\nName=Amber\nParent=FALLBACK/\n' > "$amber_profile"
fi

if ((!activate)); then
  if ((${#carried[@]})); then
    echo "Installed; the settings of the earlier --activate still select Amber."
  else
    echo "Installed. Select the parts in System Settings, or install again with --activate; uninstall with scripts/uninstall.sh."
  fi
  exit 0
fi

globals=$amber_config/kdeglobals
amber_set "$globals" General AccentColor -
amber_apply_colour_scheme
amber_set "$globals" KDE widgetStyle =Union
amber_set "$globals" KDE unionStyle =amber
echo "colour scheme and Union style selected in $globals"

kwin=$amber_config/kwinrc
amber_set "$kwin" org.kde.kdecoration2 library =org.kde.kwin.aurorae.v2
amber_set "$kwin" org.kde.kdecoration2 theme =__aurorae__svg__amber
amber_set "$kwin" org.kde.kdecoration2 BorderSize =Tiny
amber_set "$kwin" org.kde.kdecoration2 BorderSizeAuto =false
echo "window decoration selected, border size Tiny, in $kwin"

if [[ -n $owner_profile ]]; then
  amber_set "$owner_profile" Appearance ColorScheme =Amber
  echo "terminal colours selected in $owner_profile"
else
  amber_set "$amber_config/konsolerc" 'Desktop Entry' DefaultProfile =Amber.profile
  echo "terminal colours selected in $amber_profile, Konsole's default profile"
fi

for rc in katerc kwriterc; do
  amber_set "$amber_config/$rc" 'KTextEditor Renderer' 'Color Theme' =Amber
  amber_set "$amber_config/$rc" 'KTextEditor Renderer' 'Auto Color Theme Selection' =false
done
echo "editor theme selected in $amber_config/katerc and kwriterc"

amber_notify
echo "Installed and selected. Applications show the Union style, and Konsole, Kate and KWrite their parts, when they start again; uninstall with scripts/uninstall.sh."
