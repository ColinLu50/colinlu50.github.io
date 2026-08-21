---
name: apple-eventkit-reminders
description: Create native Apple Reminders with dates and times on macOS through Apple's public EventKit API. Use for local Mac to-dos that should be completable and visible in Calendar; do not use for ordinary duration-based calendar events.
---

# Apple EventKit Reminders

Use the bundled Swift helper for reminder writes. It talks directly to Apple's public EventKit framework and emits JSON; do not substitute Calendar UI automation, AppleScript, private frameworks, or direct database access.

Requires macOS 14 or later.

Run it from this skill directory:

```bash
zsh scripts/run.zsh add \
  --title "Inspect apartment" \
  --start "2026-08-22 10:00" \
  --due "2026-08-22 16:00"
```

For an all-day reminder, use:

```bash
zsh scripts/run.zsh add --title "Move house" --date "2026-08-23"
```

Use local time in `yyyy-MM-dd HH:mm` format, or `yyyy-MM-dd` for `--date`. `--list NAME` is optional; without it, EventKit uses the default Reminders list. Do not combine `--date` with `--start` or `--due`. The helper rejects an end time that is not later than the start time.

The first live invocation may require macOS Reminders permission. Never claim success unless the command returns JSON with `status: "created"`. If permission is denied or macOS does not present a permission prompt, report that limitation and ask the user to grant Reminders access to the invoking host in System Settings; do not silently fall back to UI automation.
