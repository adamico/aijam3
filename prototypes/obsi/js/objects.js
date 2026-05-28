// Base rectangle object class
/* eslint-disable no-undef, no-unused-vars */
class RectObject extends EngineObject {
    constructor(pos, size, color) {
        super(pos, size);
        this.color = color || WHITE;
        this.renderOrder = 0;
    }
    render() {
        drawRect(this.pos, this.size, this.color);
    }
}
