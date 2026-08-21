#!/bin/zsh
set -euo pipefail

script_dir=${0:A:h}
source_file="$script_dir/apple_eventkit_reminders.swift"
info_plist="$script_dir/Info.plist"
binary_path="/private/tmp/apple-eventkit-reminders"
module_cache="/private/tmp/apple-eventkit-reminders-module-cache"

if [[ ! -x "$binary_path" || "$source_file" -nt "$binary_path" || "$info_plist" -nt "$binary_path" ]]; then
    swiftc \
        -parse-as-library \
        -module-cache-path "$module_cache" \
        -framework EventKit \
        -Xlinker -sectcreate \
        -Xlinker __TEXT \
        -Xlinker __info_plist \
        -Xlinker "$info_plist" \
        "$source_file" \
        -o "$binary_path"
fi

exec "$binary_path" "$@"
