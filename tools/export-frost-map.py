"""Bake the approved FROST floorplan into floor, wall and walking polygons.

Run with Python 3 and Shapely 2 (pip install shapely==2.2.0).
This is an authoring tool; the browser and the Pages build need no Python.
Route endpoints in the source already extend inside rooms for full doorways.
"""

from pathlib import Path
import json
import math

from shapely.geometry import LineString, Point, Polygon
from shapely.geometry.polygon import orient
from shapely.ops import unary_union


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets-source/frost-layout-v7.json"
OUTPUT = ROOT / "frost-map-data.json"
TASK_SOURCE = ROOT / "assets-source/frost-task-layout.json"
VENT_SOURCE = ROOT / "assets-source/frost-vent-layout-v1.json"


def ring_coordinates(ring):
    return [[round(x, 6), round(y, 6)] for x, y in list(ring.coords)[:-1]]


def polygon_data(polygon):
    polygon = orient(polygon, sign=1)
    return {
        "outline": ring_coordinates(polygon.exterior),
        "holes": [ring_coordinates(ring) for ring in polygon.interiors],
    }


def polygons_data(geometry):
    return [polygon_data(polygon) for polygon in (
        [geometry] if geometry.geom_type == "Polygon" else geometry.geoms
    )]


def build():
    source = json.loads(SOURCE.read_text())
    rooms = [Polygon(room["outline"]) for room in source["rooms"]]
    corridors = [
        LineString(route["points"]).buffer(
            route["width"] / 2, cap_style=2, join_style=2
        )
        for route in source["routes"]
    ]
    floor = unary_union(rooms + corridors)
    assert floor.is_valid and floor.geom_type == "Polygon", "Disconnected floor"

    # The walls sit outside the union, including the courtyards inside loops.
    # In particular, no original room edge can close an intersecting corridor.
    walls = floor.buffer(
        source["wallThickness"], join_style=2, mitre_limit=2
    ).difference(floor)
    navigation = floor.buffer(-source["walkerRadius"], join_style=2)
    tasks = json.loads(TASK_SOURCE.read_text())["tasks"]
    footprints = []
    for task in tasks:
        x, y = task["position"]
        nx, ny = task["facing"]
        assert math.isclose(math.hypot(nx, ny), 1)
        footprint = Polygon([
            (x - ny * u + nx * v, y + nx * u + ny * v)
            for u, v in [(-.78, -.44), (.78, -.44), (.78, .44), (-.78, .44)]
        ])
        room = rooms[next(i for i, r in enumerate(source["rooms"]) if r["id"] == task["roomId"])]
        task["roomName"] = next(r["name"] for r in source["rooms"] if r["id"] == task["roomId"])
        assert room.covers(footprint), (task["id"], "Terminal outside room")
        for other, other_task in zip(footprints, tasks):
            assert not footprint.intersects(other), (task["id"], other_task["id"], "Terminals overlap")
        footprints.append(footprint)
        task["footprint"] = polygon_data(footprint)
        task["approach"] = [round(x + nx * 1.65, 6), round(y + ny * 1.65, 6)]
    navigation = navigation.difference(unary_union([
        shape.buffer(source["walkerRadius"], join_style=2) for shape in footprints
    ]))
    meeting = source["meeting"].copy()
    meeting_footprint = Point(meeting["position"]).buffer(meeting["radius"], quad_segs=12)
    assert rooms[0].covers(meeting_footprint)
    assert all(not meeting_footprint.intersects(shape) for shape in footprints)
    meeting["footprint"] = polygon_data(meeting_footprint)
    navigation = navigation.difference(meeting_footprint.buffer(source["walkerRadius"], join_style=2))
    assert navigation.contains(Point(meeting["approach"])), "Meeting button cannot be reached"
    assert walls.is_valid and not walls.is_empty
    assert navigation.is_valid and navigation.geom_type == "Polygon", "Narrow doorway"
    assert floor.intersection(walls).area < 1e-8, "Walls inside the floor"
    for task in tasks:
        assert navigation.contains(Point(task["approach"])), (task["id"], "Terminal cannot be reached")

    for index, room in enumerate(rooms):
        spawn = Point(source["rooms"][index].get("spawn", room.representative_point().coords[0]))
        assert navigation.contains(spawn)
        for other in rooms[index + 1:]:
            assert room.distance(other) >= 5 - 1e-6, "Room spacing changed"

    for route, corridor in zip(source["routes"], corridors):
        touched = {
            room["id"] for room, shape in zip(source["rooms"], rooms)
            if shape.intersection(corridor).area > 1e-6
        }
        assert touched == set(route["rooms"]), route["id"]
        assert navigation.covers(LineString(route["points"])), (
            "A route centreline cannot be walked", route["id"]
        )

    doors = []
    for room, shape in zip(source["rooms"], rooms):
        for route, corridor in zip(source["routes"], corridors):
            if room["id"] not in route["rooms"]:
                continue
            opening = shape.boundary.intersection(corridor)
            segments = [opening] if opening.geom_type == "LineString" else opening.geoms
            for index, segment in enumerate(segments):
                if segment.geom_type != "LineString" or segment.length < 1:
                    continue
                a, b = list(segment.coords)[0], list(segment.coords)[-1]
                width = math.dist(a, b)
                assert width > source["walkerRadius"] * 2 + 0.4
                doors.append({
                    "id": f"{room['id']}:{route['id']}:{index}",
                    "roomId": room["id"],
                    "routeId": route["id"],
                    "a": [round(v, 6) for v in a],
                    "b": [round(v, 6) for v in b],
                    "width": round(width, 6),
                })

    vent_source = json.loads(VENT_SOURCE.read_text())
    assert vent_source["status"] == "approved"
    assert vent_source["mapRevision"] == source["revision"]
    vents, openings = [], []
    for network in vent_source["networks"]:
        nodes = network["nodes"]
        assert len(network["routes"]) == len(nodes) - 1
        for index, route_id in enumerate(network["routes"]):
            route = next(route for route in source["routes"] if route["id"] == route_id)
            assert set(route["rooms"]) == {nodes[index]["roomId"], nodes[index + 1]["roomId"]}
        for index, node in enumerate(nodes):
            room_index = next(i for i, r in enumerate(source["rooms"]) if r["id"] == node["roomId"])
            room = source["rooms"][room_index]
            x, y = node["position"]
            dx, dy = room["label"][0] - x, room["label"][1] - y
            length = math.hypot(dx, dy)
            nx, ny = dx / length, dy / length
            def vent_polygon(width, depth):
                return Polygon([
                    (x - ny * u + nx * v, y + nx * u + ny * v)
                    for u, v in [(-width / 2, -depth / 2), (width / 2, -depth / 2),
                                 (width / 2, depth / 2), (-width / 2, depth / 2)]
                ])
            footprint = vent_polygon(1.26, 1.08)
            opening = vent_polygon(1.04, .84)
            assert rooms[room_index].contains(footprint), (node["id"], "Vent outside room")
            assert all(footprint.distance(shape) >= .85 for shape in footprints), (node["id"], "Vent too close to task")
            assert all(footprint.distance(LineString([door["a"], door["b"]])) >= 1.05 for door in doors), (node["id"], "Vent too close to door")
            exit_position = [round(x + nx * 1.4, 6), round(y + ny * 1.4, 6)]
            assert navigation.contains(Point(exit_position)), (node["id"], "Vent exit blocked")
            assert navigation.covers(LineString([node["position"], exit_position])), (node["id"], "Vent exit crosses obstacle")
            assert all(not footprint.intersects(other) for other in openings)
            openings.append(opening)
            vents.append({
                **node, "kind": "vent", "name": "ベント", "roomName": room["name"],
                "network": network["id"], "color": network["color"],
                "facing": [round(nx, 9), round(ny, 9)], "exit": exit_position,
                "links": [nodes[i]["id"] for i in [index - 1, index + 1] if 0 <= i < len(nodes)],
                "footprint": polygon_data(footprint), "opening": polygon_data(opening),
            })
    # Closed grates stay walkable. Only rendered floor/slab meshes have holes;
    # the vent state machine controls entry instead of ordinary floor collision.
    vent_openings = unary_union(openings)
    render_floor = floor.difference(vent_openings)
    assert render_floor.is_valid and render_floor.geom_type == "Polygon"

    data = {
        "id": source["id"],
        "revision": source["revision"],
        "name": source["name"],
        "description": source["description"],
        "units": source["units"],
        "wallHeight": source["wallHeight"],
        "wallThickness": source["wallThickness"],
        "walkerRadius": source["walkerRadius"],
        "bounds": list(floor.bounds),
        "area": round(floor.area, 6),
        "floor": polygon_data(floor),
        "renderFloor": polygon_data(render_floor),
        "walls": polygons_data(walls),
        "navigation": polygon_data(navigation),
        "doors": doors,
        "tasks": tasks,
        "meeting": meeting,
        "vents": vents,
        "rooms": [
            {**room, "spawn": list(room.get("spawn", shape.representative_point().coords[0])),
             "renderFloor": polygon_data(shape.difference(vent_openings))}
            for room, shape in zip(source["rooms"], rooms)
        ],
        "routes": [
            {**route, "floor": polygon_data(shape)}
            for route, shape in zip(source["routes"], corridors)
        ],
    }
    assert Polygon(data["floor"]["outline"], data["floor"]["holes"]).is_valid
    OUTPUT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
    print(
        f"FROST {data['revision']}: {len(rooms)} rooms, {len(corridors)} corridors, "
        f"{floor.area:.1f} m². All doors pass a {source['walkerRadius'] * 2:g} m walker."
    )


if __name__ == "__main__":
    build()
