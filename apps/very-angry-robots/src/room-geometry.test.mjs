import test from "node:test";
import assert from "node:assert/strict";
import { ROOM, WALL_THICKNESS } from "./maze.ts";
import { createRoomGeometry, DOOR_OPENING, DOOR_JAMB_LENGTH } from "./room-geometry.ts";

const SIDES = ["left", "right", "top", "bottom"];

test("every room side has a centered 120-unit doorway and 12-unit jambs", () => {
  const geometry = createRoomGeometry();
  assert.equal(geometry.entrance, "left");
  assert.equal(geometry.wallRects.length, 8);
  assert.equal(geometry.jambRects.length, 8);
  assert.equal(geometry.hazardRects.length, 17);
  assert.equal(geometry.doors.filter((door) => !door.open).length, 1);

  for (const door of geometry.doors) {
    const span = door.side === "left" || door.side === "right" ? ROOM.height : ROOM.width;
    assert.equal(door.openingEnd - door.openingStart, DOOR_OPENING);
    assert.equal((door.openingStart + door.openingEnd) / 2, span / 2);
    assert.equal(door.jambRects.length, 2);
    for (const jamb of door.jambRects) {
      assert.ok(jamb.width === WALL_THICKNESS || jamb.height === WALL_THICKNESS);
      assert.ok(jamb.width === DOOR_JAMB_LENGTH || jamb.height === DOOR_JAMB_LENGTH);
    }
  }
});

test("each entrance side closes only its own centered opening", () => {
  for (const side of SIDES) {
    const geometry = createRoomGeometry(side);
    assert.equal(geometry.entrance, side);
    assert.deepEqual(geometry.doors.filter((door) => !door.open).map((door) => door.side), [side]);
    assert.ok(geometry.closedDoorRect.width === WALL_THICKNESS || geometry.closedDoorRect.height === WALL_THICKNESS);
    assert.ok(geometry.closedDoorRect.width === DOOR_OPENING - WALL_THICKNESS || geometry.closedDoorRect.height === DOOR_OPENING - WALL_THICKNESS);
    const door = geometry.doors.find((candidate) => candidate.side === side);
    assert.ok(door?.doorLine);
    assert.equal(door.doorLine.length, 4);
    const rect = geometry.closedDoorRect;
    const start = side === "top" || side === "bottom" ? rect.x : rect.y;
    const length = side === "top" || side === "bottom" ? rect.width : rect.height;
    assert.equal(start, door.openingStart + WALL_THICKNESS / 2);
    assert.equal(start + length, door.openingEnd - WALL_THICKNESS / 2);
  }
});

test("open doorway centers have no perimeter or jamb collision hazard", () => {
  for (const side of SIDES) {
    const geometry = createRoomGeometry(side);
    for (const door of geometry.doors.filter((candidate) => candidate.open)) {
      const point = door.center;
      const overlaps = (rect) => point.x >= rect.x && point.x <= rect.x + rect.width
        && point.y >= rect.y && point.y <= rect.y + rect.height;
      assert.equal(geometry.wallRects.some(overlaps), false, `${side} entrance: wall blocks ${door.side} doorway`);
      assert.equal(geometry.jambRects.some(overlaps), false, `${side} entrance: jamb blocks ${door.side} doorway`);
    }
  }
});
