# Current photographic burger story

The hero uses actual red burger photography inside live SVG FAST FOOD text, with real HTML campaign copy and links. It does not render a screenshot.

An intact photographic burger is visible in the hero foreground. On scroll, the backdrop, text and navigation disappear; five clipped ingredient layers separate, reassemble, and travel into an illustrated meal box alongside fries and cola. The final zoom blurs out into the ordinary menu. GSAP ScrollTrigger, SplitText and MotionPathPlugin drive one reversible timeline inside a physically reserved sticky section.

This is a 2.5D photographic approximation, not a real 3D model or filmed exploded burger. Hidden surfaces cannot be recovered from a single photograph. A true continuous 3D sequence requires a photographed/scanned model or a custom filmed shot. The rotating Pexels film was rejected and remains only in ignored output/real-burger-test-v1. No frame sequence is shipped by the current component.

Horizontal categories use a separate sticky viewport, perspective gate panels, light/dark surface materials and independent photo/title movement. Mobile and reduced-motion use native horizontal snapping. The preceding reveal is no longer pinned.

Deploy backend before frontend: staff navigation now uses authenticated GET /api/auth/access. These changes require no schema migration. Keep client/public/media/menu in deployments; public/food, markdown, docs and output are local references only. Docker development mounts source directories so local containers pick up current code.
