#!/usr/bin/env node
/**
 * Minimal HTTP print server. Binds 127.0.0.1:47002, receives multipart
 * POSTs from snap-printing-selphy.js, writes the image to a temp file,
 * and shells out to `lp`. Loopback only; the browser kiosk is the only
 * expected client.
 *
 * Zero external deps: uses Node's built-in http + fs + child_process.
 */
'use strict';

const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');

const PORT = parseInt(process.env.SNAP_PRINT_PORT || '47002', 10);
const HOST = '127.0.0.1';

function parseMultipart(buf, boundary) {
    const fields = {};
    const parts = buf.toString('binary').split('--' + boundary);
    for (const p of parts) {
        const sep = p.indexOf('\r\n\r\n');
        if (sep < 0) continue;
        const header = p.slice(0, sep);
        const body = p.slice(sep + 4, p.length - 2);
        const nameMatch = /name="([^"]+)"/.exec(header);
        if (!nameMatch) continue;
        const name = nameMatch[1];
        const filenameMatch = /filename="([^"]+)"/.exec(header);
        fields[name] = {
            value: body,
            filename: filenameMatch ? filenameMatch[1] : null
        };
    }
    return fields;
}

function handlePrint(req, res) {
    const ct = req.headers['content-type'] || '';
    const m = /boundary=([^;]+)/.exec(ct);
    if (!m) {
        res.writeHead(400).end(JSON.stringify({ error: 'no boundary' }));
        return;
    }
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
        const fields = parseMultipart(Buffer.concat(chunks), m[1]);
        const image = fields.image;
        if (!image) {
            res.writeHead(400).end(JSON.stringify({ error: 'no image' }));
            return;
        }
        const tmp = path.join(os.tmpdir(),
            'snapstation_' + Date.now() + path.extname(image.filename || '.bmp'));
        fs.writeFileSync(tmp, Buffer.from(image.value, 'binary'));

        const printer = fields.printer ? fields.printer.value : null;
        const media = fields.media ? fields.media.value : null;
        const args = [];
        if (printer) args.push('-d', printer);
        if (media)   args.push('-o', 'media=' + media);
        args.push(tmp);

        execFile('lp', args, (err, stdout, stderr) => {
            try { fs.unlinkSync(tmp); } catch (_) { /* ignore */ }
            if (err) {
                res.writeHead(500).end(JSON.stringify({
                    error: 'lp failed', detail: stderr.toString()
                }));
                return;
            }
            res.writeHead(200, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ ok: true, job: stdout.toString().trim() }));
        });
    });
}

const server = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/print') return handlePrint(req, res);
    if (req.method === 'GET' && req.url === '/health') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ ok: true, version: 1 }));
        return;
    }
    res.writeHead(404).end();
});

server.listen(PORT, HOST, () => {
    console.log(`snap print-server listening on ${HOST}:${PORT}`);
});
