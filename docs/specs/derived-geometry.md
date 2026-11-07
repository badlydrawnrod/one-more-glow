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

## Out of scope

- Filled polygons
- Circles, arcs and curves
- Automatic curve tessellation
- Geometry validation, simplification or clipping beyond renderer surface clipping
- New renderer contract operations

These may be considered separately when a concrete consumer need arises.
