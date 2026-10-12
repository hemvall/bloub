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

## Content engine

Since v3 the studio is first a **scriptable video engine** for Lew's reels, and only then a 3D
editor. The unit of work is a **content project** (`src/studio/content/`): title, hook, CTA,
format, set, cast, dialogue, shots, acting cues, voice config, metadata, and the compiled scene.
The pipeline is

```
brief -(Claude, optional)-> project -> script text <-> beats -(compile)-> scene -> preview -> MP4
```

- **Library** (`/studio`): every project with status (draft / ready / rendered), thumbnail,
  length, format, cast; duplicate, delete, new from template, import. The command bar
  ("Describe your video...") calls Claude with the user's own key and gets back a whole project in
  the script format; without a key it says so and templates work offline. Deep links:
  `#project=<id>`, `#template=<id>` (a fresh project), `&t=<seconds>`.
- **Script panel** (left): hook, CTA, format, status, set, cast (role, name, mark), the script
  text, subtitle style and the render plan. *Apply & compile* parses the text and rebuilds the
  timeline. The text is a **view** of the structured beats (`printScript` then `parseScript`
  gives the same beats, tested); the beats are the truth.
- **Scene panel / Inspector / Timeline / Director**: the adjustment layer on the compiled scene,
  unchanged in spirit. Hand edits survive until the next compile.

### Script format

```
[00:00.0]                        time (optional: lines flow one after the other, 0.3 s apart)
CAMERA: two-shot Lew CEO         wide | medium | close-up | over-shoulder | profile | two-shot
CEO (confused): "We already have ChatGPT."
Lew looks at CEO.                stage directions: nods, sighs, looks away, looks confused, leans back...
CAMERA: close-up Lew slow-push   movements: slow-push | push-in | pull-out | slow-pan
LEW (smug, 2.4s): "Then you have a chatbot."
PAUSE 0.5
```

Speaker labels are cast names or roles, case-insensitive. Durations default to reading speed
(2.6 words/s, min 1.2 s). Unreadable lines become warnings, never errors.

### What the compiler does (`content/compile.ts`)

Deterministic: the same project gives byte-identical scenes (event ids are renumbered). It
places the set's **dressing** props (the office monitor shows the Lew workspace, the laptop an
agent workflow), seats the cast on their **marks**, turns **shots** into camera keys (a `cut`
flag holds the previous pose until the key; a movement adds a second eased key), lays down the
dialogue with its emotions, and runs the **conversation pass** (`content/conversation.ts`):
speakers turn to the listener, listeners turn to the speaker and react according to their
personality (`subtle` blinks, `medium` gives a small listening nod, `strong` nods), long lines
get an emphasis beat. Explicit cues always win over the automatic ones.

### Vocabulary that an agent (or Lew) can use

`ContentStudio` (`content/api.ts`) is the whole programmatic surface: `create`, `fromTemplate`,
`setEnvironment`, `addCharacter`, `addDialogue`, `addShot`, `addAction`, `setExpression`,
`addProp`, `setScript`, `script()`, `compileTimeline`, `renderFrame`, `toJSON`/`fromJSON`. The
Vue store calls nothing else at project level. Acting commands (`content/acting.ts`): lookAt,
lookAway, blink, doubleBlink, nod, shakeHead, sigh, laugh, wave, thinking, confused, annoyed,
happy, surprised, deadpan, smug, tired, sad, curious, neutral, leanForward, leanBack, emphasis,
idle. Each maps to an expression, an action window and/or a gaze; adding one is one table entry.

### Shots (`camera/shots.ts`)

A shot is a framing rule, not a position: what must fit in the frame (a height and a width in
metres) plus a lens. The distance follows from the output aspect, so a portrait close-up steps
back instead of landing inside Lew's head, and a two-shot fits both bodies whatever the set.

### Characters and sets

`lew` is the brand character (soft squared head, amber fin, half-lidded eyes); `ceo` and `dev`
are archetypes reused under any role or name (a `client`, an `ops`, a `sales`). Each kind has a
**personality** (`characters/catalog.ts`) that scales its idle and sets its reaction intensity.
Sets built for the content: `office-night`, `meeting-room`, `ai-lab`; the original three remain.
Props with screens (`laptop`, `monitor`, `phone`) show a painted UI (`props/screens.ts`:
Lew workspace, agent workflow, CRM, chat, terminal, notification) or a custom screenshot stored
as a data URL in the document.

### Subtitles (`subtitles/`)

Word-level timing is derived from the text (letters weigh, punctuation pauses), words are shown
in chunks with the spoken one in amber, inside the vertical safe zone. The style lives in the
scene (`subtitles`), the Lew look is the default, a caption-box style is available. The same
function draws the viewport and the export.

### Render

`render/presets.ts` lists the targets (Reel, TikTok, Short at 1080x1920 60 fps, Landscape at
1920x1080) and `renderPlan` says plainly what exists: deterministic frames and burned-in
subtitles are real; **there is no audio track** because no TTS provider is wired in. The MP4
is silent, lines are timed by reading speed.

## Architecture

```
src/studio/
  content/        project model, script format, acting, conversation pass, compiler, templates, demo, API, Claude generator
  render/         output presets and the render plan
  subtitles/      word timing, styles, drawing
  scene/          model (v3 types), commands, examples
  serialization/  validation + v1 migration, JSON
  timeline/       pure evaluation: cameraAt, characterAt, faceAt, dialogueAt…
  animation/      idle, gaze, expressions, actions — all pure functions of time
  camera/         presets (editor) and shots (script) as framing rules relative to a subject
  characters/     catalog with personalities (no three.js), rig, lew, ceo, dev, kit, pip, bo
  environments/   catalog with marks and dressing (no three.js), officeNight, meetingRoom, aiLab, nightBar, rooftop, stage
  props/          createProp, screens
  engine/         SceneEngine, toon materials, overlay (captions), geometry helpers
  export/         MP4 (mediabunny, lazy) and PNG
  director/       script format, applyScript, local rules, Claude client, prompt
src/components/studio/   Vue: SceneStudio, Library, Script, Outliner, Viewport, Inspector, Director, Timeline
```

**The scene document is the only rendering state.** `SceneData` holds everything: output settings, environment,
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

## What remains for a complete, published reel

- **Voice.** No TTS; the render is silent and lines are timed by reading speed. Wiring a
  provider means: `voice.provider`, one audio clip per line, line durations taken from the
  clips, lip timing from their envelope, and an audio track in `export/video.ts`.
- **Caption file.** Subtitles are burned in only; an `.srt` from `wordTimings` is a small step.
- **Headless batch render.** `engine.capture` is already DOM-light; a server renderer needs a
  WebGL context (Playwright or headless Chrome, which is how the screenshots in this doc were
  taken).
- **Publishing.** Nothing talks to Instagram, TikTok or YouTube. Rendered MP4s download.
- **Agent loop.** `ContentStudio` is callable from anywhere; the chat director still edits the
  scene, not the project. A director op set over the project (add a line, re-cut, re-time) is the
  next step for Lew producing its own content.
