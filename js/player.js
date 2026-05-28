/* eslint-disable no-undef, no-unused-vars */
class Player extends RectObject {
    constructor(pos) {
        super(pos, PLAYER_CONFIG.size, rgb(.2, .9, .95));
        this.dirX = -1; // Current direction (-1 or 1)
        this.targetVelX = -PLAYER_CONFIG.speed;
        this.currentVelX = -PLAYER_CONFIG.speed;
        this.state = 'moving';
        this.renderOrder = 10;

        // Input and timers
        this.entryTimer = new Timer();
        this.chargeTimer = new Timer();
        this.burnoutTimer = new Timer();
        this.speedBurstTimer = new Timer();
        this.pacifistTimer = new Timer();
        this.cooldown = new Timer();

        // Magic Combo state
        this.holdTime = 0;
        this.pressDir = 0;

        // Temperature system
        this.temperature = 0;
    }

    update() {
        // Cool temperature passively
        this.temperature = max(0, this.temperature - TEMP_COOLING_RATE);

        // Check for overheat - trigger burnout if overheated
        if (this.temperature >= TEMP_OVERHEAT && this.state !== 'burnout' && this.state !== 'speed_burst') {
            this.state = 'burnout';
            this.targetVelX = this.dirX * PLAYER_CONFIG.speed * PLAYER_CONFIG.speedBurnout;
            this.burnoutTimer.set(1);
        }

        // State machine
        if (this.state === 'pre_entry') {
            this.updatePreEntry();
        }
        else if (this.state === 'moving') {
            this.updateMoving();
        }
        else if (this.state === 'charging') {
            this.updateCharging();
        }
        else if (this.state === 'charged') {
            this.updateCharged();
        }
        else if (this.state === 'speed_burst') {
            this.updateSpeedBurst();
        }
        else if (this.state === 'burnout') {
            this.updateBurnout();
        }
        else if (this.state === 'pacifist') {
            this.updatePacifist();
        }
        else if (this.state === 'exiting') {
            this.updateExiting();
        }

        // Apply velocity with acceleration
        this.pos.x += this.currentVelX;
        this.clampToPlayfield();
    }

    updatePreEntry() {
        // Pre-entry: no movement, input disabled
        this.targetVelX = 0;
        this.currentVelX = 0;
        const progress = 1 - this.entryTimer.getPercent();
        this.pos.y = lerp(progress, -2, PLAYER_Y);
        if (this.entryTimer.elapsed()) {
            this.pos.y = PLAYER_Y;
            this.state = 'pacifist';
            this.pacifistTimer.set(0.5);
        }
    }

    updateExiting() {
        // Exiting: no movement, input disabled
        this.targetVelX = 0;
        this.currentVelX = 0;
    }

    updateMoving() {
        // Target speed for moving state
        this.targetVelX = this.dirX * PLAYER_CONFIG.speed;
        this.accelerateVelocity(PLAYER_CONFIG.accelNormal);

        // Auto-shoot with temperature-based fire-rate bonus
        if (!this.cooldown.active()) {
            bullets.push(new Bullet(this.pos.add(vec2(0, 0.5)), vec2(0, 0.8)));
            this.temperature += TEMP_PER_SHOT;

            // Set next cooldown
            let cooldownDuration = PLAYER_CONFIG.cooldownFrames / 60;
            if (this.temperature >= TEMP_WARM_MIN && this.temperature <= TEMP_WARM_MAX) {
                cooldownDuration = max(PLAYER_CONFIG.cooldownMin / 60, cooldownDuration * PLAYER_CONFIG.cooldownBonus);
            }
            this.cooldown.set(cooldownDuration);
        }

        // Magic Combo input
        if (btnPressed()) {
            this.state = 'charging';
            this.pressDir = this.dirX;
            this.holdTime = 0;
            this.chargeTimer.set(1); // Full charge is 1 second
        }
    }

    updateCharging() {
        // Slow movement during charge
        this.targetVelX = this.dirX * PLAYER_CONFIG.speed * PLAYER_CONFIG.speedCharging;
        this.accelerateVelocity(PLAYER_CONFIG.accelCharging);

        if (btnReleased()) {
            // Tap: reverse direction and continue moving
            this.dirX *= -1;
            this.state = 'moving';
            this.pacifistTimer.set(0.5);
        }
        else if (btnDown()) {
            this.holdTime++;
            if (this.chargeTimer.elapsed()) {
                // Charge complete - enter charged state
                this.state = 'charged';
                this.targetVelX = this.dirX * PLAYER_CONFIG.speed;
                this.burnoutTimer.set(1); // Burnout timer
            }
        }
    }

    updateCharged() {
        // Resume normal speed
        this.targetVelX = this.dirX * PLAYER_CONFIG.speed;
        this.accelerateVelocity(PLAYER_CONFIG.accelNormal);

        if (btnReleased()) {
            // Charged release: fire charged shot, speed burst, reverse
            bullets.push(new ChargedBullet(this.pos.add(vec2(0, 0.5)), vec2(0, 1.2)));
            this.dirX *= -1;
            this.targetVelX = this.dirX * PLAYER_CONFIG.speed * PLAYER_CONFIG.speedBurst;
            this.state = 'speed_burst';
            this.speedBurstTimer.set(0.3);
        }
        else if (btnDown() && this.burnoutTimer.elapsed()) {
            // Held too long - trigger burnout
            this.state = 'burnout';
            this.targetVelX = this.dirX * PLAYER_CONFIG.speed * PLAYER_CONFIG.speedBurnout;
            this.burnoutTimer.set(1);
        }
    }

    updateSpeedBurst() {
        // High speed movement
        this.targetVelX = this.dirX * PLAYER_CONFIG.speed * PLAYER_CONFIG.speedBurst;
        this.accelerateVelocity(PLAYER_CONFIG.accelBurst);

        if (this.speedBurstTimer.elapsed()) {
            // Return to normal
            this.state = 'moving';
            this.targetVelX = this.dirX * PLAYER_CONFIG.speed;
        }
    }

    updateBurnout() {
        // Fast movement, input locked
        this.targetVelX = this.dirX * PLAYER_CONFIG.speed * PLAYER_CONFIG.speedBurnout;
        this.accelerateVelocity(PLAYER_CONFIG.accelBurnout);

        if (this.burnoutTimer.elapsed()) {
            // Burnout complete
            this.state = 'moving';
            this.targetVelX = this.dirX * PLAYER_CONFIG.speed;
        }
    }

    updatePacifist() {
        // Moving but no shooting
        this.targetVelX = this.dirX * PLAYER_CONFIG.speed;
        this.accelerateVelocity(PLAYER_CONFIG.accelNormal);

        if (this.pacifistTimer.elapsed()) {
            // Resume normal state
            this.state = 'moving';
            this.cooldown.set(0);
        }
    }

    accelerateVelocity(accelFrames) {
        const accel = 1 / accelFrames;
        this.currentVelX += (this.targetVelX - this.currentVelX) * accel;
    }

    clampToPlayfield() {
        const halfSize = this.size.x * 0.5;
        if (this.pos.x - halfSize <= 0) {
            this.pos.x = 0 + halfSize;
            this.currentVelX = 0;
            this.dirX *= -1;
            this.targetVelX *= -1;
        }
        if (this.pos.x + halfSize >= LEVEL_SIZE.x) {
            this.pos.x = LEVEL_SIZE.x - halfSize;
            this.currentVelX = 0;
            this.dirX *= -1;
            this.targetVelX *= -1;
        }
    }

    render() {
        if (!this.destroyed) {
            const p = this.pos;
            const s = .22;
            drawRect(p.add(vec2(0, .3)), vec2(s, s * 2), this.color);
            drawRect(p, vec2(s * 7, s * 3), this.color);
            drawRect(p.add(vec2(-1.1, -.3)), vec2(s * 2, s), this.color);
            drawRect(p.add(vec2(1.1, -.3)), vec2(s * 2, s), this.color);
        }
    }
}
