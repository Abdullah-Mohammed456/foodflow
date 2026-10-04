# Burger film — free approximation

Deliverables: `burger-film.mp4` (1920×1080, 24 fps, 4 seconds, 96 frames, H.264, silent), `burger-scroll-sequence.zip` (60 full-resolution PNGs), and `poster.png`.

One source image is animated using a perspective projection representing a 25-degree clockwise turn around the vertical axis as viewed from above, together with an 8% approach. This is a flat-image approximation: it does not reveal the burger's hidden sides or recompute lighting as a physical 3D rotation would. The burger and all ingredients remain the same source artwork throughout.

The lossless PNG sequence uses a uniform #191b18 backdrop. The MP4 uses standard YUV encoding and can have slight color rounding. Sixty uniform target positions are rounded to the nearest of the 96 original frames; their exact timestamps are in `sequence-manifest.json`. The first and last frames are included. This unavoidable source-frame quantization produces 1- or 2-frame steps.

The source was created with the built-in image generation tool, and the animation was rendered locally with FFmpeg. No paid Runway generation was used. `render.py` reproduces the outputs from `burger-source.png`.

## Image-generation prompt

Use case: ads-marketing. Asset type: photorealistic isolated food hero for a premium international fast-food website and animation source. Create ONE large appetizing double cheeseburger, viewed almost straight on with a slightly elevated camera showing a little top of the sesame bun. Exactly two thick seared beef patties, melted cheddar on each patty, crisp green lettuce, red tomato slices, and a small amount of sauce, all inside a golden sesame bun. Natural realistic food textures: browned juicy beef, soft bread, distinct sesame seeds, glossy already-melted cheese. Soft studio side lighting from upper left, gentle fill, realistic highlights. Burger upright, entire burger fully visible, centered with generous clear margins; no ground plane, no cast shadow outside burger. Genuinely transparent background with clean alpha edges, no checkerboard baked in. No plates, wrappers, logos, text, hands, people, other food, smoke, detached ingredients or crumbs. High resolution sharp premium food photography.
