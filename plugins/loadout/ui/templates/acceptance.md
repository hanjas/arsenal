# Acceptance — <Project>

Generated from `UI-SPEC.md`. **One line per screen × state × breakpoint**; each line is
checked in both light and dark. Plus one contrast line per screen.

Checked by `/verify`. The visual lines need the Playwright MCP — if it isn't available,
`/verify` skips them and reports them as **not run** (never as passed).

Generation rule: for each screen, for each of its five states
(loading · empty · error · success · partial), emit one line at **1440** and one at **390**.
Then one `contrast` line for the screen.

## <Screen name>
- [ ] <screen> · loading · 1440 — <expected result, light & dark>
- [ ] <screen> · loading · 390 — <expected result, light & dark>
- [ ] <screen> · empty · 1440 — <expected>
- [ ] <screen> · empty · 390 — <expected>
- [ ] <screen> · error · 1440 — <expected>
- [ ] <screen> · error · 390 — <expected>
- [ ] <screen> · success · 1440 — <expected>
- [ ] <screen> · success · 390 — <expected>
- [ ] <screen> · partial · 1440 — <expected>
- [ ] <screen> · partial · 390 — <expected>
- [ ] <screen> · contrast — text/bg ≥ 4.5:1, UI/boundary ≥ 3:1 against tokens

## <Screen name>
- [ ] ...
  <!-- repeat per screen -->
