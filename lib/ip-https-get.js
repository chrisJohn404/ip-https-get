

const tls = require('tls');
const http = require('http');
const crypto = require('crypto');
const semver = require('semver');
const allocBuffer = require('allocate_buffer').allocBuffer;

const DEBUG_OUT = false;

function getDebugger(enabled) {
	return function() {
		if(enabled) {
			console.log.apply(null, arguments);
		}
	}
}
const debug = getDebugger(DEBUG_OUT);


function sha256(s) {
  return crypto.createHash('sha256').update(s).digest('base64');
}



function get(options, cb) {
	if (typeof options.port !== 'number') { throw new Error('Missing Arg: options.port'); }
	if (typeof options.ip !== 'string') { throw new Error('Missing Arg: options.ip'); }
	if (typeof options.hostname !== 'string') { throw new Error('Missing Arg: options.hostname'); }
	if (typeof options.path !== 'string') { throw new Error('Missing Arg: options.path'); }
	if (typeof options.pubkey256 !== 'string') { throw new Error('Missing Arg: options.pubkey256'); }
	if (typeof options.cert256 !== 'string') { throw new Error('Missing Arg: options.cert256'); }
	
	let tlsOpts = {
		port: options.port,
		host: options.ip,
		servername: options.hostname,
		checkServerIdentity: function(host, cert) {
			// Make sure the certificate is issued to the host we are connected to
			const err = tls.checkServerIdentity(host, cert);
			if (err) {
				return err;
			}

			// Pin the public key, similar to HPKP pin-sha25 pinning
			const pubkey256 = options.pubkey256;
			if (sha256(cert.pubkey) !== pubkey256) {
				const msg = 'Certificate verification error: ' +
				`The public key of '${cert.subject.CN}' ` +
				`does not match our pinned fingerprint.}`;
				
				cb(msg, null);
				return;
				// return new Error(msg);
			}

			// Pin the exact certificate, rather than the pub key
			const cert256 = '39:24:D6:18:3C:41:38:F9:4D:D0:4E:4D:8A:BF:D7:39:9C:73:F6:A1:A7:53:7E:C5:FF:5F:52:22:A8:3D:CD:B7';
			if (cert.fingerprint256 !== cert256) {
				const msg = 'Certificate verification error: ' +
				`The certificate of '${cert.subject.CN}' ` +
				`does not match our pinned fingerprint. It is: ${cert.fingerprint256}`;
				cb(msg, null);
				return;
				// return new Error(msg);
			}
		},
	};
	let httpOpts = {
		port: options.port,
		host: options.hostname,
		path: options.path,
		createConnection: function() {
			return tls.connect(tlsOpts);

			// TLS socket with debugging functions attached
			// debug('Creating connection', tlsOpts);
			// let sock = tls.connect(tlsOpts, function() {
			// 	debug('Connected');
			// });
			// sock.on('session', () => {
			// 	debug('Session started');
			// });
			// sock.on('secureConnect', function() {
			// 	debug('Securely connected');
			// });
			// return sock;
		}
	};
	if(options.headers) {
		httpOpts.headers = options.headers;
	}

	debug('querying', httpOpts)
	http.get(httpOpts, function(res) {
		// res.on('data', function(d) {
		// 	cb(null, d);
		// });
		if(res.statusCode == 200) {
			var len = parseInt(res.headers['content-length']);
			var bodyBuff = allocBuffer(len);
			var curOffset = 0;

			res.on('data', function (d) {
				if (curOffset + d.length <= len) {
					bodyBuff.fill(d,curOffset);
					curOffset += d.length;
					if(curOffset == len) {
						cb(null, bodyBuff);
					}
				} else {
					let msg = `More data received than allocated buffer: ${len}, allocated: ${curOffset + d.length}`
					console.log(msg);
					cb(msg, null);
				}
			});
		} else {
			cb(res.statusCode, null);
		}
	}).on('error', (e) => {
	  cb(e, null);
	});
}

module.exports = {
	get
};