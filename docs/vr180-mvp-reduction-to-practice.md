# MVP / Reduction-to-Practice Spec — Thin Vertical Slice

> **Status:** Engineering spec for the smallest build that proves the invention and
> supports a filing. Internal.
> **Companion to** `docs/vr180-invention-disclosure.md` (the mechanism) and
> `docs/vr180-platform-strategy.md` (the strategy). **Not legal advice.**
> **Goal of this slice:** demonstrate all seven pipeline steps end-to-end on *one* short
> capture, in *one* real room, on a *standalone* headset — enough to (a) validate the
> perceptual gap over video+passthrough and (b) constitute a reduction to practice for the
> two novel elements (behavioral zones; placement-coupled viewpoint streaming).

---

## 1. Scope discipline (what this slice is and is NOT)

**IS:** one seated performer, ~20–60 s loop, a single support-zone, auto-placement onto a
real sofa/chair, correct occlusion, viewpoint-pruned streaming, viewer can lean/step within
a ~1.5 m presence volume with true parallax.

**IS NOT (deferred):** full-length content, walking performers, multiple performers,
self-serve creator tooling, AI/conversational interaction, haptics, marketplace, payments,
synthesis. Every one of these is a *later* layer; adding any of them now dilutes the proof
and multiplies risk.

**Success = a Quest-class user seeing a life-size person seated on their real sofa, partly
occluded by the real sofa arm, whom they can lean around and see new geometry — streamed,
not preloaded whole.** If that isn't compelling, stop and rethink before spending more.

---

## 2. Pipeline slice, component by component

### 2.1 Capture (Step A)
- **Rig:** fixed, calibrated multi-camera array around a seated subject. Start with a
  half-dome of **8–16 synchronized cameras** (global-shutter, genlocked or software-synced
  with sub-frame alignment) covering the front hemisphere + shallow sides — matching the
  bounded presence volume, not a full 360° stage.
- **Calibration:** intrinsic + extrinsic via a calibration target; store per-camera
  parameters. Metric scale established here (critical for life-size placement later).
- **Lighting:** even, diffuse, static — minimizes reconstruction artifacts on a first slice.
- **Output:** synchronized multi-view frames + calibration + a metric reference.

### 2.2 Reconstruct human volume (Step B)
- **Method:** per-frame **4D Gaussian-splat** reconstruction (dynamic splats) with the
  performer segmented from the capture background (matting) so the asset is *only the
  person*. NeRF-family alternatives acceptable but splats favored for headset rasterization.
- **Temporal handling:** reconstruct as a sequence; establish per-frame splat sets with as
  much cross-frame coherence as the toolchain allows (feeds compression in 2.6).
- **Output:** time-varying splat asset in a metric coordinate frame, with a defined origin
  and up-vector.
- **Acceptance:** free-viewpoint render from a novel view (not a capture camera) is visibly
  correct within the presence volume; off-axis lean reveals genuine new geometry.

### 2.3 Segment behavioral zones (Step C — novel)
For the slice, the minimal zone set:
- **Support/contact zone:** the region + plane where the performer's seat meets a surface,
  with an expected support-plane normal (up) and an approximate seat height/footprint.
- **Facing reference:** a forward vector for the staged performance.
- **Navigable-boundary zone:** the volume within which reconstruction quality is guaranteed
  (bounds the viewer's reachable viewpoints; keeps streaming pruning tractable).
- **Authoring:** a tiny tool (even a config + preview) to place/verify these on the asset;
  auto-propose the support zone from the seated pose, human-confirm. Zones stored as
  structured metadata attached to the asset.
- **Acceptance:** zones are machine-readable and consumed by the solver in 2.4 with no
  manual per-room tuning.

### 2.4 Inspect room geometry (Step D)
- Consume the headset scene layer: **semantically-labeled surfaces** (floor, seat/sofa,
  wall) + a **depth** representation for occlusion. Use the platform Scene/Depth APIs; do
  not reinvent scanning.
- **Acceptance:** the app reliably identifies at least one seat surface with a plane,
  footprint, and metric height in a real living room; graceful "no seat found → guided
  placement" fallback.

### 2.5 Auto placement/scale/orientation (Step E — solver)
Minimal constraint formulation for the slice:
- **Hard constraints:** support-zone plane coincident with a detected seat surface plane;
  support-zone footprint ≤ seat footprint; asset scale = metric (life-size) from room
  dimensions.
- **Soft constraints (weighted objective):** facing reference oriented toward the viewer's
  current sight line; navigable-boundary zone fits within detected free floor; minimize
  intersection with other real geometry.
- **Solve:** closed-form seat-alignment for the hard constraints, then a small optimization
  / scoring over discrete candidate yaw angles for the soft terms. Deterministic fallback
  to guided manual placement when hard constraints can't be met.
- **Output:** a single rigid transform + scale.
- **Acceptance:** across ≥5 different real rooms, the performer auto-seats on the sofa at
  life-size, facing a sensible direction, with no manual dragging in the common case.

### 2.6 Occlusion (Step F)
- Depth-test the rendered splats against the headset depth map / scene mesh each frame so
  the **real sofa arm occludes the virtual leg**; add edge refinement to reduce halos;
  keep stable under head motion.
- **Acceptance:** occlusion boundary is convincing and stable while the viewer moves within
  the presence volume; no obvious "floating in front of everything" artifact.

### 2.7 Viewpoint-coupled streaming (Step G + D→G coupling — novel)
- **Selection inputs:** the placement transform (2.5), the room occluders (2.4/2.6), and the
  **reachable-viewpoint set** bounded by the navigable-boundary zone (2.3).
- **Selection logic:** transmit/decode/render only splats that can be seen from *some*
  reachable viewpoint given the occluders; **LOD decreases with distance**; drop geometry
  outside the reachable frustum union or occluded by a labeled real surface.
- **Compression:** temporal delta encoding between frames (leaning on 2.2 coherence);
  optional gaze foveation if time permits (nice-to-have, not required for the proof).
- **Transport:** server-driven selection is fine for the slice; on-device selection is a
  later optimization. What must be true: the client is **not** loading the whole volume —
  the placement/occluder state provably reduces what's sent.
- **Acceptance (this is the filing-critical measurement):** with instrumentation, show that
  bytes/compute for a given rendered quality are **materially lower** than streaming the
  full volume, *because of* the placement+occluder coupling — and that quality within the
  presence volume is maintained. Capture the numbers; they matter for both product and patent.

---

## 3. Target hardware & stack (indicative)

- **Headset:** current standalone Quest-class device with splat rendering + Scene/Depth APIs.
- **Capture:** 8–16 synced global-shutter cameras + calibration target; a capture PC.
- **Reconstruction:** GPU workstation / cloud GPU for 4D splat reconstruction (offline for
  the slice; turnaround is not yet a product constraint).
- **Runtime:** on-device splat renderer + depth-tested occlusion; a lightweight streaming
  server for placement-aware selection.
- **Instrumentation:** capture bytes-streamed, decoded splat count, frame time, and a
  fixed-viewpoint quality metric, with/without the D→G coupling, for the §2.7 comparison.

---

## 4. Milestones (each independently demoable)

1. **M1 — Static volume in a room.** Reconstruct one *frame* (static), place it manually,
   render on headset with occlusion. Proves reconstruction + occlusion.
2. **M2 — Free-viewpoint parallax.** Same static volume, viewer leans/steps within the
   presence volume and sees genuine new geometry. Proves the perceptual gap vs. VR180.
3. **M3 — Behavioral zones + auto-placement.** Add zones; solver auto-seats the volume on a
   real sofa at life-size across ≥5 rooms. Proves Steps C + E.
4. **M4 — Time-varying.** Extend to the 20–60 s dynamic sequence (loop). Proves Step B over
   time + temporal compression.
5. **M5 — Viewpoint-coupled streaming + measurement.** Stream (not preload); instrument the
   §2.7 bandwidth/compute comparison. Proves Step G + the D→G coupling — the filing-critical
   result.

Ship M1→M5 in order; each is a checkpoint where the effort can be re-justified.

---

## 5. Top risks & mitigations (for this slice)

| Risk | Mitigation |
|---|---|
| Dynamic splat quality/bitrate on standalone HW | Short loop, small volume, front hemisphere only; static-first (M1/M2) before dynamic (M4) |
| Reconstruction turnaround/cost | Offline for the slice; not a product constraint yet |
| Room scanning noise / no seat detected | Deterministic guided-placement fallback; test across many real rooms early (M3) |
| Occlusion halos / instability | Edge refinement; validate under motion in M1 before adding complexity |
| D→G coupling doesn't actually save enough | Measure early (M5 is explicit); if marginal, the coupling claim and the product both need rethinking — better to learn now |

---

## 6. What this slice produces for each downstream need

- **Product:** a demoable proof of the core differentiator (spatial presence in your room),
  the thing to put in front of early users/investors.
- **Patent:** a reduction to practice of the two novel elements + the §2.7 measurement
  showing the concrete technical effect of the D→G coupling — materially strengthening a
  filing beyond a paper concept.
- **Roadmap:** validated building blocks (capture, reconstruction, zoning, solver, occlusion,
  streaming) that the creator toolchain (strategy Concept D), MR depth (Concept B),
  consent-bounded interaction (Concept C), and haptics (Concept E) all build on.

---

## 7. Consent/compliance — non-negotiable even in the slice

Even a one-performer demo must: obtain **explicit, scoped, written consent** for volumetric
capture and its intended uses; verify performer identity/age with retained records
(2257-style in the US); restrict access to the raw capture (biometric-grade likeness data);
and provide a documented deletion path. Bake this into the capture workflow from M1 — it is
cheaper to build in than to retrofit, and it becomes structural once the creator toolchain
exists.
