# Check the shipped room-settings DOM without creating production accounts or rooms.
# Serve dist with: npx vite preview --host 127.0.0.1 --port 8769
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path('/workspace/github-deploy/tmp');out.mkdir(exist_ok=True)
results=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 for file,width,height in [('index.html',1280,800),('index.html',1024,768),('index.html',844,390),('space-suspect-complete.html',844,390)]:
  context=browser.new_context(viewport={'width':width,'height':height},is_mobile=width<1200,has_touch=width<1200,ignore_https_errors=True)
  page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  # Do not create accounts, rooms or traffic in the production Firebase project.
  page.route('**/identitytoolkit.googleapis.com/**',lambda r:r.abort())
  page.route('**/securetoken.googleapis.com/**',lambda r:r.abort())
  page.route('**/*firebasedatabase.app/**',lambda r:r.abort())
  page.route('**/*firebaseio.com/**',lambda r:r.abort())
  page.goto('http://127.0.0.1:8769/suspect-space/'+file,wait_until='domcontentloaded')
  try:
   page.wait_for_function('typeof window.__ssPoseNetworkStatus==="function"',timeout=45000)
   page.wait_for_timeout(500)
   diagnostic=page.evaluate('window.__ssPoseNetworkStatus()')
   page.add_style_tag(content='#setup,#firebaseConnecting,#firebaseOffline{display:none!important}#lobby{display:grid!important}#gmSettings{display:block!important}#gmSettingsRoomPanel{display:block!important}#gmSettingsRoleCountPanel,#gmSettingsRoleDetailPanel{display:none!important}')
   page.evaluate("""()=>{
     document.body.dataset.phase='lobby';
     const select=document.getElementById('positionUpdateMode');select.value='light';
     for(let el=select.parentElement;el&&el!==document.body;el=el.parentElement){el.hidden=false;el.classList.remove('hidden');el.style.setProperty('visibility','visible','important');}
     document.getElementById('lobby').classList.add('is-host');
   }""")
   page.wait_for_timeout(100)
   page.locator('#positionUpdateMode').scroll_into_view_if_needed()
   assert page.locator('#positionUpdateMode').locator('..').locator('small').count()==0
   assert page.locator('#positionUpdateMode option').all_text_contents()==['標準','軽量']
   box=page.locator('#positionUpdateMode').bounding_box()
   label=page.locator('.poseSyncSetting>span').bounding_box()
   assert label['x']+label['width']<=box['x']+1,(file,label,box)
   assert box['y']>=0 and box['y']+box['height']<=height+1,(file,box)

   assert box and box['width']>40 and box['height']>20,(file,box)
   assert box['x']>=0 and box['x']+box['width']<=width+1,(file,box)
   assert not errors,(file,errors)
   page.screenshot(path=str(out/('smart-pose-'+file.replace('.html','')+'-'+str(width)+'.png')))
   results.append({'file':file,'viewport':[width,height],'control':box,'diagnostic':diagnostic,'pageErrors':errors})
  except Exception:
   page.screenshot(path=str(out/('smart-pose-error-'+str(width)+'.png')))
   print(json.dumps({'file':file,'errors':errors,'body':page.locator('body').inner_text()[:500]},ensure_ascii=False),flush=True)
   raise
  finally:context.close()
 browser.close()
(out/'smart-pose-ui-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2));print(json.dumps(results,ensure_ascii=False,indent=2))
