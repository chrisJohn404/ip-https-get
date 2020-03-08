

const tls = require('tls');
const http = require('http');
const crypto = require('crypto');
const allocBuffer = require('allocate_buffer').allocBuffer;

const DEBUG_OUT = true;

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
	if (typeof options.reqContentType !== 'string') { throw new Error('Missing Arg: options.reqContentType'); }

	let maxHdrSize = 8192;
	if (typeof options.maxHdrSize == 'number') { maxHdrSize = options.maxHdrSize }
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
			if (sha256(cert.pubkey) !== options.pubkey256) {
				const msg = 'Certificate verification error: ' +
				`The public key of '${cert.subject.CN}' ` +
				`does not match our pinned fingerprint.}`;
				
				cb(msg, null);
				return;
				// return new Error(msg);
			}

			// Pin the exact certificate, rather than the pub key
			if (cert.fingerprint256 !== options.cert256) {
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
		headers: {
			'user-agent': 'nodejs-app',
		},
		maxHdrSize: maxHdrSize,
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
	let endReceived = false;
	let req = http.get(httpOpts, function(res) {

		function innerCB(err, data) {
			res.destroy();
			req.end();
			cb(err, data);
		}
		// res.on('data', function(d) {
		// 	cb(null, d);
		// });
		// debug('packet-keys', Object.keys(res.headers));
		debug('Header:', res.headers);
		let keys = Object.keys(res);
		keys.forEach(function(key) {
			console.log('----*************____')
			console.log(key,res[key]);
		})
		debug(Object.keys(res));
		let hdrSize = 0;
		res.rawHeaders.forEach(function(hdr) {
			hdrSize += hdr.length;
		})
		console.log('headers len:', hdrSize)

		if(res.statusCode == 200) {
			if(	typeof(res.headers['content-length']) == 'string') {
				if(res.headers['content-type'] == options.reqContentType) {
					let len = 0;
					try {
						len = parseInt(res.headers['content-length']);
					} catch(err) {
						innerCB('Content Length is not parsable as an integer.', null);
					}
					if(len > 0) {
						let len = parseInt(res.headers['content-length']);
						let bodyBuff = allocBuffer(len);
						let curOffset = 0;

						res.on('data', function (d) {
							// debug('Received Data', d.length);
							if (curOffset + d.length <= len) {
								bodyBuff.fill(d,curOffset);
								curOffset += d.length;
								if(curOffset == len) {
									innerCB(null, bodyBuff);
								}
							} else {
								let msg = `More data received than allocated buffer: ${len}, allocated: ${curOffset + d.length}`
								debug(msg);
								innerCB(msg, null);
							}
						});
					}
				} else {
					innerCB(`Expected content-type: ${options.reqContentType} got: ${res.headers['content-type']}`, null);
				}
			} else {
				innerCB('Expected a content-length http header', null);
			}
		} else {
			innerCB(res.statusCode, null);
		}
	}).on('error', (e) => {
	  req.end();
	  cb(e, null);
	});
}

module.exports = {
	get
};