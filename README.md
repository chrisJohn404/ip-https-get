A simple & very limited promise based (via q) http-get request module that queries data from a website allowing for its IP address to be defined as well as explicit definitions of a server's tls certificates. Uses node's internal http parser and over-rides the "createConnection" function with a TLS socket.  It's only useful for making queries for endpoints that supply a 'content-length' http header.

No tests are currently implemented.  Probably not a module people ever need to use but who knows, someone might find it interesting.

Installation:
`npm install --save ip-https-get`

Example:
```
const get = require('ip-https-get').get;


const options = {
	port: 443,
	ip: '::ffff:104.26.0.235',
	hostname: 'labjack.com',
	path: '/sites/default/files/styles/products_homepage/public/U3HV_white_shadow.JPG',
	reqContentType: 'image/jpeg',
	pubkey256: 'aTtriJnaZ8G2PTSu6uPx1drsS975UnP88Sos4mNSVWw=',
	cert256: '39:24:D6:18:3C:41:38:F9:4D:D0:4E:4D:8A:BF:D7:39:9C:73:F6:A1:A7:53:7E:C5:FF:5F:52:22:A8:3D:CD:B7',
	maxHdrSize: 800,
};

get(options, function(err, res) {
	if(err) {
		console.error('Received Error:',err);
	} else {
		console.log('Received result', res.length);
	}
})
```

