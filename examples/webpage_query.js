
/*
 * Note: This library doesn't support standard web-page queries at this time as the 
 * content-length header is not supplied in the http header.
 */
const get = require('../lib/ip-https-get.js').get;


const options = {
	port: 443,
	// ip: '104.26.1.235',
	ip: '::ffff:104.26.0.235',
	hostname: 'labjack.com',
	path: '/support/firmware/t7',
	pubkey256: 'aTtriJnaZ8G2PTSu6uPx1drsS975UnP88Sos4mNSVWw=',
	cert256: '39:24:D6:18:3C:41:38:F9:4D:D0:4E:4D:8A:BF:D7:39:9C:73:F6:A1:A7:53:7E:C5:FF:5F:52:22:A8:3D:CD:B7',
};

get(options, function(err, res) {
	if(err) {
		console.error('Received Error:',err);
	} else {
		console.log('Received result', res.length);
	}
});

