# Game Jam Project Brainstorm: Papercraft Goalkeeper

This document captures the core concept, visual aesthetics, control mechanics, and references for a small sports-themed game jam project. Use this file to resume development in a subsequent session.

---

## 1. Core Concept & Aesthetic (Theme: "Familiar")
* **The Pitch:** A rogue sorcerer has hexed the 2026 World Cup finals, forcing the opposing team to shoot unstoppable, magically enhanced balls. To restore balance without exposing the wizarding world to millions of TV viewers, a powerful wizard secretly swaps out the human goalkeeper with their shapeshifting **Magical Familiar** clumsily disguised in a standard soccer kit.
* **Visual Style:** A 2.5D or flat papercraft puppet aesthetic[cite: 1]. The character is a paper-like figure featuring articulated limbs, a distinct head, and a trunk[cite: 1]. The jersey and gloves look mundane[cite: 1], but subtle visual tells (like a hidden tail poking out or glowing eyes) hint at the creature's true form.
* **Animation Philosophy:** Procedural animation driven by an **Inverse Kinematics (IK)** and **Forward Kinematics (FK)** framework[cite: 1]. The visuals rely on the physical deformation, bending, stretching, and flapping of flat paper-like joints[cite: 1]. This perfectly represents a magical creature desperately trying to maintain a human shape as its rubbery limbs are pulled across the screen[cite: 1].

---

## 2. Technical Architecture & Perspective
* **Camera View:** **Third-Person (Facing the Keeper)**[cite: 1]
 * The camera sits out on the playing field looking back at the goal line[cite: 1].
 * *Consequence:* Maximizes the visual comedy and mechanical precision of the procedural puppet[cite: 1]. The full body is on display, turning the animation system into the central hook of the presentation[cite: 1].
* **Control Scheme:** **The Wizard's Hand (Magnetic Gloves)**
 * The player guides a single mouse, touch, or pointer cursor which acts as an invisible telekinetic target pulling the familiar's hands[cite: 1].
 * An **IK Solver** instantly calculates the joint angles for the arms to place the hands directly on the cursor for highly responsive blocking[cite: 1].
 * If the cursor extends past the maximum reach of the arms, the tension translates down the kinematic chain to pull the **Torso** along, dragging the keeper across the goal line[cite: 1].
 * The legs dangle, collapse, or step beneath the moving torso via physics or secondary IK loops[cite: 1], emphasizing the chaotic comedy of a creature that doesn't quite understand human anatomy[cite: 1].

---

## 3. Mathematical Layout (Implementation Notes)
* Since the action is locked to a 2D/2.5D plane facing the goal mouth, heavy 3D FABRIK calculations can be avoided[cite: 1].
* **Trigonometric Solver:** Use the **2D Law of Cosines** to compute joint angles (e.g., shoulder-to-elbow and elbow-to-hand) relative to the target vector[cite: 1]:

$$\cos(B) = \frac{a^2 + c^2 - b^2}{2ac}$$

* **Physics Loop Integration:**
 1. Read pointer position on the target plane[cite: 1].
 2. Compute hand IK targets[cite: 1].
 3. Apply velocity/force limits to prevent instantaneous teleportation, ensuring the paper body sweeps through the air with momentum[cite: 1].

---

## 4. Visual & Mechanical Research References
When resuming, review these titles for creative alignment:
* **Juice Galaxy / Juice World:** Exceptional reference for a character body whipping and stretching to follow a single mouse-driven IK target[cite: 1].
* **Heave Ho:** Great execution of simple physics-based limb traction and distinct visual rotation points[cite: 1].
* **Paper Mario: The Thousand-Year Door:** Reference for rigid-body rotation at joints using completely flat, paper-textured meshes[cite: 1].
* **Soccer Random / Basket Random:** Examples of minimalist, chaotic sports dynamics where unpredictable physics create immediate, high-engagement loops[cite: 1].

---

## 5. Immediate Next Steps
1. Set up a prototype scene containing a simple 3-segment kinematic chain (Shoulder $\rightarrow$ Elbow $\rightarrow$ Hand)[cite: 1].
2. Wire the hand segment to follow the cursor coordinates within constrained boundaries[cite: 1].
3. Establish ball spawning vectors aimed toward the bounding box of the goal[cite: 1].
4. Implement basic physics modifiers on the spawned balls to simulate the sorcerer's "hexes" (e.g., high-velocity fireballs, curving trajectory trails, or heavy-mass balls).
