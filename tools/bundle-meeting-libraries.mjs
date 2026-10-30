import {build} from 'esbuild';

// The srcdoc has its own module graph. Ship its libraries inside the document
// so a failed CDN request or unsupported import map cannot strand a meeting.
export async function bundleMeetingLibraries(html) {
  const moduleTag = /<script type="module">([\s\S]*?)<\/script>/;
  const match = html.match(moduleTag);
  if (!match) throw new Error('Meeting module is missing');
  const imports = [], names = [];
  const script = match[1].replace(/^import\s+(\*\s+as\s+(\w+)|\{([^}]+)\})\s+from\s+["']three(?:\/[^"']*)?["'];?\s*$/gm,
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
  return html.replace(moduleTag, () => '<script type="module">\n' + libraries +
    '\nconst {' + names.join(',') + '}=__meetingLibraries;\n' + script + '</script>')
    .replace(/<script type="importmap">[\s\S]*?<\/script>\s*/, '');
}
