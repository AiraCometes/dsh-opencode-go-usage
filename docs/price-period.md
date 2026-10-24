# OpenCode Go price period indicator

The indicator applies only to the selected `opencode-go` provider and these documented model IDs:

- `deepseek-v4.1-flash` (DeepSeek V4.1 Flash)
- `deepseek-v4-pro` (DeepSeek V4 Pro)

Other models and providers have no price-period badge. Provider and model are captured from the same model-directory snapshot. Existing callers that supply only a provider retain usage rendering but get no model-specific price claim.

## UTC schedule

[OpenCode Go's official pricing page](https://dev.opencode.ai/v2/docs/console/go), checked on 2026-10-24, states that Peak hours for these models are Monday–Friday 01:00–04:00 and 06:00–10:00 UTC. Starts are inclusive and ends exclusive; all other hours, including weekends, are Off-Peak. In Japan this is Monday–Friday 10:00–13:00 and 15:00–19:00 JST.

This is a published-schedule indicator, not billing verification. It uses the browser clock with UTC getters, independent of the browser's time zone. It refreshes at minute boundaries and when the tab becomes visible; model changes follow the existing usage poll interval. No extra API request is made for clock updates. Changes to OpenCode's rules require a plugin update; the schedule is not automatically discovered from the usage endpoint.

## Display and verification

Wide toolbars show Peak / Off-Peak text next to the logo. At toolbar widths <=560px, the text is hidden and an absolute-positioned dot stays within the existing logo width. The button's accessible label and tooltip identify the period; expanded details describe the UTC rule. The period can still display while usage credentials or data are unavailable.

Tests cover every start/end boundary, weekends, equivalent UTC/JST timestamps, unsupported models/providers, invalid selections, model switching, minute-boundary updates without usage requests, tab visibility recovery and missing usage data. The pure schedule suite also passed with `TZ=Pacific/Honolulu`.

A local Edge fixture used the built plugin bundle and the installed rc.2 ui-conversation package's InputBar CSS. At widths 240, 320 and 560px the usage chip remained 36px and the send action stayed inside the row. At 800px the text was visible and the chip measured about 290px (three 100% usage windows plus Off-Peak). Expanded details showed the UTC rule at 320px. This is fixture validation, not an authenticated Harness screenshot or a production billing check.
