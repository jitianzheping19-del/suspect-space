import {build} from 'esbuild';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';

const libraryStart='/* MEETING_BUNDLED_LIBRARIES_BEGIN */';
const libraryEnd='/* MEETING_BUNDLED_LIBRARIES_END */';

// The srcdoc has its own module graph. Ship its libraries inside the document
// so a failed CDN request or unsupported import map cannot strand a meeting.
export async function bundleMeetingLibraries(html) {
  const moduleTag = /<script type="module">([\s\S]*?)<\/script>/;
  const match = html.match(moduleTag);
  if (!match) throw new Error('Meeting module is missing');
  const imports = [], names = [];
  const script = match[1].replace(/^import\s+(\*\s+as\s+(\w+)|\{([^}]+)\})\s+from\s+["'](?:three(?:\/[^"']*)?|\.\/meeting-location-input\.js)["'];?\s*$/gm,
    (statement, _binding, namespace, members) => {
      imports.push(statement);
      names.push(...(namespace ? [namespace] : members.split(',').map(name => name.trim())));
      return '';
    });
  if (!names.includes('THREE') || /\bimport\s.*\bfrom\s*["']three/.test(script)) {
    throw new Error('Meeting library imports could not be bundled');
  }
  const result = await build({
    stdin: {contents: imports.join('\n') + '\nexport {' + names.join(',') + '};', resolveDir: process.cwd()},
    bundle: true, write: false, format: 'iife', globalName: '__meetingLibraries',
    minify: true, target: 'es2020', legalComments: 'inline',
  });
  const libraries = result.outputFiles[0].text;
  if (/<\/script/i.test(libraries)) throw new Error('Unsafe meeting library script terminator');
  return html.replace(moduleTag, () => '<script type="module">\n' + libraryStart + '\n' + libraries + '\n' + libraryEnd +
    '\nconst {' + names.join(',') + '}=__meetingLibraries;\n' + script + '</script>')
    .replace(/<script type="importmap">[\s\S]*?<\/script>\s*/, '');
}

// Pages can fetch the iframe's dependency from the same release when the meeting opens.
// The editable HTML and standalone GAS export keep their self-contained module.
export function splitMeetingLibraries(){
  let base;
  return {
    name:'split-meeting-libraries',apply:'build',enforce:'pre',
    configResolved(config){base=config.base;},
    transform(code,id){
      if(!id.includes('html-proxy')||!code.includes('const EMBEDDED_ASSET_PAYLOAD='))return;
      const payload=/const EMBEDDED_ASSET_PAYLOAD=(\[[\s\S]*?\])\.join\(""\);/;
      const match=code.match(payload);
      if(!match)this.error('Cannot locate the embedded game assets');
      const assets=JSON.parse(gunzipSync(Buffer.from(JSON.parse(match[1]).join(''),'base64')));
      const html=assets.MEETING_3D_SRCDOC,start=html.indexOf(libraryStart),end=html.indexOf(libraryEnd);
      if(start<0||end<=start)this.error('Cannot locate the bundled meeting libraries');
      const library=html.slice(start+libraryStart.length,end)+'\nexport default __meetingLibraries;';
      const hash=createHash('sha256').update(library).digest('hex').slice(0,16);
      const fileName='assets/meeting-libraries-'+hash+'.js';
      this.emitFile({type:'asset',fileName,source:library});
      assets.MEETING_3D_SRCDOC=html.slice(0,start)+'import __meetingLibraries from '+JSON.stringify(base+fileName)+';'+html.slice(end+libraryEnd.length);
      const compressed=gzipSync(Buffer.from(JSON.stringify(assets)),{level:9}).toString('base64');
      return {code:code.replace(payload,()=> 'const EMBEDDED_ASSET_PAYLOAD='+JSON.stringify(compressed)+';'),map:null};
    }
  };
}
