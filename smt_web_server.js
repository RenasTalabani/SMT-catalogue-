const http=require('http'),fs=require('fs'),path=require('path');
const root='c:/Users/Karwan Store/Documents/SMT cataloge/smt-pro-catalog/flutter_app/build/web';
const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css',
'.png':'image/png','.jpg':'image/jpeg','.ico':'image/x-icon',
'.wasm':'application/wasm','.json':'application/json','.ttf':'font/ttf'};
http.createServer((req,res)=>{
let p=root+req.url.split('?')[0];
if(!fs.existsSync(p)||fs.statSync(p).isDirectory())p=root+'/index.html';
res.setHeader('Content-Type',mime[path.extname(p)]||'application/octet-stream');
fs.createReadStream(p).pipe(res);
}).listen(4040,'0.0.0.0',()=>console.log('Web ready on :4040'));
