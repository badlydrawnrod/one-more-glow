# Derived Geometry Specification

This specification defines convenience geometry built from the fundamental drawing operations in the vector-display specification.

## Purpose

**Status: Accepted**

Derived geometry makes common connected outlines easier to submit while preserving the small immediate-mode drawing contract. It does not introduce new rendering primitives or renderer-specific behavior.

## Open polylines and polygon outlines

**Status: Accepted**
**Implementation: Implemented**

Provide two helpers that operate on a `DrawingContext` and a sequence of 2D points:

- `drawPolyline(drawing, points)` moves to the first point and draws line segments through each following point. It leaves the path open.
- `drawPolygonOutline(drawing, points)` draws the same sequence and adds a final segment back to the first point.

The point type is an immutable pair of logical `x` and `y` coordinates. Coordinates may be fractional and use the logical coordinate system selected for the renderer.

Both helpers use the existing `moveTo` and `lineTo` operations. Current colour, intensity, beam profile, drawing order and renderer behavior therefore apply as they do to individually submitted lines. The helpers do not add drawing state or renderer commands.

Inputs with fewer than two points for a polyline, or fewer than three points for a polygon outline, produce no drawing operations. Repeated points and self-intersections are passed through as supplied; helpers do not validate or alter geometry.

The helpers belong in a renderer-independent geometry module and are exported through the public library entry point. They are utilities, not methods on `DrawingContext`.

## Circles and ellipses

**Status: Accepted**
**Implementation: Implemented**

Add `drawCircle(drawing, center, radius)` and `drawEllipse(drawing, center, radiusX, radiusY)` helpers. A circle is a common operation in its own right, even though it can also be expressed as an ellipse with equal radii.

Both helpers approximate the curve with line segments and submit the result as a closed outline. The generated geometry uses the same colour, intensity, beam profile and ordering semantics as other line-based outlines.

Choose the segment count from a maximum chord error of 0.5 logical coordinate units. For a circle of radius `r`, use:

```text
segments = ceil(π / acos(1 - 0.5 / r))
```

Use at least 12 segments. For an ellipse, apply the same calculation using the larger of `radiusX` and `radiusY`; this conservatively bounds the deviation for the ellipse. The number of segments is an internal implementation detail, not a caller option. This rule gives a deterministic approximation in logical units without coupling geometry helpers to renderer or canvas sizing.

If the circle radius is zero or negative, the helper produces no drawing operations. If either ellipse radius is zero or negative, the helper also produces no drawing operations. Invalid drawing dimensions do not throw.

## Arcs

**Status: Accepted**
**Implementation: Implemented**

Provide open circular and elliptical arc helpers:

```ts
drawArc(
  drawing: DrawingContext,
  center: Point,
  radius: number,
  startAngleDegrees: number,
  endAngleDegrees: number,
): void

drawEllipseArc(
  drawing: DrawingContext,
  center: Point,
  radiusX: number,
  radiusY: number,
  startAngleDegrees: number,
  endAngleDegrees: number,
): void
```

Angles are in degrees, measured counter-clockwise from positive X in the logical coordinate system, where positive Y points up. The signed sweep is `endAngleDegrees - startAngleDegrees`: a positive sweep runs counter-clockwise and a negative sweep runs clockwise. Angles are not normalized or wrapped, so callers can choose the sweep across zero explicitly. For example, `350` to `370` is a 20-degree counter-clockwise arc; `350` to `10` is a 340-degree clockwise arc. Both endpoint positions are included. The arc is an open curve: it does not add lines from its endpoints to the centre. The segment count is selected internally, using the same maximum chord error of 0.5 logical units as circles and ellipses; for an ellipse, use the larger radius to bound the error.

For circular arcs, a nonpositive radius produces no drawing operations. For elliptical arcs, either nonpositive radius produces no drawing operations. Invalid dimensions do not throw. Full circles remain the responsibility of `drawCircle` and `drawEllipse`.

## Out of scope

- Filled polygons
- Curves other than the accepted circle and ellipse outlines
- Geometry validation, simplification or clipping beyond renderer surface clipping
- New renderer contract operations

Other derived geometry may be considered separately when a concrete consumer need arises.
