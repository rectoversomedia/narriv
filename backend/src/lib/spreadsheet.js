/**
 * Spreadsheet output for exports: XLSX and CSV. Write-only — nothing here parses a file a user sent.
 * Rows are arrays of cells; the first row is the header (bold, and filterable when `filter` is on).
 *
 * The XLSX is the minimal Office Open XML package that Excel, Numbers, LibreOffice and Google Sheets open:
 * a workbook, one worksheet per sheet with inline strings, column widths, an auto-filter and one bold style,
 * zipped with fflate (which has no dependencies of its own).
 */

import { strToU8, zipSync } from "fflate";

const HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const NS_MAIN = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const NS_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const NS_PKG_REL = "http://schemas.openxmlformats.org/package/2006/relationships";

const xml = (s) => String(s)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Column number (1-based) to its letters: 1 → A, 27 → AA. */
function colName(n) {
    let s = "";
    for (; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
    return s;
}

function cellXml(value, ref, bold) {
    const style = bold ? ' s="1"' : "";
    if (value === null || value === undefined || value === "") return "";
    if (typeof value === "number" && Number.isFinite(value)) return `<c r="${ref}"${style}><v>${value}</v></c>`;
    if (typeof value === "boolean") return `<c r="${ref}" t="b"${style}><v>${value ? 1 : 0}</v></c>`;
    const text = value instanceof Date ? value.toISOString() : String(value);
    return `<c r="${ref}" t="inlineStr"${style}><is><t xml:space="preserve">${xml(text.slice(0, 32767))}</t></is></c>`;
}

/** The used range, e.g. "A1:F12", or null when the sheet should not get a filter. */
function filterRange({ rows, filter = true }) {
    if (!filter || rows.length < 2) return null;
    return `A1:${colName(Math.max(1, ...rows.map((row) => row.length)))}${rows.length}`;
}

function sheetXml(sheet) {
    const { rows, widths = [] } = sheet;
    const cols = widths.length ? `<cols>${widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("")}</cols>` : "";
    const data = rows.map((row, r) => `<row r="${r + 1}">${row.map((v, c) => cellXml(v, `${colName(c + 1)}${r + 1}`, r === 0)).join("")}</row>`).join("");
    const range = filterRange(sheet);
    return `${HEAD}<worksheet xmlns="${NS_MAIN}">${cols}<sheetData>${data}</sheetData>${range ? `<autoFilter ref="${range}"/>` : ""}</worksheet>`;
}

/** Excel refuses sheet names over 31 characters, containing \ / ? * [ ] :, or used twice. */
function sheetNames(sheets) {
    const used = new Set();
    return sheets.map(({ name }, i) => {
        const base = (String(name || "").replace(/[\\/?*[\]:]/g, " ").trim() || `Sheet${i + 1}`).slice(0, 31);
        let candidate = base;
        for (let n = 2; used.has(candidate.toLowerCase()); n++) candidate = `${base.slice(0, 30 - String(n).length)} ${n}`;
        used.add(candidate.toLowerCase());
        return candidate;
    });
}

function workbookXml(sheets, names) {
    const list = names.map((n, i) => `<sheet name="${xml(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("");
    // Excel expects a hidden _FilterDatabase name next to each auto-filter.
    const filters = sheets.map((sheet, i) => {
        const range = filterRange(sheet);
        if (!range) return "";
        const [from, to] = range.split(":").map((ref) => ref.replace(/^([A-Z]+)(\d+)$/, "$$$1$$$2"));
        return `<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">'${xml(names[i].replace(/'/g, "''"))}'!${from}:${to}</definedName>`;
    }).join("");
    return `${HEAD}<workbook xmlns="${NS_MAIN}" xmlns:r="${NS_REL}"><sheets>${list}</sheets>${filters ? `<definedNames>${filters}</definedNames>` : ""}</workbook>`;
}

const STYLES = `${HEAD}<styleSheet xmlns="${NS_MAIN}"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;

/** @param {{ name: string, rows: unknown[][], widths?: number[], filter?: boolean }[]} sheets */
export async function buildXlsx(sheets) {
    const names = sheetNames(sheets);
    const sheetParts = names.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("");
    const sheetRels = names.map((_, i) => `<Relationship Id="rId${i + 1}" Type="${NS_REL}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("");
    const files = {
        "[Content_Types].xml": `${HEAD}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheetParts}</Types>`,
        "_rels/.rels": `${HEAD}<Relationships xmlns="${NS_PKG_REL}"><Relationship Id="rId1" Type="${NS_REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
        "xl/workbook.xml": workbookXml(sheets, names),
        "xl/_rels/workbook.xml.rels": `${HEAD}<Relationships xmlns="${NS_PKG_REL}">${sheetRels}<Relationship Id="rId${names.length + 1}" Type="${NS_REL}/styles" Target="styles.xml"/></Relationships>`,
        "xl/styles.xml": STYLES,
    };
    sheets.forEach((sheet, i) => { files[`xl/worksheets/sheet${i + 1}.xml`] = sheetXml(sheet); });
    return Buffer.from(zipSync(Object.fromEntries(Object.entries(files).map(([path, text]) => [path, strToU8(text)])), { level: 6 }));
}

/** Objects to rows, using the keys of the first object as the header. */
export function objectsToRows(objects) {
    if (!objects.length) return [];
    const header = Object.keys(objects[0]);
    return [header, ...objects.map((o) => header.map((key) => o[key] ?? ""))];
}

export function rowsToCsv(rows) {
    const cell = (v) => {
        const s = v === null || v === undefined ? "" : String(v);
        return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    return rows.map((r) => r.map(cell).join(",")).join("\n");
}
