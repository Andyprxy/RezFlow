export function classify(row) {
  return row.returning === 'no' ? 'leaving' : row.reservation;
}
export const statusLabels = {applied: 'Applied', not_applied: 'Yet to apply', leaving: 'Not returning'};
export function summarise(rows) {
  const residents = new Set();
  const currentIds = new Set();
  const counts = {returning:0, applied:0, not_applied:0, leaving:0, residents:0, responses:rows.length};
  for (const row of rows) {
    const email = row.email.trim().toLowerCase();
    if (residents.has(email)) continue;
    residents.add(email);
    currentIds.add(row.submissionId);
    counts[classify(row)]++;
    if (row.returning === 'yes') counts.returning++;
  }
  counts.residents = residents.size;
  return {counts, currentIds};
}
