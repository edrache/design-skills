# Necromancer Island – MVP Simulation Design Document

## 1. Design Goal

Create a small-scale systemic prototype where a living world tries to maintain **local equilibrium**, while the player (a necromancer) disrupts it. The game has **no win condition**. Failure is defined as *loss of influence*. The core experience is observing how local systems collapse, recover, or overshoot after player intervention.

The prototype should prioritize **clarity of cause → effect**, not content volume.

---

## 2. World Representation

### 2.1 Grid

* World is a **2D square grid** (recommended: 20×20 for prototype).
* Each cell represents exactly **one area type**.
* Grid updates in **discrete turns**.

### 2.2 Area Types (MVP)

* Plain (default / neutral)
* Forest
* Village
* City
* Water (river or sea – same rules)
* Mountains (impassable, blocks region connectivity)

---

## 3. Regions (Local Equilibrium)

### 3.1 Definition

* A **region** is a group of connected cells.
* Connectivity is blocked by Mountains and Water.
* Regions are recalculated via flood-fill when the map changes.

### 3.2 Region State

Each region tracks:

* Total Sustain Capacity
* Total Population Demand
* Stability (abstract scalar)
* Death Severity (accumulated)

Regions are simulated **independently**.

---

## 4. Core Resources

### 4.1 Sustain

Represents combined **food + water**.

Sources:

* Forests
* Water

Consumers:

* Villages
* Cities

Sustain flows only **within the same region**, between adjacent cells.

---

## 5. Cell State

Each cell stores:

* `type`
* `population` (0 for non-human areas)
* `sustain` (local)
* `stability`

All numeric values are **hidden from the player**.

---

## 6. Simulation Turn Order

Each turn executes in the following order:

### 6.1 Sustain Production

* Forests and Water generate Sustain.

### 6.2 Sustain Flow

* Sustain spreads to neighboring cells (simple diffusion).

### 6.3 Consumption

* Villages/Cities consume Sustain proportional to Population.

### 6.4 Regression

If Sustain < Demand:

* Population decreases
* Stability decreases

### 6.5 Transformation

* If Population reaches 0:

  * Village / City → Plain
  * Forest → Plain
  * Death is registered in the region

### 6.6 Expansion

If Sustain surplus AND high Stability:

* Village / City / Forest may convert a neighboring Plain.
* New cell starts with low Stability.

---

## 7. Local Carrying Capacity

For each region:

```
Sustain Capacity = sum(Forest + Water output)
Population Demand = sum(Population costs)
```

Rules:

* If Demand ≤ Capacity → region stabilizes
* If Demand > Capacity → region enters regression

This is the **only economic rule** in the game.

---

## 8. Necromancer (Player)

### 8.1 Role

The necromancer introduces **local disturbances**, not global control.

### 8.2 Actions (MVP)

* Kill population on a selected cell
* Create a Death Source (temporary object):

  * Reduces Stability in adjacent cells
  * Causes passive deaths

Actions are **local**, but effects propagate via the simulation.

---

## 9. Death Severity

Each death increases **regional Death Severity**.

Deaths are worse if:

* They occur in high-population cells
* They trigger cascading regressions

Death Severity affects:

* How long the necromancer stays dead
* How aggressively the region rebalances

---

## 10. World Reaction

If regional Death Severity exceeds a threshold:

* The region spawns a repression event
* Necromancer is killed

There is **no global response**.

---

## 11. Necromancer Death & Time Skip

### 11.1 Death Duration

```
Death Turns = f(sum of regional Death Severity)
```

### 11.2 During Death

* Simulation continues
* Regions rebalance independently
* Some stabilize, others overshoot into famine

### 11.3 Return

Player returns to a **changed, inconsistent world**.

---

## 12. Player Feedback (No Numbers)

All information is conveyed visually:

* Stability → color saturation
* Regression → ruins, decay
* Overpopulation → cluttered visuals
* Healthy regions → motion, brightness

Learning is observational.

---

## 13. Failure Condition

The game ends when:

* Player actions no longer meaningfully change any region

Failure = **loss of systemic influence**, not death.

---

## 14. Prototype Scope Notes

* No UI for statistics
* No meta-progression
* No narrative
* No optimization beyond correctness

The goal is to validate:

* Emergence
* Readability of local equilibrium
* Meaningful player disturbance

---

## 15. Open Parameters (Tuning)

Developer should expose constants for:

* Sustain production rates
* Population consumption
* Expansion thresholds
* Stability decay/regeneration
* Death Severity thresholds

These values are expected to change during testing.
