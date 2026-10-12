# Scene Studio

Open `/studio` or `/#studio`. The original SVG editor remains at `/`.

Scene Studio is a browser-native editor for character-driven shots. The first scene is a procedural night bar and the first character is Kit, an original illustrated cat mascot. No remote model or image downloads are needed.

## Editing

- Drag the viewport to orbit, right-drag to pan, and scroll to dolly. Use the camera presets or select Scene camera to edit position, target and FOV. **Add Camera key** records the current view at the playhead; unrecorded orbit views are editor previews.
- Select Kit or a prop from the outliner or viewport. Move, rotate and scale gizmos modify document transforms. Character moves also record a position key at the playhead.
- The inspector edits coat, expressions, gaze target (camera, object or XYZ), lights, fog and rain. Position, expression and gaze edits record at the playhead so changes remain visible over existing tracks. The **at playhead** buttons also record the currently selected values. Timeline events take precedence over base values. On narrow screens the Inspector button opens these controls.
- Space plays/pauses; arrow keys step by `1 / fps`. Click/drag the ruler or lanes, or use the accessible playhead slider to scrub. Click a diamond to seek; right-click to delete it. Shortening duration removes keys beyond the new end.
- JSON export downloads a complete scene. Import validates before replacing the document. Reset restores the example. Browser local storage autosaves the latest document; exported JSON is the portable source of truth.

## Architecture

`src/studio/scene/model.ts` defines version 1: output settings, environment, camera pose, character/prop/light documents, and a discriminated union of camera, position, gaze and expression timeline events. All coordinates are in world units; Euler rotations are radians. There are bounded limits on imported objects, events, duration and file size.

`SceneCommands` provides `addCharacter`, `setCharacterPosition`, `setGazeTarget`, `setExpression`, `addCameraKeyframe`, `addPositionKeyframe`, `addProp`, `setLight` and `setEnvironment`. The Vue interface is one client. Agents can construct the same documents and commands without interacting with UI components.

`SceneEngine` owns Three.js objects, OrbitControls, TransformControls, selection, lighting, frame timing and lifecycle. Vue sends changed documents; it does not reconstruct the scene graph every frame. Environment geometry is created once; character/prop/light identities reconcile on document changes. ResizeObserver measures the actual output canvas, with capped devicePixelRatio (2), shadows and fog. Unmount disposes geometry, materials, textures, shadows, controls, observers, listeners, renderer and RAF.

`Kit` has root/body/head/ear/eye/pupil/lid/mouth groups. Toon materials, outline shells, shallow facial geometry, asymmetric ears, whiskers and a curled tail establish its graphic identity. Pure-time idle signals produce breathing, drift, blinking, pupil drift and ear flicks. Gaze targets resolve in world space. Eyes blend rapidly; head angles use a fixed weighted history of scene samples to simulate inertia without depending on previous rendered frames. Body rotation stays separate. Gaze currently compensates for character yaw; arbitrary tilted character roots are supported visually but are not a full anatomical rig solver.

## Deterministic rendering

`cameraAt`, `characterAt`, `idleAt` and `gazeAt` depend only on the document and timestamp. Position/camera keys use smoothstep interpolation and hold after the last key. Expressions hold; gaze transitions have a short lead and head response. Rain and dust use index-derived sequences and scene time, never per-frame randomness.

`engine.renderFrame(time)` evaluates and renders a timestamp synchronously without changing the playhead. It hides editor overlays by default. `renderFrame(time, { overlays: true, camera: pose })` is used for editor rendering. The RAF wall clock advances only playback time and measures actual FPS; it does not define character animation. Seeking backward evaluates from data again. Determinism means identical animation state; GPU raster output can differ across browsers/hardware.

For offline capture, create an engine on a host with explicit dimensions matching the scene aspect, pause playback, call `renderFrame(frame / scene.fps)`, and capture `engine.renderer.domElement`. The renderer currently preserves its drawing buffer for capture readiness; production capture should make this optional to reduce overhead. No MP4 pipeline is shipped in this foundation.

## Performance and next steps

The HUD measures actual RAF intervals over approximately 500 ms. Shadows use one 1024² directional map; practical lights do not allocate shadow maps. Pixel ratio is capped, city windows are instanced, static geometry is reused, and particle buffers update in place. A 60 FPS target depends on GPU, window size and pixel ratio; it is not guaranteed. The Three.js studio is lazy-loaded separately from the original editor; Vite currently reports its approximately 625 KB minified chunk as over the default 500 KB warning threshold. Profile before adding postprocessing or higher resolution captures.

Full automated video production still needs scene scripting/planning, dialogue and audio synchronization, lip sync, action clips and rig blending, timeline undo/redo and key dragging, additional environments/characters, an explicit fixed-resolution frame capture API, encoding (WebCodecs/mediabunny or server jobs), cancellation/progress, and output validation. The scene version and discriminated timeline events provide migration points for these additions.
