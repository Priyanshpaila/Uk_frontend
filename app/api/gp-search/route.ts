// app/api/gp-search/route.ts
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type GpItem = { id: string; name: string; address: string };

// --- tiny CSV parser (handles quotes/commas) ---
function parseCSV(data: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  const pushCell = () => { row.push(cell); cell = ""; };
  const pushRow  = () => { rows.push(row); row = []; };

  for (let i = 0; i < data.length; i++) {
    const c = data[i];
    if (inQuotes) {
      if (c === '"') {
        if (data[i + 1] === '"') { cell += '"'; i++; }
        else { inQuotes = false; }
      } else { cell += c; }
      continue;
    }
    if (c === '"') { inQuotes = true; continue; }
    if (c === ",") { pushCell(); continue; }
    if (c === "\r") continue;
    if (c === "\n") { pushCell(); pushRow(); continue; }
    cell += c;
  }
  if (cell.length > 0 || row.length > 0) { pushCell(); pushRow(); }
  return rows;
}

// normalise header keys: upper + remove spaces, punctuation
const norm = (s: string) => (s || "").toUpperCase().replace(/[^A-Z0-9]+/g, "");

// utility: find first matching header index from a list of candidates
function findIdx(header: string[], candidates: string[]): number {
  for (const c of candidates) {
    const i = header.indexOf(c);
    if (i >= 0) return i;
  }
  return -1;
}

// join address parts into one line
function joinAddress(parts: Array<string | undefined>) {
  return parts.map(p => (p || "").trim()).filter(Boolean).join(", ").replace(/\s+/g, " ").trim();
}

// -------- load CSV once --------
let GP_ROWS: GpItem[] | null = null;
let GP_DEBUG: any = null;

function loadGPs(): GpItem[] {
  if (GP_ROWS) return GP_ROWS;

  const filePathCandidates = [
    path.join(process.cwd(), "data/epraccur.csv"),
    path.join(process.cwd(), "epraccur.csv"),
  ];

  let csvRaw: string | null = null;
  for (const p of filePathCandidates) {
    if (fs.existsSync(p)) { csvRaw = fs.readFileSync(p, "utf8"); break; }
  }
  if (!csvRaw) throw new Error("epraccur.csv not found. Put it in ./data/epraccur.csv");

  const rows = parseCSV(csvRaw);
  if (rows.length < 2) throw new Error("epraccur.csv appears empty");

  const headerRaw = rows[0];
  const header = headerRaw.map(norm);

  // Determine if the first row is a real header or actually data (headerless file)
  const expectedTokens = new Set([
    "ORGCODE","ORG_CODE","CODE","ODS_CODE","ODSCODE","ORGANISATIONCODE","ORGANISATIONODS",
    "NAME","ORGNAME","ORGANISATIONNAME","ORGANISATION",
    "ADDRESS1","ADDR1","ADDRESSLINE1","ADDRLINE1","ADDRESS_1",
    "POSTCODE","POST_CODE","PCODE","TOWN","POSTTOWN","CITY","COUNTY","DISTRICT"
  ]);
  const hasHeaderWords = header.some(h => expectedTokens.has(h));

  // In EPRACCUR rows, col0 often looks like an ODS code (e.g. A81001)
  const looksLikeOdsCode = /^[A-Z]\d{5}$/i.test((headerRaw[0] || "").trim());
  const headerIsActuallyData = !hasHeaderWords && looksLikeOdsCode;

  // Build the index map. If headerless, fall back to fixed column positions (based on your sample).
  let IDX: { [k: string]: number } = {};
  let startRow = 1;
  let mappingSource = "header";

  if (!headerIsActuallyData) {
    IDX = {
      ORG_CODE: findIdx(header, ["ORGCODE","ORG_CODE","CODE","ODS_CODE","ODSCODE","ORGANISATIONCODE","ORGANISATIONODS"]),
      NAME:     findIdx(header, ["NAME","ORGNAME","ORGANISATIONNAME","ORGANISATION"]),
      ADDR1:    findIdx(header, ["ADDRESS1","ADDR1","ADDRESSLINE1","ADDRLINE1","ADDRESS_1"]),
      ADDR2:    findIdx(header, ["ADDRESS2","ADDR2","ADDRESSLINE2","ADDRLINE2","ADDRESS_2"]),
      ADDR3:    findIdx(header, ["ADDRESS3","ADDR3","ADDRESSLINE3","ADDRLINE3","ADDRESS_3"]),
      ADDR4:    findIdx(header, ["ADDRESS4","ADDR4","ADDRESSLINE4","ADDRLINE4","ADDRESS_4"]),
      TOWN:     findIdx(header, ["TOWN","POSTTOWN","CITY"]),
      COUNTY:   findIdx(header, ["COUNTY","DISTRICT"]),
      POSTCODE: findIdx(header, ["POSTCODE","POST_CODE","PCODE"]),
      STATUS:   findIdx(header, ["STATUS","STATUSCODE","RECSTATUS"]),
      SECTOR:   findIdx(header, ["SECTOR","ORGTYPEDESC","TYPE","ORGTYPE"]),
    };
  } else {
    // Headerless fallback based on the official 27-column epraccur schema:
    //  1=ODS code, 2=name, 5..9=address lines 1..5, 10=postcode,
    //  13=status code (A/C/D/P), 26=prescribing setting (4 = GP Practice)
    IDX = {
      ORG_CODE: 0,   // col 1
      NAME: 1,       // col 2
      ADDR1: 4,      // col 5
      ADDR2: 5,      // col 6
      ADDR3: 6,      // col 7
      ADDR4: 7,      // col 8
      ADDR5: 8,      // col 9
      POSTCODE: 9,   // col 10
      STATUS: 12,    // col 13
      PRESC: 25,     // col 26
    };
    startRow = 0;          // first row is data, not header
    mappingSource = "fixed-index";
  }

  const items: GpItem[] = [];
  let sampledRows: any[] = [];

  for (let i = startRow; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length === 0) continue;

    const name = IDX.NAME >= 0 ? r[IDX.NAME] : "";
    if (!name || !name.trim()) continue;

    const status  = IDX.STATUS   >= 0 ? (r[IDX.STATUS] || "").toUpperCase() : "";
    const presc   = (IDX as any).PRESC !== undefined && (IDX as any).PRESC >= 0 ? (r[(IDX as any).PRESC] || "").trim() : "";

    // Keep only active GP practices where prescribing setting is '4'
    if (status && status !== "A") continue;         // drop Closed/Dormant/Proposed
    if (presc && presc !== "4") continue;           // only GP Practice

    const line1 = IDX.ADDR1    >= 0 ? r[IDX.ADDR1]    : "";
    const line2 = IDX.ADDR2    >= 0 ? r[IDX.ADDR2]    : "";
    const line3 = IDX.ADDR3    >= 0 ? r[IDX.ADDR3]    : "";
    const line4 = IDX.ADDR4    >= 0 ? r[IDX.ADDR4]    : "";
    const line5 = (IDX as any).ADDR5 !== undefined && (IDX as any).ADDR5 >= 0 ? r[(IDX as any).ADDR5] : "";
    const pc    = IDX.POSTCODE >= 0 ? r[IDX.POSTCODE] : "";

    // EPRACCUR puts locality/town/county in Address lines 1..5; join them + postcode
    const address = joinAddress([line1, line2, line3, line4, line5, pc]);

    if (sampledRows.length < 3) {
      sampledRows.push({
        orgCode: IDX.ORG_CODE >= 0 ? r[IDX.ORG_CODE] : "",
        name,
        status,
        presc,
        addressPreview: address,
        raw: { line1, line2, line3, line4, line5, pc }
      });
    }

    items.push({
      id: ((IDX.ORG_CODE >= 0 ? r[IDX.ORG_CODE] : "") || name).trim(),
      name: name.trim(),
      address,
    });
  }

  GP_ROWS = items;
  GP_DEBUG = {
    headerRaw,
    headerNorm: header,
    idx: IDX,
    sample: sampledRows,
    totalItems: items.length,
    headerIsActuallyData,
    mappingSource
  };
  return GP_ROWS;
}

function searchGPs(all: GpItem[], q: string): GpItem[] {
  const needle = q.trim().toLowerCase();
  if (needle.length < 2) return [];
  const looksLikePC = /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i.test(needle);

  const scored: Array<{ item: GpItem; score: number }> = [];
  for (const it of all) {
    const nameL = it.name.toLowerCase();
    const addrL = it.address.toLowerCase();

    let score = 0;
    if (nameL.includes(needle)) score += 5;
    if (addrL.includes(needle)) score += 3;
    if (looksLikePC && addrL.replace(/\s+/g,"").includes(needle.replace(/\s+/g,""))) score += 6;

    if (score > 0) scored.push({ item: it, score });
  }
  scored.sort((a,b) => b.score - a.score);
  return scored.slice(0, 25).map(s => s.item);
}

// ------------- handler -------------
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim();
    const wantDebug = searchParams.get("debug") === "1";

    const all = loadGPs();

    if (q.length < 2) {
      return NextResponse.json(wantDebug ? { ok: true, items: [], debug: GP_DEBUG } : { ok: true, items: [] });
    }

    const items = searchGPs(all, q);
    return NextResponse.json(wantDebug ? { ok: true, items, debug: GP_DEBUG } : { ok: true, items });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err?.message || "Unhandled error", items: [] },
      { status: 200 }
    );
  }
}