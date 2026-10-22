export const WHITE_SUIT_HUE=.999;
export const BLACK_SUIT_HUE=.998;
export function colorForSuitHue(THREE,hue,saturation=.72,lightness=.52){
  const h=Number(hue)||0;
  if(Math.abs(h-WHITE_SUIT_HUE)<1e-6)return new THREE.Color('#f0f3f5');
  if(Math.abs(h-BLACK_SUIT_HUE)<1e-6)return new THREE.Color('#24262e');
  return new THREE.Color().setHSL(h,saturation,lightness);
}
export function hueFromSuitColor(THREE,color){
  const value=new THREE.Color(color),hex=value.getHexString();
  if(hex==='f0f3f5')return WHITE_SUIT_HUE;
  if(hex==='24262e')return BLACK_SUIT_HUE;
  const hsl=value.getHSL({});
  if(hsl.s<.15&&hsl.l>.7)return WHITE_SUIT_HUE;
  if(hsl.s<.25&&hsl.l<.22)return BLACK_SUIT_HUE;
  return hsl.h;
}
export function suitHueDistance(a,b){
  const neutral=h=>Math.abs(h-WHITE_SUIT_HUE)<1e-6||Math.abs(h-BLACK_SUIT_HUE)<1e-6;
  if(neutral(a)||neutral(b))return Math.abs(a-b)<1e-6?0:1;
  const d=Math.abs(a-b)%1;return Math.min(d,1-d);
}
