// Extract real gameplay stills from the tutorial clips for browsers without video playback.
import {execFileSync} from 'node:child_process';
import {SOCCER_GUIDE,soccerGuidePhotos} from '../lobby-soccer-guide.js';
for(const [id]of SOCCER_GUIDE)for(const photo of soccerGuidePhotos(id)){
 execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-ss',String(photo.time),'-i','public/tutorial/soccer/'+id+'.mp4','-frames:v','1','-q:v','3','public/'+photo.src]);
}
console.log('Rendered '+SOCCER_GUIDE.length*3+' tutorial photos');
