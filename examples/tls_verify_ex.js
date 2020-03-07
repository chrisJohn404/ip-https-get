const tls = require('tls');
const https = require('https');
const http = require('http');
const crypto = require('crypto');

function sha256(s) {
  return crypto.createHash('sha256').update(s).digest('base64');
}

const tlsOpts = {
  port: 443,
  servername: 'labjack.com',
  host: '104.26.1.235',
  checkServerIdentity: function(host, cert) {
    // Make sure the certificate is issued to the host we are connected to
    const err = tls.checkServerIdentity(host, cert);
    if (err) {
      return err;
    }

    // Pin the public key, similar to HPKP pin-sha25 pinning
    const pubkey256 = 'aTtriJnaZ8G2PTSu6uPx1drsS975UnP88Sos4mNSVWw=';
    if (sha256(cert.pubkey) !== pubkey256) {
      const msg = 'Certificate verification error: ' +
        `The public key of '${cert.subject.CN}' ` +
        `does not match our pinned fingerprint. it is: ${sha256(cert.pubkey)}`;
      return new Error(msg);
    }

    // Pin the exact certificate, rather than the pub key
    const cert256 = '39:24:D6:18:3C:41:38:F9:4D:D0:4E:4D:8A:BF:D7:39:9C:73:F6:A1:A7:53:7E:C5:FF:5F:52:22:A8:3D:CD:B7';
    if (cert.fingerprint256 !== cert256) {
      const msg = 'Certificate verification error: ' +
        `The certificate of '${cert.subject.CN}' ` +
        `does not match our pinned fingerprint. It is: ${cert.fingerprint256}`;
      return new Error(msg);
    }

    // This loop is informational only.
    // Print the certificate and public key fingerprints of all certs in the
    // chain. Its common to pin the public key of the issuer on the public
    // internet, while pinning the public key of the service in sensitive
    // environments.
    do {
      console.log('Subject Common Name:', cert.subject.CN);
      console.log('  Certificate SHA256 fingerprint:', cert.fingerprint256);

      hash = crypto.createHash('sha256');
      console.log('  Public key ping-sha256:', sha256(cert.pubkey));

      lastprint256 = cert.fingerprint256;
      cert = cert.issuerCertificate;
    } while (cert.fingerprint256 !== lastprint256);

  },
};
const options = {
  hostname: tlsOpts.host,
  port: tlsOpts.port,
  path: '/',
  method: 'GET',
  createConnection: function() {
    return tls.connect(tlsOpts);
  },
  
};


// options.agent = new https.Agent(options);
// const req = https.request(options, (res) => {
const req = http.get(options, (res) => {
  console.log('All OK. Server matched our pinned cert or public key');
  console.log('statusCode:', res.statusCode);
  // Print the HPKP values
  console.log('headers:', res.headers['public-key-pins']);

  res.on('data', (d) => {});
});

req.on('error', (e) => {
  console.error(e.message);
});
req.end();
