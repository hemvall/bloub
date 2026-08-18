# What was measured

Nothing here was drawn by eye. The reference video was cut at 10 frames per
second, then each state measured off the frames: silhouettes by sub-pixel ray
casting, eyes by capsule fitting (PCA), colours and stroke widths by direct
sampling.

**The numeric constants of the bot are measurements, not settings.** Gaze angles,
eye sizes, radii, timings, colours: all of it comes from frame-by-frame analysis.
Rounding them off, simplifying them, or replacing them with values that look
tidier breaks the resemblance, which is the only success criterion here.

## Verified traps, not to be "corrected"

- The eyes lean like `\\`, not `//`.
- The body is a **perfect circle**, not a squircle, radial deviation under 0.7%.
- Transitions are **exponential ease-outs**; the body **never** overshoots. The
  one spring is local and written into the state concerned (the notification
  pastille's +14% pop). There is deliberately no spring engine.
- The vertical `!` has a **tapered** bar (top/bottom = 1.76); the leaning `!` has a
  **capsule** bar. They are not the same shape.
- The leaning `!`'s dot is a **teardrop**, round end towards the bar, point away,
  not a disc.
- In the comet state the dot **does not move**: the trail orbits it.
- At rest the avatar **doesn't float**: the video measures the centre stable to
  ±0.003. The code keeps a deliberate trace of it (a drift of a few thousandths of
  the radius, and a 0.5% breath) purely so the image isn't completely frozen. The
  visible life is gaze drift and blinking. Don't add a float on top.

## The eyes live on a sphere

The eye nearer the edge is about 0.69 times the width of the other and 0.663 times
its area, exactly the depth factor of a point on a sphere at that distance from
the centre. So each eye takes the sphere's tangent frame, projected
orthographically: the compression, the tilt and the passage behind the limb all
follow on their own.

The gaze poses (`REST_GAZE` and the per-state `gaze`) come from fitting that model
to the measured positions, with a residual error of about 1 px on a 190 px ball.

Two notes for anyone comparing numbers. The far/near width ratio appears as 0.69 in
`face.ts`, as 0.674 in `face.test.ts` (the raw video figure) and computes to about
0.708 from the model: source versus fit, and the test's tolerance covers the
spread. Likewise the rest tilt is not a constant anywhere: it emerges from
`REST_GAZE` through the tangent frame, at about 26° off vertical.

## Every shape change is hidden by a blink

That's the morph-damping mechanism in the original, reproduced by `blinkIn` on the
states concerned. The forced blink lasts 0.2 s; the scheduled idle blink is
`BLINK_DUR = 0.18`.

## The body's gradient is measured too, off a second reference

The flat fill became a radial gradient, and its geometry and colour ramp are a
measurement like everything else — taken off a reference render (an orange bot
whose shading was the target), not chosen by eye. `src/bot/texture.ts` holds it.

Fitting a **linear** gradient to that render leaves an RMSE of 12.5/255. Fitting a
**radial** one leaves 0.94. It is a radial gradient, and no amount of tuning a
linear one gets there.

In units of ball radius, the light sits at **(-0.331, -0.397)** — up and to the
left of the body's centre, not on it — and the ramp reaches its darkest stop at
**1.589**. That radius overshoots the ball on purpose: on the reference the
darkest tone is only reached at the silhouette's furthest *corner*, not at its
nearest edge, and clipping the ramp at 1.0 would darken the whole lower right.

The ramp has **three** stops, not two, because it breaks at 0.831 radii from the
light — where red saturates at 255. Two straight segments, so the middle stop
lands at offset **0.523**. On the reference orange the three are `#f3d25d`,
`#ff8b00` and `#c03a00`, and `mandarine` in `skins.ts` is that `#ff8b00`.

The stops are stored as **HSL offsets from the chosen colour**, which is what lets
one measurement serve any colour, including a hex typed by hand:

| | hue | saturation | lightness |
|---|---|---|---|
| highlight | +14.09 | -13.79 | +15.88 |
| shadow | -14.58 | 0 | -12.35 |

One deliberate departure from the raw measurement: the hue rotates **towards
yellow** for the highlight and away from it for the shadow, rather than applying
those signs literally. On the reference orange the two are identical — that's
where the numbers came from. On a blue, applying the signs literally would send
the highlight into violet, which reads as a colour bug rather than as a light
source.

The chosen colour lands on the middle stop **exactly**, and the ramp is clipped at
black and white rather than being recentred to fit. So ink (lightness 4%) keeps a
highlight and loses its shadow, cream does the reverse. Recentring would preserve
the relief at the cost of the colour actually displayed, which is the wrong trade:
the colour someone picked has to be the colour they see.

Verification is a per-pixel diff against the reference render: mean error
**0.84/255**, and 98.3% of pixels within 4/255 on every channel.

The gradient is `gradientUnits="userSpaceOnUse"`, so it is **fixed in the frame**
and reads as a light source. In object units it would have followed the body's
box — breathing with it, sliding with its drift, jumping at every silhouette morph
— which would have made the light a texture glued to the bot.

## Regenerating the profiles

`src/bot/profiles.ts` is generated from the video's frames. Don't edit it by hand.

```bash
mkdir -p frames
ffmpeg -i reference.mp4 -vf fps=10 frames/h_%04d.png
pip install numpy pillow
python tools/extract-profiles.py frames/ > src/bot/profiles.ts
```

The script composes exact filenames (`h_0164.png` and friends, zero-padded to
four), so the `h_` prefix and the `fps=10` cut both matter. It extracts the three
profiles that can't be built analytically (egg, hexagon, triangle), not all 14
states; the rest are either the measured circle or constructed in `skins.ts`.

`reference.mp4` and `frames/` are local inputs and are not in the repository.

## One shape is transcribed, not measured or constructed

`zh` in `skins.ts` comes from neither the video nor a formula: it is an avatar
built in another project — `bible-strong-avatar-lab`, entry
`avatar-b6362e59-81a3-4334-a399-a721b23cf553` of `defaultStudioDocument.json` —
transcribed. Its numbers are that document's own, divided by 120 — half the 240
units its body is wide — to reach ball radii. They are long on purpose; rounding
them drifts the likeness and simplifies nothing, since nobody reads them.

A round head plus two arms: ellipses of 108.11 x 81.6, at (-103.30, +30.44)
rotated -14.84 degrees and (+98.15, +32.55) rotated +15.18. Wider than they are
tall, which is why this is the one customiser shape that needs
`unionOfEllipsesProfile` — a disc cannot say that.

**It is normalised to exactly 1.15, and the exact figure matters.** `DEMI_CADRE`,
the export frame, is derived from the widest shape in the palette and is shared by
all of them, so any shape that pushes `RAYON_MAX` past the squircle's existing 1.15
silently shrinks every other shape's export. Normalising to the palette's usual
~1.02 was the other trap: the peak here is an arm tip, a thin protrusion, so the
head would have collapsed to 0.76 of a radius. At 1.15 the head holds 0.853 and the
shape weighs 0.899 in equivalent radius — between the cloud (0.873) and the pebble
(0.933). Sizing the head "correctly" (normalising to 1.311) would have widened the
shared frame by 14%.

## The favicon is not an approximation

`public/favicon.svg` is not a lookalike drawing: the circle and **both eye
matrices** are what `engine.sample(1)` returns for `idle`, byte for byte. Hence the
right eye being narrower than the left (0.64 against 0.87). That's depth
compression, not a typo.

`favicon.ico` and `apple-touch-icon.png` are rasterised from it. The `.ico` is
still needed: Safari only reads the SVG from version 26, iOS not before 18.7.

It stays a **flat fill** while the app's body carries a gradient, and that is a
decision rather than drift. A favicon is read at 16 px, where a three-stop ramp
across the ball is worth nothing; and the file inverts its body for a dark tab bar
via a single `fill` in a media query, which one gradient can't do — it would need a
second full set of stops to invert with it. The geometry is still `engine.sample(1)`
byte for byte, which is what that guarantee was ever about.
