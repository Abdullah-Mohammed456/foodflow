# Scroll-driven burger story

The hero follows the supplied reference: oversized Anton FAST / FOOD lettering filled with the editorial burger photograph, a dark background, and red copy layered over the lower letters. The whole layout fades away before the isolated food animation begins.

A GSAP ScrollTrigger timeline pins the hero for 4.2 viewport heights. Progress follows scroll position and reverses naturally when scrolling upward:

1. Photograph-filled headline and normal navigation.
2. Hero copy and navigation disappear; an isolated assembled burger emerges.
3. Six photographic ingredients separate vertically with consistent lighting.
4. The ingredients close back together.
5. The burger moves to the left of an open meal box containing fries and cola. Matching photographs crossfade during packing.
6. The meal box enlarges and blurs away; navigation returns and the shopping section follows immediately.

This is a layered photographic animation, not a video or true 3D simulation. The packing transition uses a matching meal photograph; it does not model physical occlusion inside a three-dimensional box. The user approved photorealistic AI assets for this intro on 2026-10-04. Menu photography remains separate.

## Assets and prompt set

Built-in image generation was used. Source alpha is preserved; images are clipped into ingredient regions at render time, without modifying the files. The burger source was already generated in the existing project.

- `client/public/food/burger-story/burger.png`: existing transparent assembled-burger source from `output/burger-film-free-v1/burger-source.png`.
- `client/public/food/burger-story/ingredients.png`: 1024×1536 transparent exploded-burger sheet, six independently animated regions.
- `client/public/food/burger-story/meal-box.png`: 1536×1024 transparent burger, fries, cola and open orange kraft meal box.

Ingredient generation prompt: Match the existing assembled burger exactly in texture, lighting, frontal perspective and scale. Produce a portrait photograph of six separated layers: sesame top bun and sauce, lettuce, tomato slices, upper beef patty with cheddar, lower beef patty with cheddar, and toasted bottom bun. Center all layers horizontally and leave large transparent gaps. Use natural food pores, moisture and studio lighting from upper left. No hands, wrapper, plate, labels, text, grid or background. Intended use: six movable photographic ingredient layers in a website.

Final ingredient edit prompt: Remove all colored background and glow from the exploded burger photograph. Preserve all six layers in their current position, size, color and detail. Output actual transparent RGBA alpha around and between every ingredient. No gradient, glow, drawn checkerboard or background pixels. Keep the 1024×1536 layout. Do not rearrange the food.

Meal box prompt: Match the reference sesame double cheeseburger. Photograph a low, wide, open orange and natural-kraft meal box from a frontal, slightly elevated camera. Burger front-left; golden fries in a plain orange sleeve on the right; plain dark cola cup with black lid and straw behind the fries. The lower front wall hides the bottom of the burger; the lid is open behind the food. Use matching upper-left studio lighting, real-looking melted cheese, pores, moisture, condensation and cardboard fibers. Keep the whole composition visible with generous surrounding space, landscape 1536×1024. Actual transparent RGBA alpha; no surface, backdrop, hand, person, lettering, logos or watermark.

## Fallbacks

Reduced-motion users get the static hero and immediate shopping content, without pinning. A failed image load also leaves the static hero usable. Mobile uses the same reversible sequence with sizes constrained to its viewport. The main hero links go straight to the menu, and a keyboard-focusable skip link bypasses the animation.

## Remaining release work

- Approve final food photos and prices with the restaurant.
- Decide delivery coverage, fees, taxes and a contact-phone workflow. Current server fees and discounts are zero.
- Online payments, password recovery and email verification are not implemented.
- Kitchen and management collections currently fetch at most 100 records; add pagination before operating at higher volume.
- Create and verify the production owner account once privileged production database access is available.
- Run the customer and staff journeys on the deployed app after backend hosting is restored.
