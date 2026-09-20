# Homepage sky

The homepage uses locally served Three.js 0.179.1 (MIT). The main sky and the
foreground grass/ant have separate renderers and share one animation loop.
No image, model, texture atlas or external CDN is required.

## Controls and motion

The page starts at the visitor's device-local time and checks the clock every
10 seconds. Four dots select a scene; clicking the time restores the local clock.
Only the time and dots are visible. Buttons retain accessible names and keyboard
focus indicators.

| Scene | Automatic local time | Manual time |
| --- | --- | --- |
| Dawn | 05:00–08:59 | 06:30 |
| Noon | 09:00–16:59 | 12:00 |
| Sunset | 17:00–19:29 | 18:00 |
| Night | 19:30–04:59 | 21:00 |

These are artistic time windows, not location-based astronomy. Animation runs at
approximately 30 fps, pauses offscreen or in a hidden tab, and respects reduced
motion. Time selection still works with reduced motion. Without JavaScript or
WebGL, CSS provides a readable gradient; with JavaScript, its colors follow the
selected time. A failed foreground renderer hides the insect interaction.

Scene changes ease the sky palette, sun/moon, cloud shading and foreground lights
together, using four shared weights in `sky-motion.js`. New selections start from
the currently displayed mixture. Most of the change takes about one second;
the small tail settles completely after about two seconds. The existing 30 fps
loop drives everything, with no extra animation dependency or render target.
Initial load, hidden scenes and reduced motion apply the selected look immediately.
The text palette switches at the midpoint into/out of night to retain contrast.

## Sky

`sky-renderer.js` draws two procedural cloud layers with different scales and
drift speeds. Cloud density falls around measured text regions, leaving clear
sky behind the copy. `ResizeObserver` updates these regions when text reflows.
Clouds use a stable virtual frame instead of stretching on tall screens; the sun
and moon stay in the first visible viewport. Phones reserve sky above the title.

The sun has a feathered core, close aureole and broad atmospheric glow. The moon
uses an analytically shaded sphere with subdued surface variation; its dark side
and limb dissolve into the sky. Thin clouds pass over the light and receive a
small scattering contribution. Pointer motion eases into a bounded viewpoint
offset (14px horizontally, 9px vertically), with weaker movement in the distant
clouds and stronger movement nearby. Text clearings remain anchored to the page.
Leaving the hero returns the viewpoint gently to center; touch does not drive
parallax. Reduced motion and hidden scenes reset it immediately.
The render target is capped at 1200px wide and 1000px high.

## Grass and insect

`grass-surface.js` defines the curved leaf used by both the mesh and foot anchors.
`grass-field.js` renders seven tapered blades with muted colors, thin-leaf light
transmission and slow wind motion. `leaf-walker.js` controls visits, alternating
tripod steps, turns, rests, probing, grooming and escape. `ant-kinematics.js`
solves fixed-length leg joints, and `ant-renderer.js` draws the mesh and shadows.

During stance, a foot retains its leaf coordinates and follows that same material
point as the leaf sways. A swing lifts vertically before advancing and lowers
vertically onto its next anchor. At least three feet support the body. The camera
stays fixed; an invisible accessible button follows the projected insect.

Hover/focus pauses exploration. Click, tap, Enter or Space triggers a brief
startle, finishes the current step, then accelerates the same tripod gait down
the leaf and out of view. Repeated touches cannot restart the escape. The insect
stays away for 55–110 seconds, then returns at its normal pace. This is kinematic
contact alignment rather than a biological force simulation.

Grass and insect share a color/depth render target. A 72-sample aperture gather
runs at half resolution, followed by a resolve filter. Filtering uses linear,
premultiplied color; display encoding happens once. The normal blur radius is
roughly 8–12 CSS pixels, bounded to 7–18. Focus remains on the leaf between visits.
Pixel ratio is capped at 1.5 and raster work is restricted to the grass region.

## Validation

- `node --test tests/sky-motion.test.cjs`: checks all scene pairs, interrupted
  transitions, frame-rate independence, bounded pointer movement and static mode.
- `node tests/leaf-walker.test.cjs`: seeded phone/tablet/desktop simulations check
  planted-foot slip, vertical liftoff, wind-carried contact, fixed leg lengths,
  all behavior states, repeated touches and escape/return timing.
- `/tests/grass-contact.html`: actual rendered leg endpoints are compared with
  leaf positions and raycast against rendered triangles; includes a 3× view,
  wind, turning, grooming, escape and depth-of-field controls.
- `/tests/sky-rendering.html`: GPU pixel readback checks the sun/moon, cloud
  motion and stationary frames across four scenes at 375, 768 and 1440px, plus
  pointer response and continuous day/night lighting. Manual playback and a
  viewpoint slider allow visual inspection without changing the cloud time.

## Reference

The [Anthropic reference](https://www.anthropic.com/claude-fable-and-mythos-5-1)
and its [public hero script](https://www.anthropic.com/_next/static/chunks/14c8frmb4u5hu.js)
informed the realtime clouds, text clearings, responsive framing and depth of
field. Its moon is a textured shader sphere and its sun is atmospheric light
without a disc. This implementation keeps the requested visible sun and uses
original procedural geometry/shaders. No reference-site code or assets are
bundled. Third-party code is limited to the licensed Three.js modules in
`assets/js/vendor/three/`.
