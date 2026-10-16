import {writeFileSync} from 'node:fs';
import {deflateSync} from 'node:zlib';

const table=Array.from({length:256},(_,n)=>{
 let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;
});
function crc32(bytes){let c=0xffffffff;for(const b of bytes)c=table[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
function chunk(type,data){const name=Buffer.from(type);const length=Buffer.alloc(4),crc=Buffer.alloc(4);length.writeUInt32BE(data.length);crc.writeUInt32BE(crc32(Buffer.concat([name,data])));return Buffer.concat([length,name,data,crc]);}
function insideRounded(x,y,size){const radius=size*112/512;const nearX=Math.max(radius-x,0,x-(size-radius));const nearY=Math.max(radius-y,0,y-(size-radius));return nearX*nearX+nearY*nearY<=radius*radius;}
function image(size){
 const rows=Buffer.alloc(size*(1+size*4));
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const offset=y*(1+size*4)+1+x*4;const sx=(x+.5)*512/size,sy=(y+.5)*512/size;
  const grad=(sx+sy)/1024;
  let rgb=[Math.round(23+13*grad),Math.round(33+26*grad),Math.round(38+17*grad)];
  const e=(sx>=136&&sx<186&&sy>=132&&sy<380)||(sx>=186&&sx<376&&((sy>=132&&sy<182)||(sy>=330&&sy<380)))||(sx>=186&&sx<351&&sy>=233&&sy<280);
  if(e)rgb=[237,240,237];
  if((sx-390)**2+(sy-120)**2<25**2)rgb=[119,187,255];
  const alpha=insideRounded(x+.5,y+.5,size)?255:0;
  rows[offset]=rgb[0];rows[offset+1]=rgb[1];rows[offset+2]=rgb[2];rows[offset+3]=alpha;
 }
 const header=Buffer.alloc(13);header.writeUInt32BE(size,0);header.writeUInt32BE(size,4);header[8]=8;header[9]=6;
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(rows,{level:9})),chunk('IEND',Buffer.alloc(0))]);
}
for(const [size,name] of [[180,'apple-touch-icon.png'],[192,'icon-192.png'],[512,'icon-512.png']])writeFileSync(new URL(`../public/${name}`,import.meta.url),image(size));
