/**
 * UPLOADS — the file surface.
 *
 * Storage that accepts anonymous writes fills a disk; storage that accepts
 * anonymous deletes loses every image on the platform. These cases check the
 * door is shut, that content is validated rather than trusted from a filename,
 * and that a folder name cannot walk out of the storage root.
 */
import zlib from 'node:zlib';
import { get, del, request } from '../lib/http.js';
import { check, blocked, module_, SEVERITY } from '../lib/runner.js';

/** A real 1×1 PNG, so the image pipeline has something valid to work on. */
const tinyPng = () => {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf) => {
    let c = 0xffffffff;
    for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const sum = Buffer.alloc(4); sum.writeUInt32BE(crc(body));
    return Buffer.concat([len, body, sum]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(1, 0); ihdr.writeUInt32BE(1, 4);
  ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(Buffer.from([0, 0, 0, 0]))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
};

/** A multipart body built by hand, so the suite controls every byte. */
const multipart = (fields, file) => {
  const boundary = '----QAsuite' + Date.now();
  const parts = [];
  for (const [name, value] of Object.entries(fields)) {
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`));
  }
  if (file) {
    parts.push(Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${file.name}"\r\n` +
      `Content-Type: ${file.type}\r\n\r\n`));
    parts.push(file.buffer);
    parts.push(Buffer.from('\r\n'));
  }
  parts.push(Buffer.from(`--${boundary}--\r\n`));
  return { body: Buffer.concat(parts), contentType: `multipart/form-data; boundary=${boundary}` };
};

const upload = (token, fields, file) => {
  const { body, contentType } = multipart(fields, file);
  return request('POST', '/uploads/image', {
    token, raw: body, headers: { 'Content-Type': contentType, 'Content-Length': body.length },
  });
};

export const run = async ({ primary, admin }) => {
  module_('uploads');

  const png = tinyPng();

  /* ---------- anonymous access ---------- */
  const anon = await upload(undefined, { folder: 'qa' }, { name: 'tiny.png', type: 'image/png', buffer: png });
  check('UPL-100', 'upload refuses an anonymous caller', [401, 403].includes(anon.status), {
    expected: '401/403', actual: anon.status, severity: SEVERITY.HIGH,
  });

  const anonDelete = await del('/uploads', { body: { url: 'http://localhost:5000/uploads/anything.webp' } });
  check('UPL-101', 'delete refuses an anonymous caller', [401, 403].includes(anonDelete.status), {
    expected: '401/403', actual: anonDelete.status, severity: SEVERITY.CRITICAL,
  });

  if (!primary?.token) { blocked('UPL-110', 'authenticated upload cases', 'no consumer session'); return; }

  /* ---------- a signed-in caller can upload ---------- */
  const ok = await upload(primary.token, { folder: 'qa' }, { name: 'tiny.png', type: 'image/png', buffer: png });
  const storedUrl = ok.body?.data?.url;
  check('UPL-110', 'a signed-in caller can upload an image', ok.status === 200 && Boolean(storedUrl), {
    expected: '200 with a url', actual: `${ok.status} ${storedUrl || ''}`, severity: SEVERITY.HIGH,
  });

  if (storedUrl) {
    const fetched = await get(storedUrl);
    check('UPL-111', 'the stored file is served', fetched.status === 200, {
      expected: '200', actual: fetched.status, severity: SEVERITY.MEDIUM,
    });
    check('UPL-112', 'the image was converted to WebP', storedUrl.endsWith('.webp'), {
      expected: '.webp', actual: storedUrl.split('.').pop(), severity: SEVERITY.LOW,
    });
  }

  /* ---------- content is validated, not the filename ---------- */
  const script = Buffer.from('#!/bin/sh\necho pwned\n');
  const disguised = await upload(primary.token, { folder: 'qa' },
    { name: 'payload.png', type: 'image/png', buffer: script });
  check('UPL-120', 'a script renamed .png is refused', disguised.status >= 400, {
    expected: '4xx', actual: disguised.status, severity: SEVERITY.CRITICAL,
  });

  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
  const svgRes = await upload(primary.token, { folder: 'qa' },
    { name: 'x.svg', type: 'image/svg+xml', buffer: svg });
  const svgUrl = svgRes.body?.data?.url || '';
  check('UPL-121', 'an SVG does not survive as SVG', svgRes.status >= 400 || svgUrl.endsWith('.webp'), {
    expected: 'refused or rasterised to webp', actual: `${svgRes.status} ${svgUrl}`, severity: SEVERITY.HIGH,
  });

  const empty = await upload(primary.token, { folder: 'qa' },
    { name: 'empty.png', type: 'image/png', buffer: Buffer.alloc(0) });
  check('UPL-122', 'an empty file is refused', empty.status >= 400, {
    expected: '4xx', actual: empty.status, severity: SEVERITY.MEDIUM,
  });

  const noFile = await upload(primary.token, { folder: 'qa' }, null);
  check('UPL-123', 'a request with no file is refused', noFile.status >= 400, {
    expected: '4xx', actual: noFile.status, severity: SEVERITY.LOW,
  });

  /* ---------- the folder name cannot leave the storage root ---------- */
  const escape = await upload(primary.token, { folder: '../../../../tmp/qa-escape' },
    { name: 'tiny.png', type: 'image/png', buffer: png });
  const escapedUrl = escape.body?.data?.url || '';
  check('UPL-130', 'a traversing folder name cannot escape the storage root',
    escape.status >= 400 || (!escapedUrl.includes('..') && !escapedUrl.includes('/tmp/')), {
      expected: 'refused or flattened', actual: escapedUrl || escape.status, severity: SEVERITY.CRITICAL,
    });

  /* ---------- size limit ---------- */
  const oversized = Buffer.concat([png, Buffer.alloc(12 * 1024 * 1024, 0x50)]);
  const big = await upload(primary.token, { folder: 'qa' },
    { name: 'huge.png', type: 'image/png', buffer: oversized });
  check('UPL-140', 'an oversized upload is refused as 413', big.status === 413, {
    expected: '413', actual: big.status, severity: SEVERITY.HIGH,
  });

  const alive = await get('/health');
  check('UPL-141', 'server still alive after the oversized upload', alive.status === 200, {
    expected: '200', actual: alive.status, severity: SEVERITY.CRITICAL,
  });

  /* ---------- clean up what this suite wrote ---------- */
  for (const url of [storedUrl, svgUrl, escapedUrl].filter(Boolean)) {
    await del('/uploads', { token: primary.token, body: { url } });
  }
};
