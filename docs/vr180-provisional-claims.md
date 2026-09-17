# Provisional-Style Claim Set & Specification Outline (Draft)

> **Status:** Draft claim set + spec outline to hand to patent counsel. Internal.
> **NOT LEGAL ADVICE, NOT FILED CLAIMS.** This is drafting input for a qualified patent
> attorney. Claim scope, patentability, and jurisdictional strategy are counsel's
> determinations. Do not file, publicly disclose, or rely on any of this without counsel.
> A **provisional** application in practice needs a thorough *specification* (enablement +
> drawings); formal claims are optional in a US provisional but drafting them now disciplines
> the disclosure and sets up the non-provisional. **Domain-neutral wording throughout** —
> the mechanism is claimed for volumetric human presence generally (telepresence, live
> events, training, entertainment), not scoped to any application vertical.
> **Companion to** `docs/vr180-invention-disclosure.md` and `docs/vr180-mvp-reduction-to-practice.md`.

---

## 1. Terminology (define once, use consistently in the spec)

- **Volumetric representation** — a time-varying, free-viewpoint 3D representation of a
  person (e.g., Gaussian splats, neural volume, point set), reconstructed from multi-view
  capture, renderable from viewpoints other than the capture cameras.
- **Behavioral zone** — a labeled sub-region and/or reference frame of the volumetric
  representation that carries a *placement and/or interaction semantic* and an associated
  reference geometry (e.g., a *support zone* with an expected support plane; a *facing
  reference*; an *interaction zone*; a *navigable-boundary zone*).
- **Environment reconstruction** — a semantically-labeled reconstruction of a viewer's
  physical environment (labeled surfaces such as floor/seat/wall + a depth representation),
  obtained from a mixed-reality device.
- **Placement transform** — a rigid transform (position + orientation) and scale positioning
  the volumetric representation within the physical environment.
- **Reachable-viewpoint set** — the set of viewer viewpoints attainable from the current
  pose within the navigable-boundary zone.
- **Placement-dependent visible subset** — the subset of the volumetric representation
  selected for transmission/decoding/rendering as a function of the placement transform, the
  environment occluders, and the reachable-viewpoint set.

---

## 2. Independent claims (skeletons)

### Claim 1 — Method
A method comprising:
1. obtaining a **volumetric representation** of a person reconstructed from multi-view
   capture, the volumetric representation renderable from viewpoints other than capture
   viewpoints;
2. obtaining one or more **behavioral zones** associated with the volumetric representation,
   each behavioral zone specifying (i) a placement or interaction semantic and (ii) a
   reference geometry;
3. obtaining, from a mixed-reality device, an **environment reconstruction** comprising one
   or more semantically-labeled surfaces of a physical environment and a depth
   representation thereof;
4. **automatically determining a placement transform and a scale** for the volumetric
   representation by matching at least one behavioral zone to at least one of the
   semantically-labeled surfaces subject to one or more placement constraints;
5. compositing a rendering of the volumetric representation, positioned per the placement
   transform and scale, with the physical environment such that the depth representation
   causes at least one physical surface to **occlude** part of the rendering; and
6. selecting, as a function of (a) the placement transform, (b) the depth representation /
   occluders, and (c) a **reachable-viewpoint set** of a viewer, a **placement-dependent
   visible subset** of the volumetric representation, and transmitting and/or decoding the
   selected subset for said rendering.

*(Elements 2, 4, and 6 — and the dependency of 6 on the output of 4 — are the intended point
of novelty; elements 1/3/5 recite context that may be partly known and should be worded to
avoid over-claiming.)*

### Claim (independent) — System
A system comprising one or more processors and memory storing instructions that cause the
system to perform the method of Claim 1; optionally reciting distinct subsystems: a
reconstruction subsystem, a zoning subsystem producing the behavioral zones, a placement
solver producing the placement transform, an occlusion compositor, and a
**placement-aware streaming subsystem** wherein the placement solver's output is an input to
the streaming subsystem's selection.

### Claim (independent) — Non-transitory computer-readable medium
A non-transitory computer-readable medium storing instructions that, when executed, cause a
computing system to perform the method of Claim 1.

*(Consider also a narrower independent claim directed specifically to the **selection step
(element 6) alone** — "streaming a placement-dependent visible subset" — as a separate
inventive concept that can stand even if the placement solver is found anticipated, and
vice-versa a claim to the **zoning + solver** without the streaming coupling. Splitting the
two novel elements across independent claims hedges the prosecution.)*

---

## 3. Dependent-claim tree (fences / fallbacks)

**On behavioral zones (Claim 1):**
- D1. the behavioral zone comprises a **support zone** specifying an expected support plane;
  and element 4 aligns the support plane to a labeled horizontal seat or bed surface.
- D2. the behavioral zone comprises a **facing reference**; and element 4 orients the
  facing reference toward a sight line of the viewer.
- D3. the behavioral zone comprises a **navigable-boundary zone**; and the reachable-viewpoint
  set of element 6 is bounded by the navigable-boundary zone.
- D4. the behavioral zone comprises an **interaction zone**; further comprising generating a
  haptic-device control signal as a function of viewer proximity to the interaction zone.
- D5. at least one behavioral zone is **derived automatically** from a detected pose or
  skeleton of the person. *(covers the "no explicit zones" design-around)*
- D6. at least one behavioral zone is authored at capture time and stored as metadata
  traveling with the volumetric representation.

**On the placement solver (element 4):**
- D7. the scale is chosen from metric dimensions of the physical environment so the person
  is rendered **life-size** (or at a specified ratio).
- D8. the placement constraints comprise a **hard constraint** (support-plane coincidence
  and footprint compatibility) and one or more **soft constraints** combined in a weighted
  objective. *(claims the constraint formulation itself)*
- D9. responsive to no labeled surface satisfying the placement constraints, presenting a
  **guided placement** flow for viewer confirmation. *(fallback path)*
- D10. the determining comprises evaluating a plurality of **candidate orientations** and
  selecting one that optimizes the soft constraints.

**On occlusion (element 5):**
- D11. the occlusion is computed by depth-testing rendered primitives against the depth
  representation each frame with edge refinement at the occlusion boundary.
- D12. the occlusion is consistent with the placement transform such that a real object
  positioned between the viewer and the placed representation occludes it under head motion.

**On the placement-dependent streaming (element 6 — the crux):**
- D13. the selecting **excludes** portions of the volumetric representation occluded, for all
  viewpoints in the reachable-viewpoint set, by a labeled physical surface.
- D14. the selecting assigns a **level of detail** that decreases with distance from the
  viewer within the placement.
- D15. the selecting is further a function of a **gaze direction** of the viewer (foveation).
- D16. the volumetric representation is **temporally delta-encoded** between frames and the
  selecting operates on the delta-encoded stream.
- D17. the selecting is performed such that the transmitted data volume for a given rendered
  quality is **reduced relative to transmitting the entire** volumetric representation,
  by virtue of the placement transform and occluders. *(recites the technical effect)*
- D18. the reachable-viewpoint set is computed as a union of view frusta over viewpoints
  attainable within the navigable-boundary zone.

**On capture/reconstruction (elements 1–2):**
- D19. the volumetric representation comprises **Gaussian splats** reconstructed per frame.
- D20. the person is **segmented** from a capture background prior to reconstruction such
  that the volumetric representation excludes the capture environment.

---

## 4. Specification outline (what the provisional must actually contain)

A provisional's value is its **enablement + drawings**; thin provisionals lose the priority
benefit. Draft these sections (with counsel):

1. **Field.** Real-time volumetric human presentation in scene-aware mixed reality.
2. **Background.** The video-vs-volume gap; manual/incorrect placement; dynamic-volume
   bandwidth. *State problems, not solutions; avoid admissions about the prior art's scope.*
3. **Summary.** The seven-step pipeline; the two novel elements; the placement→streaming
   coupling and its technical effect.
4. **Brief description of drawings** (list; see §5).
5. **Detailed description**, mapping 1:1 to claim elements, each with **multiple
   embodiments** so dependent claims and design-arounds are supported:
   - capture rigs (camera-array; alternatives);
   - reconstruction (splats; neural volume; point sets);
   - behavioral zones (authored; pose-derived; the zone taxonomy);
   - environment reconstruction (platform Scene/Depth; alternatives);
   - placement solver (hard/soft constraints; candidate-orientation search; fallback);
   - occlusion (depth-test; mesh-test; edge refinement);
   - **placement-dependent streaming** (frustum-union selection; occluder culling; LOD;
     foveation; delta encoding; server-side vs on-device selection) — the fullest section,
     including the **bandwidth/compute measurement methodology** (ties to MVP §2.7/M5).
6. **Example workflow** — the MVP slice end-to-end (seated performer → real sofa → occluded,
   parallax-correct, streamed presence) as a concrete worked embodiment.
7. **Alternatives / variations** — enumerate the design-arounds from the disclosure so they
   are disclosed and claimable.
8. **Claims** (the §2/§3 set).
9. **Abstract** (see §6).

---

## 5. Drawings to prepare (examiner and enablement both need these)

- **FIG. 1** — system block diagram (capture → reconstruct → zoning → solver → compositor →
  placement-aware streaming → headset), showing the **solver-output → streaming-input arrow**.
- **FIG. 2** — a volumetric representation annotated with behavioral zones (support, facing,
  navigable-boundary, interaction).
- **FIG. 3** — environment reconstruction: labeled surfaces + depth.
- **FIG. 4** — placement solver aligning a support zone to a seat surface, life-size.
- **FIG. 5** — occlusion: real sofa arm occluding the placed representation.
- **FIG. 6** — reachable-viewpoint set within the navigable boundary; visible vs.
  culled/occluded geometry for the placement.
- **FIG. 7** — flowchart of the method (Claim 1 elements).
- **FIG. 8** — bandwidth/compute comparison (with vs. without placement coupling).

---

## 6. Draft abstract (placeholder wording)

> Techniques for presenting a reconstructed person as a spatial presence in mixed reality.
> A time-varying volumetric representation of a person is associated with behavioral zones
> specifying placement and interaction semantics. From a semantically-labeled reconstruction
> of a viewer's physical environment, a placement transform and scale are automatically
> determined by matching a behavioral zone to a labeled surface subject to constraints, and
> the representation is composited with real-object occlusion. A placement-dependent visible
> subset of the volumetric representation is selected for transmission and rendering as a
> function of the placement transform, the environment occluders, and the viewer's reachable
> viewpoints, reducing transmitted data for a given rendered quality.

---

## 7. Prosecution strategy notes (discuss with counsel)

- **Two inventive concepts, hedged:** keep independent claims for (i) zoning+solver and
  (ii) placement-coupled streaming, plus the combined Claim 1. If one is anticipated, the
  other survives.
- **Domain-neutral now, verticals later:** file broad (any person, any room). Adult-content
  wording adds nothing and narrows value; the same claims read on telepresence, live events,
  training, retail.
- **Technical effect front-and-center:** D17's data-reduction effect is the strongest
  anti-abstractness / non-obviousness anchor — support it with the MVP §2.7 measurement.
- **Priority + provisional:** a well-enabled provisional holds a date for 12 months; use that
  window to complete the MVP (M1–M5) and file the non-provisional with the measurement data.
- **Trade-secret carve-out:** do **not** disclose the innermost reconstruction/compression
  internals beyond what enablement requires; keep the hardest-to-reverse-engineer methods as
  trade secrets (see disclosure §8).
- **Freedom-to-operate is separate:** patentability ≠ freedom to operate. Have counsel run
  an FTO pass on volumetric-telepresence and splat-streaming patents before shipping.
