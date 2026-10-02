# Task inspector

## Problem

The previous compact task dialog was 560 px wide but retained a desktop two-column form with minimum widths of 520 + 390 px. Its modal backdrop also prevented interacting with the board.

## Interaction

- Desktop, from 981 px: a modeless inspector docked to the right. The board reserves its width, remains interactive, and is never blurred or dimmed.
- Width: 440–600 px, responsive to the viewport. A header button expands it to a maximum of 960 px for focused editing.
- Mobile: a full-screen, focus-contained editor, with safe-area padding and no background scrolling.
- One content pane at a time: Details or Comments. Switching tabs preserves the draft. Comment badges open Comments; subtask @ buttons open Comments with the correct context.
- The header, tabs, and Save/Close actions stay visible. Only the active content pane scrolls.
- The selected board card is outlined and brought into horizontal view without changing the board's filters or dates.

## Data safety

- Changes are saved explicitly. Closing or opening another task with unsaved fields or comments shows an inline Stay/Discard choice.
- Opening the same task again reuses the editor rather than resetting its fields.
- A pending save cannot be interrupted by a task switch.
- Saving the task cannot silently discard an unsent or edited comment.
- Date/time presets from the board or timeline are applied atomically when the intended new task actually opens, including after a discard confirmation. There are no delayed writes into another task.
- An invalid field on the hidden Details tab reveals that tab before validation.

## Verification

Regression tests cover tab routing, dirty-state protection, one-shot task switching, date presets, and pending saves. Browser checks use isolated in-memory fixtures for actual saves/comments and inspect layout at desktop and mobile breakpoints. Production verification must not create or modify user tasks.

Design rationale: modeless inspectors for repeated editing alongside content, following [Apple's panel guidance](https://developer.apple.com/design/human-interface-guidelines/panels), rather than a small modal with a full-width form squeezed into it.
