# Transformation Specification

This specification defines how callers transform drawing coordinates with the
backend-independent drawing contract.

## Purpose

**Status: Accepted**  
**Implementation: Implemented**

Transformations let consumers draw reusable geometry in local coordinates and
place, orient or size it in the logical display. The same stack can be used for
a scene-wide camera transform and for nested object transforms. It does not add
retained objects, groups or a scene graph.

## Public operations

Add these operations to the public drawing contract:

```ts
pushTransform(): void
popTransform(): void
translate(x: number, y: number): void
rotate(angleDegrees: number): void
scale(x: number, y: number): void
```

They operate on a current transform, initially the identity transform. The
operations affect positions submitted by `moveTo`, `lineTo`, `point` and the
renderer-independent derived-geometry helpers. They do not change colour or
intensity.

`pushTransform()` saves the current transform on a stack. `popTransform()`
restores the most recently saved transform and removes that saved entry. A pop
when no transform has been pushed is a no-op and leaves the current transform
unchanged.

## Coordinate and composition semantics

Transformations use the logical coordinate system selected for the renderer:
the origin is at the display centre, positive X points right, and positive Y
points up. Translation distances are in logical units. Rotation angles are in
degrees, with positive angles rotating counter-clockwise. `scale(x, y)` scales
the local X and Y axes independently; equal values give uniform scaling.

The meaning of a sequence is defined by its effect on a submitted point, rather
than by an ambiguous matrix-order phrase. For example:

```ts
pushTransform();
translate(shipX, shipY);
rotate(shipAngleDegrees);
scale(shipScaleX, shipScaleY);
drawShipInLocalCoordinates();
popTransform();
```

For a local point `(x, y)`, the scale is applied first, then rotation about the
local origin, then translation to `(shipX, shipY)`. Thus the ship's origin is
placed at its position, and the ship is rotated and scaled around that origin.
More generally, when operations are called in the order `A`, then `B`, then
`C`, the resulting point is affected by `C` first, then `B`, then `A`. This
convention allows a caller to state the desired placement first, followed by
orientation and local size.

Nested transforms compose with the transform active at the time of the call.
For example, an object transform pushed inside a scene transform is affected by
the scene transform as well. `popTransform()` restores the exact parent
transform, so local object operations do not alter it.

## Frame behavior and rendering

`beginFrame()` resets the transform to identity and clears the transform stack.
The stack therefore cannot leak transforms from one frame into the next. A
consumer may push a scene-wide transform after `beginFrame()` and push further
transforms for individual objects.

Transforms change geometry positions and dimensions, but do not scale the
beam's output-pixel profile. Line-core width, point radius and halo dimensions
remain measured in CSS pixels, consistent with the logical viewport mapping.
The Canvas 2D and WebGL2 renderers must produce equivalent transformed geometry
and preserve drawing order. Their rasterized pixels need not be identical.

## Boundaries

The transform stack is drawing state only. It does not define a camera object,
viewport resizing, clipping beyond the existing display surface, or batching of
objects. Consumers can express a scene-wide translation, rotation or scale by
pushing and applying a transform before drawing the scene.

The public contract does not expose a matrix type or renderer-specific
transformation API.
