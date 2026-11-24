// Also embedded in the n8n Code nodes, so both ends use the same field rules.
export const genders = ['Male', 'Female'];
const recordedGenders = [...genders, 'Woman', 'Man', 'Non-binary', 'Another gender', 'Prefer not to say'];
export const residences = Object.freeze({phumelela:'Phumelela Residence', ekaya:'eKaya Student Accommodation'});
export const reasons = ['Finishing my studies', 'Moving to another residence', 'Commuting from home', 'Financial reasons', 'Taking a study break', 'Other'];
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function normalisePhone(value) {
  let phone = String(value ?? '').trim().replace(/[\s().-]/g, '');
  if (phone.startsWith('00')) phone = '+' + phone.slice(2);
  if (/^0\d{9}$/.test(phone)) phone = '+27' + phone.slice(1);
  return /^\+[1-9]\d{7,14}$/.test(phone) ? phone : '';
}

export function validateSubmission(input, allowedGenders = genders) {
  const bad = (error) => ({ok: false, error});
  if (!input || typeof input !== 'object' || Array.isArray(input)) return bad('A questionnaire is required.');
  const field = (key) => typeof input[key] === 'string' ? input[key].trim() : '';
  const shortText = (value, limit) => value.length > 0 && value.length <= limit && !/[\u0000-\u001f\u007f]/.test(value);
  const submissionId = field('submissionId').toLowerCase();
  if (!uuidPattern.test(submissionId)) return bad('The response reference is missing or invalid.');
  const residence = field('residence');
  if (!Object.hasOwn(residences, residence) || Number(input.intakeYear) !== 2027) return bad('Choose your residence for the 2027 intake.');
  const firstName = field('firstName'), lastName = field('lastName');
  const email = field('email').toLowerCase(), phone = normalisePhone(field('phone'));
  const gender = field('gender'), room = field('room');
  if (!shortText(firstName, 80) || !shortText(lastName, 80)) return bad('Enter your first name and surname.');
  if (!shortText(email, 254) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return bad('Enter a complete email address.');
  if (!phone) return bad('Enter a 10-digit South African number or an international number with a country code.');
  if (!allowedGenders.includes(gender) || !shortText(room, 32)) return bad('Choose a gender option and enter your current room.');
  const returning = field('returning'), reservation = field('reservation');
  const reason = field('reason'), reasonDetail = field('reasonDetail');
  if (returning === 'yes') {
    if (!['applied', 'not_applied'].includes(reservation) || reason || reasonDetail) return bad('Choose your reservation application status.');
  } else if (returning === 'no') {
    if (reservation !== 'not_applicable' || !reasons.includes(reason)) return bad('Choose your main reason for leaving.');
    if (reason === 'Other' && !reasonDetail) return bad('Add a short explanation for your reason.');
    if (reasonDetail.length > 500 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(reasonDetail)) return bad('Keep your feedback within 500 characters.');
  } else {
    return bad('Let us know whether you plan to return.');
  }
  return {ok: true, row: {submissionId, residence, intakeYear: 2027, firstName, lastName, email, phone, gender, room, returning, reservation, reason, reasonDetail}};
}

// The raw sheet is an append-only receipt log. Keep the first accepted copy of
// each retry ID before finding the newest distinct questionnaire per email.
export function responseHistory(rawRows) {
  const entries = [];
  for (const [index, raw] of rawRows.entries()) {
    if (!raw || typeof raw !== 'object') throw new Error('Invalid response row.');
    const keys = Object.keys(raw).filter(k => k !== 'row_number' && raw[k] !== '');
    if (!keys.length) continue; // A header-only sheet produces one empty item in n8n.
    if (!raw.residence || !raw.intakeYear) throw new Error('Check the sheet headers.');
    if (!Object.hasOwn(residences, raw.residence) || Number(raw.intakeYear) !== 2027) continue;
    let phone = String(raw.phone ?? '').trim();
    if (/^27\d{9}$/.test(phone)) phone = '+' + phone;
    const result = validateSubmission({...raw, phone, room:String(raw.room ?? '')}, recordedGenders);
    const time = Date.parse(raw.receivedAt);
    if (!result.ok || !Number.isFinite(time)) throw new Error('Check the data in sheet row ' + (raw.row_number || index + 2) + '.');
    entries.push({row: {...result.row, receivedAt: new Date(time).toISOString()}, index, time});
  }
  entries.sort((a, b) => a.time - b.time || a.index - b.index);
  const seen = new Set();
  return entries.filter(({row}) => {
    if (seen.has(row.submissionId)) return false;
    seen.add(row.submissionId);
    return true;
  }).reverse().map(entry => entry.row);
}
