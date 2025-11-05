const http = require('http');
const server = http.createServer((req, res)=>{
	res.setHeader('Strict-Transport-Security', 'max-age=63072000;includeSubDomains;preload');
	res.setHeader('X-Frame-Options','DENY');
	res.setHeader('X-Content-Type-Options','nosniff');
	res.writeHead(200, {'Content-Type':'text/html;charset=utf-8'});
	res.end(`<!DOCTYPE html><html><head><title>tor</title><meta charset="utf-8"></head><body>hello tor</body></html>`);
})
const port=4000;
server.listen(port,'127.0.0.1',()=>{
	console.log('server listening on http://127.0.0.1:' + port);
})
