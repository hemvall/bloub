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
  length, format, cast; duplicate, delete, new from template or from one of the nine example
  reels (`content/examples.ts`: Chatbot vs Agent, RAG, le lundi d'Ops, renommer une variable,
  MCP, les evals, context engineering, l'agent commercial, POC en prod), import. The command bar
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

`lew` is the brand character: a low-poly raccoon built from faceted balls and cones, a black eye
mask whose lids are mask-coloured (a half-lid reads as the mask's edge), pointed ears, a striped
tail, an elongated body, palette from the brand sheet (`#6b6f7b` coat, `#ebe8ea`, `#3b4252`,
`#0f0f14`). Silhouette, mask and eyes first; no fur, no detail. `ceo` and `dev`
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

### Audio (`audio/`)

The sound is data first: `mixPlan(project)` is a pure list of what must sound and when (voice
clips, duck windows, music, the set's room tone, SFX cues), and `renderMixSamples` turns it into
samples with **plain-JS DSP** (`audio/dsp.ts`: oscillators, seeded noise, RBJ biquads, envelopes,
a delay, a soft limiter). There is no Web Audio graph in the render path: Chrome's
OfflineAudioContext stalled at random under a few hundred scheduled nodes, and samples computed
by hand are the same in a vitest run, a tab and the exporter. **The preview plays that buffer and
the exporter embeds it as AAC**, so they cannot differ. Rendering 20 s takes a few hundred
milliseconds on the main thread; it is debounced.

- **Voice.** Text to speech through the user's own key, from the browser: OpenAI (`gpt-4o-mini-tts`,
  reads delivery notes per role) or ElevenLabs (`eleven_multilingual_v2`, needs a voice id per
  role). Clips are stored in IndexedDB under a content hash (provider, model, voice, language,
  notes, text); the project keeps only the hash, the clip's duration and a 25 Hz loudness
  envelope. **Attaching a clip re-times the beats**: the line takes the clip's length and every
  later line, shot and cue slides by the difference. The envelope drives the mouth
  (`speechLevelAt`); without a clip the rig falls back to its rhythm. Without a provider the
  render is silent on the voice side, and says so.
- **Music.** Real tracks without a key: a shelf of fifteen Kevin MacLeod tracks (CC BY 4.0) and a
  search over the Internet Archive restricted to commercially usable licences
  (`audio/library.ts`), both fetched by the browser since archive.org serves audio with open
  CORS; the attribution line stays on the project and can be copied for the caption. Also three
  procedural beds (lo-fi beat, synth pulse, ambient pad) and imported files. Everything is stored
  locally under a hash and looped if shorter. Music ducks under voice windows (`ducking`).
- **Room tone** per set: city hum for the office, HVAC for the meeting room, a drone and blips
  for the lab, rain and murmur for the bar, wind on the rooftop.
- **SFX**: a whoosh on every cut, a riser into the last line and a hit on it, an optional tick per
  caption chunk. All switchable and levelled in the project's `audio` block.

### Language

Videos are **English first**, with a **French version behind** each project: the demo, the six
templates and the nine example reels carry both scripts (`scripts.fr` on the English project);
the generator writes the English script and a French one in the same call; "FR version" in the
script panel creates a sibling project (`metadata.variantOf`) from the stored French script, or
translated by Claude with the user's key, or copied to translate by hand. Voice clips are not
carried over to a version: they would be in the wrong language. The parser reads French and
English alike (shot names, stage directions, emotions, with or without accents, straight or
typographic quotes) and the printer writes stage directions in the project's language
(`voice.language`). The UI stays in English.

### Render

`render/presets.ts` lists the targets (Reel, TikTok, Short at 1080x1920 60 fps, Landscape at
1920x1080) and `renderPlan` says plainly what the MP4 will contain: deterministic frames,
burned-in subtitles, and an AAC track when there is anything to hear (voice, music, room
tone or SFX), silent otherwise.

## Architecture

```
src/studio/
  content/        project model, script format (fr/en), acting, conversation pass, compiler, templates, demo, API, Claude generator
  audio/          mix plan, procedural music, room tone, SFX, offline mix, TTS providers, clip store, preview player
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

- **Voice quality.** Clips come from a provider with the user's key; there is no local TTS, so
  without a key the reel stays silent on the voice side. Lip sync follows loudness, not phonemes.
- **Music.** The Archive shelf is Kevin MacLeod only; the search depends on how well uploads are
  tagged. Attribution is kept, not enforced: paste the credit in the caption yourself.
- **Caption file.** Subtitles are burned in only; an `.srt` from `wordTimings` is a small step.
- **Headless batch render.** `engine.capture` is already DOM-light; a server renderer needs a
  WebGL context and an OfflineAudioContext (headless Chrome has both).
- **Publishing.** Nothing talks to Instagram, TikTok or YouTube. Rendered MP4s download.
- **Agent loop.** `ContentStudio` is callable from anywhere; the chat director still edits the
  scene, not the project. A director op set over the project (add a line, re-cut, re-time) is the
  next step for Lew producing its own content.
