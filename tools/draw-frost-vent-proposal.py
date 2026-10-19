"""Draw a review-only vent proposal; this never modifies runtime map data."""
from pathlib import Path
import json
import math
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.font_manager import FontProperties
from matplotlib.path import Path as MplPath
from matplotlib.patches import PathPatch, Circle
from shapely.geometry import Polygon, LineString, Point, box
from shapely.geometry.polygon import orient

ROOT = Path(__file__).resolve().parents[1]
data = json.loads((ROOT / "frost-map-data.json").read_text())
proposal = json.loads((ROOT / "docs/frost-vent-proposal-v1.json").read_text())
assert proposal["status"] == "proposal-only" and "vents" not in data
font = FontProperties(fname="/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc")
bold = FontProperties(fname="/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc")
plt.rcParams["svg.fonttype"] = "path"
plt.rcParams["svg.hashsalt"] = "frost-vent-proposal-v1"


def polygon(shape):
    return Polygon(shape["outline"], shape.get("holes", []))


def path(shape):
    poly = orient(shape, sign=1)
    vertices, codes = [], []
    for ring in [poly.exterior, *poly.interiors]:
        points = list(ring.coords)
        vertices.extend(points)
        codes.extend([MplPath.MOVETO] + [MplPath.LINETO] * (len(points) - 2) + [MplPath.CLOSEPOLY])
    return MplPath(vertices, codes)


floor = polygon(data["floor"])
rooms = {room["id"]: room for room in data["rooms"]}
routes = {route["id"]: route for route in data["routes"]}
links = []
for network in proposal["networks"]:
    for node in network["nodes"]:
        x, y = node["position"]
        footprint = box(x - .46, y - .38, x + .46, y + .38)
        assert polygon(rooms[node["roomId"]]).contains(footprint), node["id"]
        assert all(footprint.distance(polygon(task["footprint"])) >= 1 for task in data["tasks"]), node["id"]
        assert all(footprint.distance(LineString([door["a"], door["b"]])) >= 1.2 for door in data["doors"]), node["id"]
    for index, route_id in enumerate(network["routes"]):
        a, b = network["nodes"][index:index + 2]
        route = routes[route_id]
        points = route["points"]
        # Select the direction whose endpoint lies inside the first room.
        if not polygon(rooms[a["roomId"]]).contains(Point(points[0])):
            points = list(reversed(points))
        assert polygon(rooms[a["roomId"]]).contains(Point(points[0]))
        assert polygon(rooms[b["roomId"]]).contains(Point(points[-1]))
        line = LineString([a["position"], *points, b["position"]])
        assert floor.buffer(1e-5).covers(line), route_id
        links.append((network, line))

fig = plt.figure(figsize=(16, 11.5), facecolor="#07111e")
ax = fig.add_axes([.035, .125, .67, .755])
ax.set_xlim(-35, 35)
ax.set_ylim(-33, 29)
ax.set_aspect("equal")
ax.axis("off")
ax.add_patch(PathPatch(path(floor), facecolor="#233a4a", edgecolor="#020710", lw=9, joinstyle="round", zorder=1))
for room in data["rooms"]:
    ax.add_patch(PathPatch(path(polygon(room)), facecolor=room["color"], edgecolor="none", zorder=2))
clip = PathPatch(path(floor), transform=ax.transData)
for x in range(-34, 35, 2):
    line = ax.plot([x, x], [-33, 29], color="#aac8d6", alpha=.07, lw=.4, zorder=3)[0]
    line.set_clip_path(clip)
for y in range(-32, 30, 2):
    line = ax.plot([-35, 35], [y, y], color="#aac8d6", alpha=.07, lw=.4, zorder=3)[0]
    line.set_clip_path(clip)
ax.add_patch(PathPatch(path(floor), facecolor="none", edgecolor="#a9c7d5", lw=1.65, joinstyle="round", zorder=4))

for task in data["tasks"]:
    ax.add_patch(PathPatch(path(polygon(task["footprint"])),
        facecolor="#f0b476" if task.get("sabotage") else "#68c6ba",
        edgecolor="#081725", lw=.65, alpha=.9, zorder=6))
for network, line in links:
    ax.plot(*line.xy, color="#07111e", lw=5, alpha=.6, zorder=7)
    ax.plot(*line.xy, color=network["color"], lw=1.8, ls=(0, (3, 3)), alpha=.9, zorder=8)
    middle = line.length * .5
    start = line.interpolate(max(0, middle - .7))
    end = line.interpolate(min(line.length, middle + .7))
    ax.annotate("", xy=(end.x, end.y), xytext=(start.x, start.y),
        arrowprops=dict(arrowstyle="<->", color=network["color"], lw=1.2, mutation_scale=9), zorder=9)

for room in data["rooms"]:
    x, y = room["label"]
    ax.text(x, y, room["name"], fontproperties=bold, fontsize=12.4,
        ha="center", va="center", color="#e6f2f5", zorder=12,
        bbox=dict(boxstyle="round,pad=.16", facecolor=room["color"], edgecolor="none", alpha=.9))
for network in proposal["networks"]:
    for node in network["nodes"]:
        x, y = node["position"]
        ax.add_patch(Circle((x, y), .86, facecolor="#091a29", edgecolor=network["color"], lw=1.7, zorder=15))
        ax.text(x, y, node["id"], ha="center", va="center", fontsize=9.6,
            color=network["color"], fontweight="bold", zorder=16)

ax.add_patch(Circle((0, 0), .98, facecolor="#1d3347", edgecolor="#85bbc3", lw=1, zorder=14))
ax.add_patch(Circle((0, 0), .43, facecolor="#f05a6d", edgecolor="#ffc4cb", lw=1, zorder=15))
ax.text(0, -1.8, "会議", fontproperties=bold, fontsize=9, color="#ffc4cb", ha="center", va="center", zorder=15)
ax.annotate("", xy=(-33, 27), xytext=(-33, 23), arrowprops=dict(arrowstyle="-|>", color="#9ab7c8", lw=1))
ax.text(-33, 28, "N", ha="center", color="#9ab7c8", fontsize=10)

fig.text(.07, .94, "F R O S T", fontproperties=bold, fontsize=28, color="#e9f6ff")
fig.text(.07, .902, "ベント配置案 01", fontproperties=font, fontsize=15, color="#9cbcca")
fig.text(.94, .94, "10 VENTS / 3 NETWORKS", fontsize=12, color="#9dded7", ha="right", fontweight="bold")
fig.text(.94, .906, "位置と接続先の確認用", fontproperties=font, fontsize=11, color="#a9bfcd", ha="right")
fig.add_artist(plt.Line2D([.07, .94], [.882, .882], transform=fig.transFigure, color="#294357", lw=1))

legend = fig.add_axes([.745, .16, .22, .68])
legend.axis("off")
y = .98
for network in proposal["networks"]:
    legend.text(0, y, f"{network['id']}  {network['name']}", fontproperties=bold, fontsize=16, color=network["color"], va="top")
    y -= .07
    for index, node in enumerate(network["nodes"]):
        legend.text(.02, y, node["id"], fontsize=11, color=network["color"], fontweight="bold", va="top")
        legend.text(.2, y, rooms[node["roomId"]]["name"], fontproperties=font, fontsize=12.5, color="#e5f1f7", va="top")
        y -= .045
        if index < len(network["nodes"]) - 1:
            legend.text(.24, y + .004, "↕", fontsize=10, color="#7892a6", va="top")
            y -= .018
    y -= .04

fig.add_artist(plt.Line2D([.07, .94], [.12, .12], transform=fig.transFigure, color="#294357", lw=1))
fig.text(.07, .087, "中央ドームは会議ボタンのある、徒歩で集まる場所に。", fontproperties=bold, fontsize=12.5, color="#e1edf6")
fig.text(.07, .057, "色付き破線＝ベント接続案　／　隣のベントへ移動・別系統へは徒歩", fontproperties=font, fontsize=10, color="#9cbcca")
fig.text(.835, .087, "■ 通常タスク", fontproperties=font, fontsize=10, color="#68c6ba", ha="right")
fig.text(.94, .087, "■ 緊急端末", fontproperties=font, fontsize=10, color="#f0b476", ha="right")
fig.text(.94, .057, "出入口・端末から離れた壁際に配置", fontproperties=font, fontsize=10, color="#9cbcca", ha="right")

for extension in ["png", "svg"]:
    target = ROOT / "public" / f"frost-vent-proposal-v1.{extension}"
    fig.savefig(target, dpi=180, facecolor=fig.get_facecolor(),
        metadata={"Date": None} if extension == "svg" else None)
    if extension == "svg":
        target.write_text("\n".join(line.rstrip() for line in target.read_text().splitlines()) + "\n")
print("Proposal only: 10 vents, 3 separate chains, 7 links. Doors and tasks remain clear.")
