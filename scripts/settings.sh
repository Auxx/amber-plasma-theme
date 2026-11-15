# SPDX-FileCopyrightText: 2026 Aleksandr 'Aux' Ivanov
# SPDX-License-Identifier: MIT
#
# Sourced by lib.sh: reading and writing KDE's configuration files for
# activation, recording each earlier value in the install record, and
# putting them back on uninstall (P6.2, D-137 to D-139).
#
# A setting's record line is tab-separated:
#   set <file> <group> <key> <before> <after>
# where <before> and <after> are "=" followed by the value, or "-" for a
# missing key. The colour scheme's keys are "cset" lines of the same form,
# restored together only while "scheme <file> <ColorScheme> <ColorSchemeHash>"
# (the values activation left) still holds. "created <file>" names a
# configuration file that activation made; uninstall removes it when no key
# is left in it.

# Prints a key's value and returns 0, or returns 1 when the key or the file
# is missing. kreadconfig6 cannot tell an empty value from a missing key.
amber_ini_get() {
  [[ -f $1 ]] || return 1
  awk -v g="$2" -v k="$3" '
    BEGIN { found = 0 }
    /^\[/ { in_group = ($0 == "[" g "]"); next }
    in_group { i = index($0, "="); if (i && substr($0, 1, i - 1) == k) { v = substr($0, i + 1); found = 1 } }
    END { if (found) print v; exit !found }
  ' "$1"
}

# Prints every key of a file as "group<TAB>key<TAB>value".
amber_ini_dump() {
  [[ -f $1 ]] || return 0
  awk '
    /^\[/ { g = substr($0, 2, length($0) - 2); next }
    /^#/ || !NF { next }
    { i = index($0, "="); if (i && g != "") print g "\t" substr($0, 1, i - 1) "\t" substr($0, i + 1) }
  ' "$1"
}

# Writes (a value "=…") or deletes (a value "-") one key with kwriteconfig6.
amber_kwrite() {
  local file=$1 group=$2 key=$3 value=$4 g
  local -a args=()
  while [[ $group == *']['* ]]; do args+=(--group "${group%%][*}"); group=${group#*][}; done
  args+=(--group "$group")
  if [[ $value == - ]]; then
    kwriteconfig6 --file "$file" "${args[@]}" --key "$key" --delete
  else
    kwriteconfig6 --file "$file" "${args[@]}" --key "$key" -- "${value#=}"
  fi
}

# The current value of a key as "=…", or "-" when it is missing.
amber_ini_state() {
  local v
  if v=$(amber_ini_get "$1" "$2" "$3"); then printf '=%s' "$v"; else printf -- '-'; fi
}

# Records one key's change. When the record already holds a line for the key,
# only its <after> is updated: a later activation keeps the value from before
# the first one, and uninstall still finds the value written last.
amber_record_set() {
  local kind=$1 file=$2 group=$3 key=$4 before=$5 after=$6 tmp
  if awk -F'\t' -v f="$file" -v g="$group" -v k="$key" \
    '($1 == "set" || $1 == "cset") && $2 == f && $3 == g && $4 == k { found = 1 } END { exit !found }' "$amber_record"; then
    tmp=$amber_record.new
    awk -F'\t' -v OFS='\t' -v f="$file" -v g="$group" -v k="$key" -v a="$after" \
      '($1 == "set" || $1 == "cset") && $2 == f && $3 == g && $4 == k { $6 = a } { print }' "$amber_record" > "$tmp"
    mv -- "$tmp" "$amber_record"
  else
    printf '%s\t%s\t%s\t%s\t%s\t%s\n' "$kind" "$file" "$group" "$key" "$before" "$after" >> "$amber_record"
  fi
}

# Before the first write to a configuration file: the folders and the file
# activation makes are recorded.
amber_prepare_file() {
  local file=$1
  [[ -e $file ]] && return 0
  amber_make_dir "$(dirname "$file")" >> "$amber_record"
  grep -qxF -- "created $file" "$amber_record" || printf 'created %s\n' "$file" >> "$amber_record"
}

# Records and writes one key ("=value", or "-" to delete it). Does nothing
# when the key already holds that value.
amber_set() {
  local file=$1 group=$2 key=$3 want=$4 now
  now=$(amber_ini_state "$file" "$group" "$key")
  [[ $now == "$want" ]] && return 0
  amber_prepare_file "$file"
  amber_record_set set "$file" "$group" "$key" "$now" "$want"
  amber_kwrite "$file" "$group" "$key" "$want"
}

# Applies the colour scheme with KDE's own tool, which derives values the
# file does not hold, and records every key of kdeglobals that it changed.
amber_apply_colour_scheme() {
  local file=$amber_config/kdeglobals line id
  local -A before=() after=()
  while IFS= read -r line; do before[${line%$'\t'*}]=${line##*$'\t'}; done < <(amber_ini_dump "$file")
  amber_prepare_file "$file"
  # The tool skips a scheme whose name is already set, so an older Amber
  # (another hash) loses its name first; the diff below spans both steps.
  local hash
  hash=$(sha1sum < "$amber_data/color-schemes/Amber.colors" | cut -c1-40)
  if [[ ${before[General$'\t'ColorScheme]:-} == Amber && ${before[General$'\t'ColorSchemeHash]:-} != "$hash" ]]; then
    amber_kwrite "$file" General ColorScheme -
  fi
  # With no session bus given, the tool must not find the owner's own one
  # through $XDG_RUNTIME_DIR/bus, which libdbus falls back to.
  local -a bus=()
  [[ -n ${DBUS_SESSION_BUS_ADDRESS:-} ]] || bus=(env -u XDG_RUNTIME_DIR DBUS_SESSION_BUS_ADDRESS=unix:path=/nonexistent)
  local failed=0
  XDG_CONFIG_HOME=$amber_config XDG_DATA_HOME=$amber_data QT_QPA_PLATFORM=offscreen \
    "${bus[@]}" plasma-apply-colorscheme Amber > /dev/null || failed=1
  while IFS= read -r line; do after[${line%$'\t'*}]=${line##*$'\t'}; done < <(amber_ini_dump "$file")
  local -A ids=()
  for id in "${!before[@]}" "${!after[@]}"; do ids[$id]=1; done
  for id in "${!ids[@]}"; do
    local b=- a=-
    [[ -v before[$id] ]] && b="=${before[$id]}"
    [[ -v after[$id] ]] && a="=${after[$id]}"
    [[ $b == "$a" ]] && continue
    amber_record_set cset "$file" "${id%%$'\t'*}" "${id#*$'\t'}" "$b" "$a"
  done
  local tmp=$amber_record.new
  grep -v -F -- "$(printf 'scheme\t%s\t' "$file")" "$amber_record" > "$tmp" || true
  mv -- "$tmp" "$amber_record"
  printf 'scheme\t%s\t%s\t%s\n' "$file" "$(amber_ini_state "$file" General ColorScheme)" \
    "$(amber_ini_state "$file" General ColorSchemeHash)" >> "$amber_record"
  if ((failed)); then
    echo "install.sh: plasma-apply-colorscheme Amber failed; uninstall.sh undoes what was done" >&2
    exit 1
  fi
}

# Puts back every setting the record lists, newest first. A key the owner
# changed since install keeps the owner's value and is named.
amber_restore() {
  [[ -f $amber_record ]] || return 0
  local -a lines=() created=()
  local line kind file group key before after now i name hash
  local -A restored=() scheme_kept=()
  while IFS= read -r line; do
    case $line in
      set$'\t'* | cset$'\t'*) lines+=("$line") ;;
      'created '*) created+=("${line#created }") ;;
      scheme$'\t'*)
        IFS=$'\t' read -r kind file name hash <<<"$line"
        if [[ $(amber_ini_state "$file" General ColorScheme) != "$name" ||
          $(amber_ini_state "$file" General ColorSchemeHash) != "$hash" ]]; then
          scheme_kept[$file]=1
        fi ;;
    esac
  done < "$amber_record"
  # A colour scheme is one unit: if the owner chose another since install,
  # all of its keys are the owner's.
  for file in "${!scheme_kept[@]}"; do
    now=$(amber_ini_state "$file" General ColorScheme)
    echo "kept $file colour scheme ${now#=}: changed since install"
  done
  for ((i = ${#lines[@]} - 1; i >= 0; i--)); do
    IFS=$'\t' read -r kind file group key before after <<<"${lines[i]}"
    now=$(amber_ini_state "$file" "$group" "$key")
    if [[ $kind == cset ]]; then
      [[ -n ${scheme_kept[$file]:-} ]] && continue
      amber_kwrite "$file" "$group" "$key" "$before"
      restored[$file]=$((${restored[$file]:-0} + 1))
    elif [[ $now == "$after" ]]; then
      amber_kwrite "$file" "$group" "$key" "$before"
      restored[$file]=$((${restored[$file]:-0} + 1))
    elif [[ $now == - ]]; then
      echo "kept $file [$group] $key removed: changed since install"
    else
      echo "kept $file [$group] $key${now}: changed since install"
    fi
  done
  for file in "${!restored[@]}"; do echo "restored ${restored[$file]} settings in $file"; done | LC_ALL=C sort
  for file in "${created[@]}"; do
    if [[ -f $file && -z $(amber_ini_dump "$file") ]] && ! grep -q '[^[:space:]]' <(grep -v '^\[' "$file"); then
      rm -f -- "$file"
    fi
  done
  return 0
}

# Tells running programs, only on a session bus that was given: KWin reads
# its settings again, and after a restore applications repaint.
amber_notify() {
  [[ -n ${DBUS_SESSION_BUS_ADDRESS:-} ]] || return 0
  dbus-send --session --type=signal /KWin org.kde.KWin.reloadConfig 2>/dev/null || true
  if [[ ${1:-} == palette ]]; then
    dbus-send --session --type=signal /KGlobalSettings org.kde.KGlobalSettings.notifyChange int32:0 int32:0 2>/dev/null || true
  fi
}
