# 2026-05-28: autodefender-autorobosurvivor-postmortem

Two prototypes down before something clicked. Writing it down so I stop relearning the same lesson.

## autodefender

Defender clone. Ship flies and shoots on its own. My only job: spend money in a shop between runs, pick upgrades, watch the next run go better. The lever-pull from [[lever-interaction-model]] mapped onto a shop UI.

What went wrong: the shop loop was too thin. A handful of upgrades, each a small numeric bump, none of them changing how a run *felt*. Worse, by taking the stick away I'd thrown out the thing that made Defender Defender. Screen full of action, nothing to do with my hands. Arcade fun gone. Configuration fun not dense enough to replace it.

## autorobosurvivor

Pivot. Keep the auto-play premise but borrow the survivor genre's level-up cadence, since that's a proven way to make "watching" feel like deciding. Robotron as the base, auto-move, auto-shoot, hordes, with survivor-style mid-run upgrade picks as the agency. I even hedged with an optional control to let the player aim shots.

Same hole, dressed up better. The optional aim was the tell. With aim on, it's a twin-stick shooter with a menu, the "auto" premise is decoration. With aim off, the screen does its thing and I'm waiting for the next level-up prompt. Hybrid didn't resolve the tension, it exposed it. You can't half-take-the-stick-away.

## the lesson

Both prototypes did the same thing wrong. I removed the kinetic part of an arcade game and tried to replace it with menus. Menus don't replace moving and shooting. The fun has to stay on the screen.

---

Third prototype: **obsi**. Galaga skeleton. Movement is automatic. Player agency is one button. That's the interface.
