/* eslint-disable no-undef, no-unused-vars */
class Bullet extends RectObject {
    constructor(pos, vel) {
        super(pos, vec2(0.45, 1.0), rgb(.95, .95, .95));
        this.vel = vel;
        this.renderOrder = 20;
    }
    update() {
        this.pos = this.pos.add(this.vel);
        if (this.pos.y > LEVEL_SIZE.y + 2)
            this.destroy();
    }
}

class ChargedBullet extends RectObject {
    constructor(pos, vel) {
        super(pos, vec2(0.8, 1.5), rgb(.95, .6, .2)); // Larger, orange
        this.vel = vel;
        this.renderOrder = 20;
    }
    update() {
        this.pos = this.pos.add(this.vel);
        if (this.pos.y > LEVEL_SIZE.y + 2)
            this.destroy();
    }
}

class EnemyBullet extends RectObject {
    constructor(pos, vel) {
        super(pos, vec2(0.25, 1.2), rgb(.95, .3, .3)); // Red
        this.vel = vel;
        this.renderOrder = 20;
    }
    update() {
        this.pos = this.pos.add(this.vel);
        if (this.pos.y < 0 - 2 || this.pos.y > LEVEL_SIZE.y + 2)
            this.destroy();
    }
}
