import { ROOM, WALL_THICKNESS } from "./maze.ts";

/** The four sides of the room, named in room coordinates. */
export type RoomSide = "left" | "right" | "top" | "bottom";

export interface RoomRect {
  x: number;
  y: number;
  width: number;
  height: number;
  electrified: true;
}

export interface RoomDoor {
  side: RoomSide;
  open: boolean;
  /** Point at the center of the doorway, on the room boundary. */
  center: { x: number; y: number };
  /** Tangent coordinates: y for left/right doors, x for top/bottom doors. */
  openingStart: number;
  openingEnd: number;
  /** Jamb collision rectangles belonging to this doorway. */
  jambRects: RoomRect[];
  /** Endpoints for the visible closed-door bar, when this is the entrance. */
  doorLine?: [number, number, number, number];
}

export interface RoomGeometry {
  /** Perimeter wall rectangles with doorway gaps; suitable for wall outlines. */
  wallRects: RoomRect[];
  /** Jamb rectangles kept out of wallRects so outlines have no internal joins. */
  jambRects: RoomRect[];
  /** Full-thickness hazard rectangle across the closed entrance doorway. */
  closedDoorRect: RoomRect;
  /** All perimeter, jamb and closed-door collision hazards. */
  hazardRects: RoomRect[];
  doors: RoomDoor[];
  entrance: RoomSide;
}

export const DOOR_OPENING = 120;
export const DOOR_JAMB_LENGTH = 12;

const SIDES: readonly RoomSide[] = ["left", "right", "top", "bottom"];

/**
 * Builds the shared perimeter geometry for rendering and collision. The initial
 * room uses the default left entrance; subsequent rooms pass the side they are
 * entered from. Each side has a centered 120-unit opening.
 */
export function createRoomGeometry(entrance: RoomSide = "left"): RoomGeometry {
  const edge = WALL_THICKNESS;
  const halfEdge = edge / 2;
  const halfDoor = DOOR_OPENING / 2;
  const wallRects: RoomRect[] = [];
  const doors: RoomDoor[] = [];
  const jambRects: RoomRect[] = [];

  for (const side of SIDES) {
    const horizontal = side === "top" || side === "bottom";
    const span = horizontal ? ROOM.width : ROOM.height;
    const start = span / 2 - halfDoor;
    const end = span / 2 + halfDoor;
    const center = side === "left" ? { x: 0, y: ROOM.height / 2 }
      : side === "right" ? { x: ROOM.width, y: ROOM.height / 2 }
      : side === "top" ? { x: ROOM.width / 2, y: 0 }
      : { x: ROOM.width / 2, y: ROOM.height };

    // Extend adjoining wall ends by half a thickness, matching the existing
    // perimeter treatment at corners while keeping a real gap at each door.
    if (horizontal) {
      const y = side === "top" ? -halfEdge : ROOM.height - halfEdge;
      wallRects.push(
        { x: -halfEdge, y, width: start + edge, height: edge, electrified: true },
        { x: end - halfEdge, y, width: ROOM.width - end + edge, height: edge, electrified: true },
      );
    } else {
      const y = -halfEdge;
      wallRects.push(
        { x: side === "left" ? -halfEdge : ROOM.width - halfEdge, y, width: edge, height: start + edge, electrified: true },
        { x: side === "left" ? -halfEdge : ROOM.width - halfEdge, y: end - halfEdge, width: edge, height: ROOM.height - end + edge, electrified: true },
      );
    }

    // Jambs sit just inside the room at both ends of the opening. Keeping them
    // separate from wall rectangles lets the renderer outline each union cleanly.
    const jambs: RoomRect[] = horizontal
      ? [
        { x: start - halfEdge, y: side === "top" ? 0 : ROOM.height - DOOR_JAMB_LENGTH, width: edge, height: DOOR_JAMB_LENGTH, electrified: true },
        { x: end - halfEdge, y: side === "top" ? 0 : ROOM.height - DOOR_JAMB_LENGTH, width: edge, height: DOOR_JAMB_LENGTH, electrified: true },
      ]
      : [
        { x: side === "left" ? 0 : ROOM.width - DOOR_JAMB_LENGTH, y: start - halfEdge, width: DOOR_JAMB_LENGTH, height: edge, electrified: true },
        { x: side === "left" ? 0 : ROOM.width - DOOR_JAMB_LENGTH, y: end - halfEdge, width: DOOR_JAMB_LENGTH, height: edge, electrified: true },
      ];
    jambRects.push(...jambs);
    const closed = side === entrance;
    doors.push({
      side,
      open: !closed,
      center,
      openingStart: start,
      openingEnd: end,
      jambRects: jambs,
      ...(closed ? { doorLine: horizontal
        ? [center.x, center.y - halfEdge, center.x, center.y + halfEdge] as [number, number, number, number]
        : [center.x - halfEdge, center.y, center.x + halfEdge, center.y] as [number, number, number, number] } : {}),
    });
  }

  const doorLength = DOOR_OPENING - edge;
  const closedDoorRect: RoomRect = entrance === "left"
    ? { x: -halfEdge, y: ROOM.height / 2 - halfDoor + halfEdge, width: edge, height: doorLength, electrified: true }
    : entrance === "right"
      ? { x: ROOM.width - halfEdge, y: ROOM.height / 2 - halfDoor + halfEdge, width: edge, height: doorLength, electrified: true }
      : entrance === "top"
        ? { x: ROOM.width / 2 - halfDoor + halfEdge, y: -halfEdge, width: doorLength, height: edge, electrified: true }
        : { x: ROOM.width / 2 - halfDoor + halfEdge, y: ROOM.height - halfEdge, width: doorLength, height: edge, electrified: true };

  return {
    wallRects,
    jambRects,
    closedDoorRect,
    hazardRects: [...wallRects, ...jambRects, closedDoorRect],
    doors,
    entrance,
  };
}
