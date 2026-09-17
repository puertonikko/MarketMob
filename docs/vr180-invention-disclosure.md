# Invention Disclosure (Draft) — Viewpoint-Coupled Volumetric Human Placement in Mixed Reality

> **Status:** Draft invention disclosure for discussion with patent counsel. Internal.
> **Not legal advice.** Claim sketches below are *drafting targets* to hand to a patent
> attorney, not filed claims and not a legal opinion on patentability. Run the prior-art
> sweep (§8) and retain qualified counsel before filing. Do not treat any statement here
> as a representation that the mechanism is novel or non-obvious — that is counsel's call.
> **Companion to** `docs/vr180-platform-strategy.md` (Concepts A + B, and the
> broad-idea-vs-narrow-method discipline).

---

## 1. One-sentence summary

A system that reconstructs a real performer as a time-varying volumetric asset, tags it
with **behavioral zones**, inspects the viewer's scanned room geometry, **automatically
solves placement/scale/orientation** by aligning those zones to detected real surfaces,
preserves **physical occlusion** against the real environment, and streams **only the
geometry required for the viewer's current and reachable viewpoints** — with the placement
decision *coupling into* the streaming decision so the two are not independent.

The claimed novelty is **not** "show a 3D person in mixed reality." It is the **specific,
closed-loop coupling** of (a) behavioral-zone-driven automatic placement against real room
semantics and (b) placement-aware, viewpoint-dependent volumetric streaming.

---

## 2. Field and problem

**Field.** Real-time rendering and streaming of dynamic (time-varying) volumetric captures
of humans into scene-aware mixed reality on standalone headsets.

**Problems the invention solves:**

1. **Video ≠ presence.** Background-removed stereoscopic video over passthrough (state of
   the art today, e.g. DeoVR) is still fundamentally *video*: it is locked to the capture
   camera's viewpoint, provides no off-axis motion parallax, and cannot be walked around.
   The subject does not *occupy* the room; it hovers in front of it.
2. **Manual, incorrect placement.** Existing MR compositing largely floats the subject and
   leans on the user to align it. There is no automatic, semantically-correct placement
   (right seat, right scale, right facing) against the viewer's actual furniture, and no
   correct occlusion by real objects.
3. **Bandwidth of dynamic volumes.** Time-varying volumetric human data at convincing
   quality is far too large to stream naively to mobile-class GPUs; sending the whole
   volume every frame is infeasible.

**Key enabling context (why now).** Headset platforms now expose Gaussian-splat rendering
and scene-aware MR primitives (scene mesh, semantic labels, depth). The foundational
rendering and scanning layers therefore need not be reinvented; the proprietary work — and
the plausible invention — sits in **reconstruction → zoning → placement → occlusion →
viewpoint-coupled streaming**.

---

## 3. The inventive pipeline (step-by-step)

The mechanism is the following ordered pipeline. Each step names the *specific* operation
and why it is more than an obvious combination. Steps **C, D, and G**, and the **D→G
coupling**, are the load-bearing candidates for claims.

**Step A — Capture.** Multi-view capture of a live performer (calibrated camera array or
equivalent), producing synchronized multi-view frames over time.

**Step B — Reconstruct human volume.** Per-frame reconstruction of the performer as a
time-varying volumetric asset (e.g., 4D Gaussian splats / neural volume), segmented from
the capture background so the asset is the *person as a spatial entity*, not a framed video.
*Distinguisher:* the output is a free-viewpoint volume with genuine geometry, not a
stereo image pair.

**Step C — Segment behavioral zones (novel element).** Annotate the reconstructed volume
with **behavioral zones**: labeled sub-regions and reference frames of the asset that carry
*placement and interaction semantics* rather than just geometry. Examples:
- a **support/contact zone** ("this region is intended to rest on a horizontal seat/bed
  surface") with an expected support plane and up-vector;
- a **facing/orientation reference** (the direction the performance is staged toward);
- **interaction/affordance zones** (regions the viewer may approach or that drive haptics —
  see strategy doc Concept E);
- **navigable-boundary zones** (where a viewer may move around the asset vs. where geometry
  is undefined/low-quality).
These zones are authored at (or derived from) capture time and travel with the asset as
metadata. *Distinguisher:* zones convert a raw volume into a **placeable, self-describing
entity** — the input that makes the automatic placement solver (Step E) possible. Simple
"remove the background" pipelines have no analog.

**Step D — Inspect viewer room geometry.** From the headset's scene understanding, obtain
the room's reconstructed surfaces with **semantic labels** (floor, wall, seat/sofa, bed,
table) plus a depth representation for occlusion.

**Step E — Automatically choose placement / scale / orientation (solver, novel element).**
A placement solver matches **behavioral zones (C)** to **semantic room surfaces (D)** and
outputs a rigid transform (position, orientation) plus scale for the asset, subject to
constraints:
- align the support/contact zone to an appropriate real support surface of compatible
  size/height (seat zone → sofa/chair; recline zone → bed);
- set scale from real-world metric room dimensions so the performer is life-size (or a
  chosen ratio), rather than arbitrary;
- orient the facing reference toward the viewer / a valid sight line;
- respect navigable-boundary zones against free floor space so the viewer has room to move.
*Distinguisher:* placement is **content-adaptive and semantics-driven** — a function of
*which zone must meet which kind of surface*, not a fixed offset or a manual drag. The
solver, its constraint formulation, and its fallback behavior (guided setup when no
compatible surface exists) are the claimable core.

**Step F — Preserve physical occlusion.** Composite the placed asset with real-time
depth/mesh-tested occlusion so real objects correctly occlude the virtual performer (the
real sofa arm hides part of the leg), stable under head motion, with edge refinement at the
occlusion boundary. *Distinguisher:* correct *mutual* occlusion against the specific placed
transform from Step E, not a flat "subject in front of passthrough" composite.

**Step G — Stream only geometry needed for the current viewpoint (novel element).**
View-dependent, placement-aware streaming: given the placed transform (E), the room
occluders (D/F), and the viewer's **current and reachable** viewpoints within the navigable
boundary (C), request/decode/render only the subset of the volumetric stream (splats /
volume regions, at an appropriate level of detail) that can actually be seen. Geometry
occluded by real furniture, outside the reachable viewing frustum set, or beyond a distance
threshold is culled or sent at reduced LOD.

**Step D→G coupling (the crux).** The **placement decision constrains the streaming
decision.** Because Step E fixes where the asset sits *relative to real occluders and the
viewer's reachable movement volume*, Step G can prune geometry that is provably invisible in
that specific real room — something a system that streams a volume independently of its MR
placement cannot do. This coupling of *semantic placement* → *viewpoint-and-occluder-aware
streaming* is the combination most worth pursuing as the independent claim.

---

## 4. Why the sequence is (potentially) more than an app idea

- It is a **pipeline with a specific data dependency** (zones from C feed the solver in E;
  the solver's output plus room occluders feed the streaming pruner in G). A claim can
  recite that dependency chain, which is harder to design around than a broad functional
  result.
- Two elements have **no clean analog** in the incumbent "background-removed video +
  passthrough" approach: **behavioral zones (C)** and **placement-coupled viewpoint
  streaming (G)**. The incumbent has no zones (nothing to place) and no free-viewpoint
  stream to prune (the content is a fixed-viewpoint video).
- The **D→G coupling** ties the MR scene state to the network/decode workload, which is a
  concrete technical effect (reduced bandwidth/compute for a given perceptual quality),
  the kind of effect that supports patentability far better than a UI idea does.

---

## 5. Claim-drafting sketches (for counsel — not filed claims)

**Independent method claim (skeleton).**
> A method comprising: reconstructing a time-varying volumetric representation of a person
> from multi-view capture; associating with the representation one or more *behavioral
> zones*, each behavioral zone specifying a placement or interaction semantic and a
> reference geometry; obtaining, from a mixed-reality device, a semantically-labeled
> reconstruction of a physical environment; **automatically determining** a placement
> transform and scale for the volumetric representation by matching at least one behavioral
> zone to at least one semantically-labeled surface subject to placement constraints;
> compositing the placed representation with depth-based occlusion against the physical
> environment; and **streaming, for rendering, a subset of the volumetric representation
> selected as a function of the determined placement transform, the physical-environment
> occluders, and a set of reachable viewpoints of a viewer.**

**Independent system claim (skeleton).** A capture subsystem; a reconstruction subsystem
producing the time-varying volume; a zoning subsystem producing behavioral zones; a
placement solver; an occlusion compositor; and a **placement-aware view-dependent streaming
subsystem** — arranged so the placement solver's output is an input to the streaming
subsystem's selection.

**Dependent-claim ideas (each a fallback / design-around fence):**
- behavioral zone = support/contact zone with an expected support plane; solver aligns it
  to a horizontal seat/bed surface of compatible dimensions;
- scale chosen from metric room dimensions to render the person life-size;
- orientation set from a facing reference toward the viewer's sight line;
- navigable-boundary zone constrains placement to leave free floor for viewer movement;
- streaming selection uses a level-of-detail that decreases with viewer-to-asset distance
  within the placement;
- streaming selection excludes geometry occluded by a labeled real surface;
- temporal delta/coherence encoding of the time-varying volume between frames;
- gaze/foveation input further narrows the streamed subset;
- fallback "guided placement" flow when no compatible surface is detected;
- haptic actuation derived from viewer proximity to an interaction zone (ties to strategy
  Concept E).

---

## 6. Enablement notes (how to actually build it)

- **Capture/reconstruct (A/B):** calibrated multi-camera rig → per-frame 4D Gaussian-splat
  (or neural-volume) reconstruction with performer segmentation. Start with short clips,
  small volumes.
- **Zoning (C):** author behavioral zones as a structured metadata layer (labeled bounding
  regions + reference frames + semantics) attached to the asset; can be authored in a
  capture-time tool (ties to strategy Concept D) and/or auto-derived (e.g., detect the
  seated/reclining pose to propose a support zone).
- **Room inspection (D):** consume the headset's scene mesh + semantic labels + depth.
- **Placement solver (E):** constraint solver / optimization matching zone→surface with
  hard (support-plane compatibility) and soft (facing, free space) constraints; deterministic
  fallback to guided setup.
- **Occlusion (F):** depth-test the rendered splats against the headset depth map / room
  mesh each frame; edge refinement to reduce halo.
- **Streaming (G):** server-side or on-device selection of splat/volume subsets keyed to the
  placement transform, occluder set, and reachable-viewpoint frustum union; LOD by distance;
  temporal delta encoding; optional gaze foveation. The reachable-viewpoint set is bounded
  by the navigable-boundary zone, which keeps the pruning tractable.

Each of these has known building blocks in the mainstream (film/telepresence/splat
research and platform MR APIs); the invention is their **specific arrangement and the D→G
coupling**, not any single block.

---

## 7. Anticipated design-arounds (fence these with dependent claims)

- **Manual placement instead of a solver.** Fence by claiming the automatic zone→surface
  match, but also the *assisted* variant (system proposes, user confirms) as a dependent
  claim so "we made the user tap to confirm" doesn't escape.
- **Streaming the whole volume, no placement coupling.** This is the incumbent-adjacent
  fallback; the value of the D→G coupling is precisely that it's the efficient path, so a
  competitor avoiding it pays a bandwidth/compute penalty. Claim the coupling tightly.
- **No explicit "zones," just pose/skeleton.** Consider dependent claims where the
  behavioral zone is derived from a detected pose/skeleton, to cover the obvious variant.
- **Occlusion via chroma/matte rather than depth mesh.** Claim depth/mesh-based occlusion
  specifically, and separately the general "occlusion consistent with the placement
  transform" so a matte-based shortcut still reads on it where placement-coupled.

---

## 8. Prior-art search targets (do this before filing — with counsel)

Search and read before assuming novelty of any step:
- **Free-viewpoint / volumetric video streaming**, view-dependent transmission, foveated or
  visibility-culled point-cloud/splat streaming (mainstream: telepresence, sports, film).
- **4D Gaussian splatting / dynamic NeRF** of humans; splat compression and LOD.
- **Scene-aware MR placement**: semantic surface detection, object placement on detected
  planes, MR occlusion against room mesh/depth (platform docs and patents).
- **Volumetric telepresence** (placing a remote person into a local room) — likely the
  closest prior art to Steps D–F; look hard for the *behavioral-zone* and *placement-coupled
  streaming* gaps.
- **Adult-VR incumbents** (DeoVR/SLR/Heresphere) changelogs — to confirm they remain
  video+passthrough and lack free-viewpoint volume + automatic semantic placement.
- Patent databases (Google Patents, USPTO, Espacenet) on the above; note that filing on the
  *domain-neutral* pipeline (telepresence/live-events wording) is likely broader and more
  valuable than adult-scoped claims.

**Trade-secret vs. patent.** The reconstruction/compression internals may be better kept as
trade secrets (hard to reverse-engineer, and a patent would teach competitors). The
**placement + occlusion + viewpoint-coupled streaming** behavior is observable in-product
and therefore a better patent candidate. Split accordingly with counsel.

---

## 9. Next actions

1. **Prior-art sweep (§8)** focused on volumetric telepresence and view-dependent splat
   streaming — the two nearest neighbors — to confirm the C and D→G gaps are real.
2. **Reduce to practice, thinnest slice:** one seated capture, behavioral support-zone,
   auto-placement onto a real sofa, correct occlusion, viewpoint-pruned stream to a
   standalone headset. This both validates the tech and strengthens a filing.
3. **Provisional filing** on the domain-neutral pipeline (with counsel) to hold priority
   while the slice is validated; keep reconstruction internals as trade secret.
4. Fold consent/rights/age-verification gates in from the start (see strategy doc §3-C, §6)
   — non-negotiable for the eventual application domain.
