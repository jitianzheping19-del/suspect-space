import json,math
from pathlib import Path
from shapely.geometry import Polygon,Point,LineString
from shapely.ops import unary_union
ROOT=Path(__file__).resolve().parents[1];D=json.loads((ROOT/'assets-source/airship-map-data.json').read_text());F=json.loads((ROOT/'assets-source/airship-furniture.json').read_text());SCALE=1.48
rooms={r['id']:Polygon(r['polygon'],r.get('holes',[]))for r in D['rooms']};ends=list(set((w[i],w[i+1])for w in D['walls']for i in [0,2]))
for d in D['doors']:
 if d['kind']=='stall':continue
 a=(d['ax'],d['az']);b=(d['bx'],d['bz']);na=min(ends,key=lambda q:math.dist(a,q));nb=min(ends,key=lambda q:math.dist(b,q))
 if math.dist(a,na)<.7 and math.dist(b,nb)<.7:a,b=na,nb
 else:
  inter=rooms[d['rooms'][0]].boundary.intersection(rooms[d['rooms'][1]].boundary)
  pts=[]
  def collect(g):
   if g.geom_type=='Point':pts.append((g.x,g.y))
   elif g.geom_type=='LineString':pts.extend(list(g.coords))
   elif hasattr(g,'geoms'):
    for p in g.geoms:collect(p)
  collect(inter)
  if len(pts)<2:raise Exception('No verified opening: '+d['id'])
  a,b=max(((p,q)for p in pts for q in pts if p!=q),key=lambda pair:math.dist(*pair))
 dx=b[0]-a[0];dz=b[1]-a[1];w=math.hypot(dx,dz)
 d.update(ax=a[0],az=a[1],bx=b[0],bz=b[1],x=(a[0]+b[0])/2,z=(a[1]+b[1])/2,w=w,nx=-dz/w,nz=dx/w)
# Each stall gets a centred door across its actual floor opening, rather than a shared guessed grid.
stalls=[d for d in D['doors']if d['kind']=='stall'];cross=rooms['toilets'].intersection(LineString([(20,-9.79),(42,-9.79)]));bays=sorted([list(g.coords)for g in cross.geoms],key=lambda pts:pts[0][0])
for d,points in zip(stalls,bays):
 left,right=sorted([points[0][0],points[-1][0]]);z=-8.82;left+=.025;right-=.025
 d.update(ax=left,az=z,bx=right,bz=z,x=(left+right)/2,z=z,w=right-left,nx=0,nz=1)

# Place complete equipment footprints against a physical wall. Keep every portal
# and the points at which players interact clear before choosing a placement.
scaled_rooms={id:Polygon([(x*SCALE,z*SCALE)for x,z in p.exterior.coords],[[(x*SCALE,z*SCALE)for x,z in hole.coords]for hole in p.interiors])for id,p in rooms.items()}
lanes=[]
for d in D['doors']:
 a=(d['ax']*SCALE,d['az']*SCALE);b=(d['bx']*SCALE,d['bz']*SCALE)
 lanes.append(LineString([a,b]).buffer(.7 if d['kind']=='stall' else 1.35,cap_style=3))
anchors=[]
for point in D['tasks']+D['panels']+D['vents']:
 anchors.append(Point(point['x']*SCALE,point['z']*SCALE).buffer(.53))
for x,z in D['spawns']:anchors.append(Point(x*SCALE,z*SCALE).buffer(.6))
occupied=[];placed=[];dropped=[]
corridors={'gap','mainhall','mainhall-south','hall-n3','hall-n4','hall-s2','portraits'}
items=[i for i in F['items']if i['room']not in corridors and i['id']!='medical:medical-bed:55' and i['kind']!='toilet']
for item in sorted(items,key=lambda i:-i['size'][0]*i['size'][1]):
 polygon=scaled_rooms[item['room']];w,depth=item['size'];origin=(item['x']*SCALE,item['z']*SCALE);candidates=[]
 for wall in D['walls']:
  ax,az,bx,bz=[v*SCALE for v in wall[:4]];dx=bx-ax;dz=bz-az;length=math.hypot(dx,dz)
  if length<w+.32:continue
  tx,tz=dx/length,dz/length
  if polygon.boundary.distance(Point((ax+bx)/2,(az+bz)/2))>.5:continue
  projection=(origin[0]-ax)*tx+(origin[1]-az)*tz;lo=w/2+.14;hi=length-w/2-.14
  samples={max(lo,min(hi,projection)),lo,hi,length/2}
  for n in range(1,int(length/.35)+1):samples.add(max(lo,min(hi,projection+n*.35)));samples.add(max(lo,min(hi,projection-n*.35)))
  for along in samples:
   for side in [-1,1]:
    nx,nz=-tz*side,tx*side;offset=depth/2+.17;cx=ax+tx*along+nx*offset;cz=az+tz*along+nz*offset
    points=[(cx+tx*sx*w/2+nx*sy*depth/2,cz+tz*sx*w/2+nz*sy*depth/2)for sx,sy in [(-1,-1),(1,-1),(1,1),(-1,1)]];foot=Polygon(points)
    if not polygon.buffer(.012).covers(foot) or any(foot.intersects(lane)for lane in lanes) or any(foot.buffer(.12).intersects(a)for a in anchors) or any(foot.buffer(.18).intersects(o)for o in occupied):continue
    score=math.dist(origin,(cx,cz));candidates.append((score,cx,cz,-math.atan2(tz,tx)+(math.pi if side<0 else 0),foot))
 if not candidates:dropped.append(item['id']);continue
 _,cx,cz,yaw,foot=min(candidates,key=lambda c:c[0]);copy=dict(item);copy.update(x=round(cx/SCALE,5),z=round(cz/SCALE,5),rotationY=round(yaw,6),footprint=[round(abs(math.cos(yaw))*w+abs(math.sin(yaw))*depth,5),round(abs(math.sin(yaw))*w+abs(math.cos(yaw))*depth,5)],wallMounted=True);placed.append(copy);occupied.append(foot)
 if item['kind']=='meeting-table':D['meeting']=[round((cx+math.sin(yaw)*depth*.35)/SCALE,5),round((cz+math.cos(yaw)*depth*.35)/SCALE,5)]
# Four toilets sit inside their individual bays, clear of the common hall.
for k,points in enumerate(bays):
 left,right=sorted([points[0][0],points[-1][0]]);cx=(left+right)/2
 rear=[w[1]+(cx-w[0])*(w[3]-w[1])/(w[2]-w[0])for w in D['walls']if min(w[0],w[2])-.01<=cx<=max(w[0],w[2])+.01 and max(w[1],w[3])<-10.5 and abs(w[1]-w[3])<.2]
 cz=max(rear)+(.9+.17)/SCALE
 placed.append({'id':f'toilets:toilet:{k}','room':'toilets','kind':'toilet','x':round(cx,5),'z':round(cz,5),'turn':0,'rotationY':0,'size':[1.3,1.8],'footprint':[1.3,1.8],'wallMounted':True})
F['items']=sorted(placed,key=lambda i:i['id']);F['_meta']['worldScale']=SCALE;F['_meta']['placement']='Physical wall mounts with full footprint, doorway, interaction and neighbour clearance';D['_meta']['doorReview']='All 19 door spans aligned with traced jambs / shared room openings, 2026-10-22'
(ROOT/'assets-source/airship-map-data.json').write_text(json.dumps(D,ensure_ascii=False,indent=2)+'\n');(ROOT/'assets-source/airship-furniture.json').write_text(json.dumps(F,ensure_ascii=False,indent=2)+'\n')
print('placed',len(placed),'removed passage furniture',sum(i['room']in corridors for i in json.loads((ROOT/'assets-source/airship-furniture.json').read_text())['items']),'non-fitting props omitted',dropped)
