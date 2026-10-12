# Scene Studio

Open `/studio` or `/#studio`. The original SVG avatar editor stays at `/`.

Scene Studio is a browser-native tool for short character-driven clips: three illustrated
characters, three environments, a timeline, a chat director that turns a sentence into a scene,
and a one-click MP4 export at reel resolution. Nothing is downloaded at runtime; the whole set
is procedural.

## Using it

- **Director** (right panel, default): describe the scene or a change in plain language. With an
  Anthropic API key in the panel's settings the request goes to Claude; without one, a small
  offline parser reads simple stage directions (`Kit looks at the window`, `after two seconds he
  sighs`, `close-up at 3s`, `Pip says "hello"`, `no rain`, `vertical`). Both produce the same kind
  of script and apply it through the same commands. Deep link to a scene with `#studio&scene=<id>`.
- **Scenes** (left): a project holds several scenes, autosaved in the browser. `+` creates an
  empty scene, one of the three examples, or a duplicate. Switch environment with the select.
- **Viewport**: drag to orbit, right-drag to pan, scroll to dolly, click to select. `G`/`R`/`S`
  switch the gizmo. The `Frame` buttons apply a camera preset on the selected character; `K`
  records the current view as a camera key. The frame is always the output aspect (16:9, 9:16, 1:1).
- **Inspector**: contextual fields for the selection. On a character, position, expression and
  gaze record keys at the playhead; the `Beats` chips add an action; a line of dialogue is added
  from here or the timeline. Clicking a key in the timeline inspects that key (text, duration,
  time, action…).
- **Timeline**: one lane per track. Drag a key to move it, click to select and seek, right-click
  or `Del` to delete. Space plays, arrows step a frame (Shift: ten).
- **Export**: MP4 at the output size and the scene's fps (60 by default), a PNG of the current
  frame, or the scene JSON. Import validates before replacing the document.

## Architecture

```
src/studio/
  scene/          model (v2 types), commands, examples
  serialization/  validation + v1 migration, JSON
  timeline/       pure evaluation: cameraAt, characterAt, faceAt, dialogueAt…
  animation/      idle, gaze, expressions, actions — all pure functions of time
  camera/         presets as framing rules relative to a subject
  characters/     catalog (no three.js), rig, kit, pip, bo
  environments/   catalog (no three.js), nightBar, rooftop, stage
  props/          createProp
  engine/         SceneEngine, toon materials, overlay (captions), geometry helpers
  export/         MP4 (mediabunny, lazy) and PNG
  director/       script format, applyScript, local rules, Claude client, prompt
src/components/studio/   Vue: SceneStudio, Outliner, Viewport, Inspector, Director, Timeline
```

**The document is the only state.** `SceneData` holds everything: output settings, environment,
base camera, characters, props, lights and a timeline of events with stable ids. `SceneCommands`
is the only writer (`addCharacter`, `setGazeTarget`, `say`, `act`, `cameraPreset`,
`addCameraKeyframe`, `setEnvironment`, `moveEvent`…). The Vue store (`useStudioDocument`) edits a
copy through the commands, validates it, and adopts it. The chat director produces a
`DirectorScript` (a list of ops) that `applyScript` replays through the same commands, skipping a
bad op with a warning instead of failing the whole turn. An agent can do exactly the same.

**Timeline model.** Events are `camera` (pose), `position`, `gaze`, `expression`, `dialogue`
(text + duration) and `action` (a named gesture). Camera and position keys interpolate with a
smoothstep and hold after the last key; expressions and gaze are step tracks with a short blend
computed at evaluation time; dialogue and actions are windows. A key replaces the key of the same
type, time and character.

**Characters.** One `CharacterRig` (root > body > arms, head > ears, eyes, mouth) animated by one
`update()` from idle signals, gaze angles, blended face parameters and summed action poses.
`kit.ts`, `pip.ts` and `bo.ts` only build geometry and set the rig's metrics. The look is a
three-step toon gradient and inverted-hull outlines with a world-space line width, so the stroke
weighs the same on a bear and a bird. Eyes lead the gaze in 180 ms; the head follows through a
weighted average of recent gaze history (450 ms constant) recomputed from the document, not
carried between frames. Blinks, breathing, sway and ear flicks are coprime sinusoids of time.

**Environments** are built once per scene and swapped when the document's `environment.id`
changes. Each environment's catalog entry (no three.js) lists gaze anchors, default seats, the
base camera and atmosphere, so validation, the director and the UI know a scene without rendering
it. Particles (rain, dust, motes) are positioned from `(index, time)` each frame.

## Deterministic rendering

`engine.renderFrame(t)` evaluates the whole scene at `t` and draws it. The RAF loop only
advances the playhead and measures FPS; it never feeds state back into the animation. Seeking
backward reproduces the frame exactly, and a test locks the evaluation layer.

`engine.capture(width, height)` switches the renderer to an explicit size and returns
`frame(time, ctx)`, which draws the composited image (3D frame + captions from `overlay.ts`)
into any 2D context. `export/video.ts` walks `duration × fps` frames through it and streams
each into mediabunny's H.264 encoder (`await add` per frame bounds memory), at 1080×1920 for
9:16, 1920×1080 for 16:9, 1080² for 1:1. The same overlay function draws the viewport captions,
so what you see is what the file contains.

## Performance

The HUD measures real RAF intervals over 500 ms. Pixel ratio is capped at 2, one shadow map per
environment (2048²), bloom runs only when the scene's `bloom` is above zero, instanced meshes for
city windows, shared sphere geometry across every character part, particle buffers updated in
place. The Anthropic SDK (`~60 kB gzip`) and mediabunny are dynamic imports, loaded on first use.

## What remains for fully automated video

Audio and TTS with lip timing, a richer action vocabulary (walks, props in hands), per-scene
undo/redo, multi-scene renders stitched into one file, server-side batch rendering (the capture
API is already headless-friendly), and an agent loop that calls `applyScript` directly rather
than through the chat panel.
