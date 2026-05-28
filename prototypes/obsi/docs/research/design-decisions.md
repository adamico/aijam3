# **The Magic Combo Design**

## **Controls**
- **Tap button** (quick press/release) → Instant direction reversal (emergency dodge)
- **Hold button** → Drastically slow movement + stop auto-shooting + charge power shot
- **Release after hold** → Fire charged shot + reverse direction + brief speed boost

## **Core Mechanics**

### **Movement Speeds**
- Normal: 1.0 (auto-moving left/right)
- Charging: 0.2-0.3 (can micro-dodge but very vulnerable)
- Speed burst: 1.5 for ~0.5 seconds after releasing charge (dramatic escape)

### **Shooting**
- **Auto-shoot**: Low damage, low fire rate (unpredictable chip damage)
- **Charged shot**: High damage, pierces enemies, larger projectile (worth the risk)
- Auto-shooting **stops** while charging

## **The Risk/Reward Loop**

### **Low Risk** (Tap to reverse)
- Quick repositioning
- Maintains auto-shooting
- No charge benefits
- Pure dodge tool

### **High Risk** (Hold to charge)
- Slowed to crawl (vulnerable)
- No auto-shooting (can't defend)
- Sitting target for falling bombs
- BUT: Devastating charged shot + explosive reverse escape

### **Skill Expression**
- **Beginner**: Charge only in clear moments, tap dodge frequently
- **Intermediate**: Use slow movement to micro-position while charging
- **Advanced**: Thread bullet patterns in slow-mo, maximize charge uptime
- **Master**: Chain tap-dodges with partial charges, position-perfect full charges

## **Visual/Audio Feedback**

### **Charging State**
- Player glows (white → cyan → bright flash)
- Particle trail/aura builds up
- Screen subtle pulse
- Charge meter above player
- Speed lines reduce (visual slowdown)

### **Release Moment**
- Screen shake
- Bright muzzle flash
- Large projectile with trail
- Speed burst whoosh effect
- Direction reversal is clear

## **Why This Works**

✅ **One button, three meaningful actions** (tap/hold/release)
✅ **Constant decision-making** (dodge vs. charge vs. commit)
✅ **Multiple risk layers** (slow + no shooting + directional commitment)
✅ **High skill ceiling** (slow-motion micro-dodging)
✅ **Feels amazing** (bullet-time charge → explosive burst escape)
✅ **Easy to learn** ("tap dodge, hold for big shot")
✅ **Perfect for Space Invaders** (positioning matters, timing matters)

## **Balancing Levers**

- Charge time to full (1-2 seconds recommended)
- Slow movement speed while charging (0.2-0.3x)
- Charged shot power (pierce 1-2 rows + explosion?)
- Speed burst duration (0.3-0.5 seconds)
- Auto-shoot fire rate (every 0.5-1 second)
- Tap reverse cooldown (optional: 0.2s to prevent spam)

---

**This is your jam game.** Simple to explain, deep to master, unique mechanic, feels incredible. 🎮✨

Your risk/reward balance is well-tuned:

- **Low risk (tap):** Quick dodge, maintains offense
- **High risk (charge):** Massive vulnerability (slow + no shooting) for big payoff
- **Commitment reward:** Speed burst escape after full charge

## Questions

1. **Why did you decide to prevent tap reversal during speed_burst?** (line in `handle_tap()`: `state ~= "speed_burst"`) - This seems intentional for gameplay balance, but how does it feel when testing?

2. **The tap cooldown of 15 frames (~0.25s)** - Have you playtested whether this feels restrictive or just right for preventing accidental double-taps?

3. **Charge timer continues during reversal** - This is brilliant for maintaining flow, but was this always the plan or did you discover it through iteration?

4. **How do you envision the enemy patterns working?**
5. **Will they be designed to *force* charging (clustered formations) or to *punish* it (frequent bomb drops)?**

---
