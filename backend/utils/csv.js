/**
 * Minimal RFC 4180 CSV writer.
 *
 * Cells that start with = + - @ (or tab/CR) are prefixed with an
 * apostrophe so spreadsheet apps don't execute them as formulas
 * (CSV/formula injection) — user-controlled text like names and
 * subjects ends up in these exports.
 */
const FORMULA_START = /^[=+\-@\t\r]/;

const cell = (value) => {
    if (value === null || value === undefined) return '';
    let text = value instanceof Date ? value.toISOString() : String(value);
    if (FORMULA_START.test(text)) text = `'${text}`;
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/**
 * @param {Array<{ header: string, value: (row) => any }>} columns
 * @param {object[]} rows
 * @returns {string} CSV text (with a UTF-8 BOM so Excel reads Urdu correctly)
 */
const toCsv = (columns, rows) => {
    const lines = [columns.map((c) => cell(c.header)).join(',')];
    for (const row of rows) lines.push(columns.map((c) => cell(c.value(row))).join(','));
    return '﻿' + lines.join('\r\n') + '\r\n';
};

/** Several titled tables in one CSV file, separated by blank lines. */
const toCsvSections = (sections) =>
    '﻿' + sections
        .map(({ title, columns, rows }) => [cell(title), toCsv(columns, rows).replace(/^﻿/, '')].join('\r\n'))
        .join('\r\n');

const sendCsv = (res, filename, csv) => {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send(csv);
};

module.exports = { toCsv, toCsvSections, sendCsv };
