# Game Jam Project Brainstorm: Spell Keeper

This document captures the core concept, visual aesthetics, control mechanics, and references for a small sports-themed game jam project. Use this file to resume development in a subsequent session.

---

## 1. Core Concept & Aesthetic
* **The Pitch:** A high-tension, physics-driven sports game where the player controls a single, hyper-flexible goalkeeper defending a goal against an onslaught of balls, pucks, and absurd sports objects.
* **Visual Style:** A 2.5D or flat papercraft puppet aesthetic. The character is a paper-like figure featuring articulated limbs, a distinct head, and a trunk. 
* **Animation Philosophy:** Procedural animation driven by an **Inverse Kinematics (IK)** and **Forward Kinematics (FK)** framework. The visuals rely on the physical deformation, bending, stretching, and flapping of flat paper-like joints.

---

## 2. Technical Architecture & Perspective
* **Camera View:** **Third-Person (Facing the Keeper)**
  * The camera sits out on the playing field looking back at the goal line.
  * *Consequence:* Maximizes the visual comedy and mechanical precision of the procedural puppet. The full body is on display, turning the animation system into the central hook of the presentation.
* **Control Scheme:** **Magnetic Gloves (Targeting the Hands)**
  * The player guides a single mouse, touch, or pointer cursor which acts as an invisible magnetic target.
  * An **IK Solver** instantly calculates the joint angles for the arms to place the hands directly on the cursor for highly responsive blocking.
  * If the cursor extends past the maximum reach of the arms, the tension translates down the kinematic chain to pull the **Torso** along, dragging the keeper across the goal line.
  * The legs dangle, collapse, or step beneath the moving torso via physics or secondary IK loops.

---

## 3. Mathematical Layout (Implementation Notes)
* Since the action is locked to a 2D/2.5D plane facing the goal mouth, heavy 3D FABRIK calculations can be avoided.
* **Trigonometric Solver:** Use the **2D Law of Cosines** to compute joint angles (e.g., shoulder-to-elbow and elbow-to-hand) relative to the target vector:

$$\cos(B) = \frac{a^2 + c^2 - b^2}{2ac}$$

* **Physics Loop Integration:**
  1. Read pointer position on the target plane.
  2. Compute hand IK targets.
  3. Apply velocity/force limits to prevent instantaneous teleportation, ensuring the paper body sweeps through the air with momentum.

---

## 4. Visual & Mechanical Research References
When resuming, review these titles for creative alignment:
* **Juice Galaxy / Juice World:** Exceptional reference for a character body whipping and stretching to follow a single mouse-driven IK target.
* **Heave Ho:** Great execution of simple physics-based limb traction and distinct visual rotation points.
* **Paper Mario: The Thousand-Year Door:** Reference for rigid-body rotation at joints using completely flat, paper-textured meshes.
* **Soccer Random / Basket Random:** Examples of minimalist, chaotic sports dynamics where unpredictable physics create immediate, high-engagement loops.

---

## 5. Immediate Next Steps
1. Set up a prototype scene containing a simple 3-segment kinematic chain (Shoulder $\rightarrow$ Elbow $\rightarrow$ Hand).
2. Wire the hand segment to follow the cursor coordinates within constrained boundaries.
3. Establish ball spawning vectors aimed toward the bounding box of the goal.
