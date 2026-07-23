// Ingest congressional Periodic Transaction Reports (PTRs) from the OFFICIAL,
// free, no-key primary source: the U.S. House Clerk financial-disclosure feed.
//
// This is the authoritative upstream that every third-party tracker derives
// from. It publishes one ZIP per year containing an XML index of every filing:
//
//   ZIP index : https://disclosures-clerk.house.gov/public_disc/financial-pdfs/<YEAR>FD.zip
//   PTR PDF   : https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/<YEAR>/<DocID>.pdf
//
// The XML index gives you filer, state/district, filing type and DocID. Filings
// with <FilingType>P</FilingType> are Periodic Transaction Reports — the stock
// trades. The line-item transactions themselves live in the per-filing PDF
// (electronic filings are text; older paper filings are scanned images that
// need OCR), so this script emits the PTR *index*; wire a PDF/OCR step after it
// to extract ticker/type/amount rows.
//
// NOTE: This must run in an environment with outbound network access to
// disclosures-clerk.house.gov (and requires the `unzip` CLI). It will NOT run
// inside a restricted build sandbox whose egress policy blocks that host.
//
//   Usage:  node src/congress/data/ingest-house-clerk.mjs 2026 > house-ptrs-2026.json

import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const YEAR = process.argv[2] || String(new Date().getUTCFullYear());
const ZIP_URL = `https://disclosures-clerk.house.gov/public_disc/financial-pdfs/${YEAR}FD.zip`;
const ptrPdfUrl = (docId) =>
  `https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/${YEAR}/${docId}.pdf`;

// Minimal, dependency-free XML-record extractor. The index is a flat list of
// <Member>…</Member> records, so a tag scan is sufficient and robust.
function extractTag(block, tag) {
  const m = block.match(new RegExp(`<${tag}>([^<]*)</${tag}>`));
  return m ? m[1].trim() : '';
}

async function main() {
  const dir = mkdtempSync(join(tmpdir(), 'house-fd-'));
  const zipPath = join(dir, `${YEAR}FD.zip`);
  try {
    process.stderr.write(`Downloading ${ZIP_URL}\n`);
    const res = await fetch(ZIP_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${ZIP_URL}`);
    writeFileSync(zipPath, Buffer.from(await res.arrayBuffer()));

    // Extract the XML index (named <YEAR>FD.xml) straight to stdout.
    const xml = execFileSync('unzip', ['-p', zipPath, `${YEAR}FD.xml`], {
      maxBuffer: 256 * 1024 * 1024,
    }).toString('utf8');

    const blocks = xml.match(/<Member>[\s\S]*?<\/Member>/g) || [];
    const ptrs = blocks
      .map((b) => ({
        docId: extractTag(b, 'DocID'),
        filingType: extractTag(b, 'FilingType'),
        prefix: extractTag(b, 'Prefix'),
        first: extractTag(b, 'First'),
        last: extractTag(b, 'Last'),
        suffix: extractTag(b, 'Suffix'),
        state: extractTag(b, 'StateDst'),
        year: extractTag(b, 'Year'),
        filingDate: extractTag(b, 'FilingDate'),
      }))
      // FilingType "P" == Periodic Transaction Report (the stock trades).
      .filter((r) => r.filingType === 'P' && r.docId)
      .map((r) => ({
        chamber: 'House',
        member: [r.first, r.last, r.suffix].filter(Boolean).join(' '),
        stateDistrict: r.state,
        disclosureDate: r.filingDate,
        docId: r.docId,
        pdfUrl: ptrPdfUrl(r.docId),
        // Line-item transactions come from parsing pdfUrl (text or OCR).
      }));

    process.stderr.write(`Found ${ptrs.length} PTRs for ${YEAR}.\n`);
    process.stdout.write(JSON.stringify({ year: YEAR, source: ZIP_URL, ptrs }, null, 2) + '\n');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

main().catch((e) => {
  process.stderr.write(`ingest-house-clerk failed: ${e.message}\n`);
  process.exit(1);
});
