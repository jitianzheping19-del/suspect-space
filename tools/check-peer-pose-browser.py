"""Real Chromium WebRTC test; discovery is an in-memory Firebase substitute.
No production Firebase, SkyWay credentials, microphone or external traffic.
Run: python tools/check-peer-pose-browser.py
"""
import asyncio
import argparse
import functools
import http.server
import json
from pathlib import Path
import threading
import time
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parent.parent

class QuietServer(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass

async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--expect-restricted', action='store_true', help='Verify safe fallback when browser policy blocks non-proxied UDP')
    options = parser.parse_args()
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietServer, directory=str(ROOT)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    url = f'http://127.0.0.1:{server.server_port}'
    ids = ['host', 'guest1', 'guest2', 'guest3', 'guest4']
    roster = {uid: {'online': True} for uid in ids}
    roster.update({'bot-a': {'online': True, 'bot': True}, 'bot-b': {'online': True, 'bot': True}})
    pages, contexts, errors = {}, [], []
    host_id, scope, enabled = 'host', '1:play', True
    writes = {'advertisements': 0, 'signals': 0}
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=[
            '--no-sandbox', '--disable-dev-shm-usage', '--disable-background-timer-throttling',
            '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
            '--disable-features=WebRtcHideLocalIpsWithMdns'])
        try:
            for index, uid in enumerate(ids):
                context = await browser.new_context()
                contexts.append(context)
                page = await context.new_page()
                pages[uid] = page
                page.on('pageerror', lambda error: errors.append(str(error)))
                await page.goto(url + '/peer-pose-network.js')
                async def write(kind, target, value, own=uid):
                    if kind == 'presence':
                        writes['advertisements'] += 1
                        if value is None:
                            roster[own].pop('poseNet', None)
                        else:
                            roster[own]['poseNet'] = value
                    elif roster[own].get('poseNet'):
                        writes['signals'] += 1
                        signals = roster[own]['poseNet'].setdefault('signals', {})
                        if value is None:
                            signals.pop(target, None)
                        else:
                            signals[target] = value
                await page.expose_function('poseWrite', write)
                await page.evaluate('''async ({uid,index})=>{
                  const {PeerPoseNetwork,POSE_CHECKPOINT_MS,POSE_FALLBACK_MS}=await import('/peer-pose-network.js');
                  window.h={uid,index,roster:{},hostId:'host',scope:'1:play',enabled:true,ticks:0,received:0,writes:0,lastWrite:Date.now(),positions:{}};
                  h.net=new PeerPoseNetwork({rtcConfiguration:{iceServers:[]},
                    writePresence:value=>poseWrite('presence',null,value),
                    writeSignal:(target,value)=>poseWrite('signal',target,value),
                    onPoses:poses=>{h.received++;Object.assign(h.positions,poses);}});
                  h.timer=setInterval(()=>{
                    h.net.configure({roomKey:'test:123',room:'test',session:1,uid,hostId:h.hostId,
                      scope:h.scope,online:true,enabled:h.enabled,roster:h.roster});
                    h.ticks++;const step=h.ticks*.012;
                    h.net.publishLocal({x:index*3+step,z:Math.sin(step),yaw:step,walking:true});
                    if(uid===h.hostId)h.net.publishBots({'bot-a':{x:step,z:12},'bot-b':{x:8,z:step}});
                    h.net.tick();
                    const cadence=h.net.canUseDirect()?POSE_CHECKPOINT_MS:POSE_FALLBACK_MS;
                    if(Date.now()-h.lastWrite>=cadence){h.writes++;h.lastWrite=Date.now();}
                  },50);
                }''', {'uid': uid, 'index': index})

            async def pump(seconds):
                until = time.monotonic() + seconds
                while time.monotonic() < until:
                    state = {'roster': roster, 'hostId': host_id, 'scope': scope, 'enabled': enabled}
                    await asyncio.gather(*(page.evaluate('(s)=>Object.assign(h,s)', state) for page in pages.values()))
                    await asyncio.sleep(.10)

            async def status():
                return dict(zip(pages, await asyncio.gather(*(page.evaluate('''()=>({direct:h.net.canUseDirect(),
                  links:h.net.links.size,received:h.received,writes:h.writes,scope:h.net.context?.scope,
                  states:[...h.net.links.values()].map(l=>({id:l.peerId,pc:l.pc.connectionState,ice:l.pc.iceConnectionState,signal:l.pc.signalingState,data:l.data?.readyState,control:l.control?.readyState,localCandidates:(l.pc.localDescription?.sdp||'').split('\\r\\n').filter(s=>s.includes('candidate:'))})),positions:Object.keys(h.positions),fresh:Object.keys(h.roster).filter(id=>h.net.poseFor(id)),stats:h.net.stats})''') for page in pages.values()))))

            async def ready(timeout=20):
                until = time.monotonic() + timeout
                while time.monotonic() < until:
                    await pump(.25)
                    state = await status()
                    if all(item['direct'] for item in state.values()):
                        return state
                raise AssertionError('direct connection did not converge: ' + json.dumps(await status())+' errors='+str(errors))

            if options.expect_restricted:
                await pump(17)
                restricted = await status()
                assert not errors, errors
                assert all(not item['direct'] and item['writes'] >= 60 for item in restricted.values()), restricted
                report = {'passed': True, 'nativeBrowsers': 5, 'mode': 'restricted-network-fallback',
                    'reason': 'Managed Chromium WebRtcIPHandling policy disables non-proxied UDP',
                    'directConnectionVerified': False, 'status': restricted, 'pageErrors': errors}
                (ROOT / 'tmp').mkdir(exist_ok=True)
                (ROOT / 'tmp/peer-pose-browser-results.json').write_text(json.dumps(report, indent=2))
                print(json.dumps(report, indent=2))
                return

            initial = await ready()
            assert initial['host']['links'] == 4
            assert all(initial[uid]['links'] == 1 for uid in ids[1:])
            await asyncio.gather(*(page.evaluate('()=>{h.writes=0;h.received=0;h.lastWrite=Date.now()}') for page in pages.values()))
            await pump(10.2)
            steady = await status()
            assert all(item['received'] > 100 for item in steady.values()), steady
            assert all(item['writes'] <= 2 for item in steady.values()), steady
            assert all('bot-a' in steady[uid]['positions'] for uid in ids[1:]), steady
            assert sum(len(row.get('poseNet', {}).get('signals', {})) for row in roster.values()) == 0, 'SDPs must be cleaned after connection'
            print('five real browsers: connected; 20 Hz direct motion; checkpoints <= 2 per 10 seconds', flush=True)

            # An old client must keep everyone on the compatible database path.
            roster['legacy'] = {'online': True}
            await pump(1.1)
            assert not any(item['direct'] for item in (await status()).values())
            del roster['legacy']
            await ready()

            # A broken data lane must stop checkpoint suppression within 750ms.
            await pages['host'].evaluate("()=>h.net.links.get('guest3').pc.close()")
            await pump(1.1)
            fallback = await status()
            assert not any(item['direct'] for item in fallback.values()), fallback
            # Advance only retry scheduling, avoiding a 30s wall-clock test wait.
            await asyncio.gather(*(page.evaluate('()=>h.net.retryAt.clear()') for page in pages.values()))
            recovered = await ready()
            print('legacy clients and closed data lane: automatic fallback and recovery passed', flush=True)

            scope = '2:play:teleport-123'
            await ready()
            assert all(item['scope'] == scope for item in (await status()).values())
            host_id = 'guest1'
            migrated = await ready()
            assert migrated['guest1']['links'] == 4
            assert all(migrated[uid]['links'] == 1 for uid in ids if uid != host_id)
            print('new round, teleport boundary and host migration passed', flush=True)

            enabled = False
            await pump(.7)
            disabled = await status()
            assert all(item['links'] == 0 and not item['direct'] for item in disabled.values())
            assert not errors, errors
            report = {'passed': True, 'realBrowserCount': 5,
                'steadyState': steady, 'discoveryWrites': writes,
                'checks': ['host star topology', 'continuous motion and bot poses', '5-second checkpoints',
                  'SDP cleanup', 'legacy participant fallback', 'connection failure fallback',
                  'reconnection', 'new round and teleport isolation', 'host migration', 'standard-mode cleanup'],
                'pageErrors': errors}
            (ROOT / 'tmp').mkdir(exist_ok=True)
            (ROOT / 'tmp/peer-pose-browser-results.json').write_text(json.dumps(report, indent=2))
            print(json.dumps({'passed': True, 'realBrowsers': 5, 'checkpointWritesIn10Seconds': {uid: row['writes'] for uid,row in steady.items()}, 'checks': report['checks']}, indent=2))
        finally:
            await browser.close()
            server.shutdown()

asyncio.run(main())
