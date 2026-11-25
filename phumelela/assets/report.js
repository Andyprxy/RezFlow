import {residences} from './contract.js';

export const shortNames = Object.freeze({phumelela:'Phumelela', ekaya:'eKaya', other:'Other / unassigned'});
const text = value => String(value ?? '').trim();
const token = value => text(value).toLowerCase().replace(/[\s_-]+/g, ' ');
const hasRecord = row => ['submissionId','firstName','lastName','room','email','phone','returning','reservation','reason','reasonDetail','receivedAt','gender'].some(key => text(row[key]) !== '');

function residenceKey(value) {
  const name = token(value);
  for (const [key, fullName] of Object.entries(residences)) {
    if (name === key || name === token(fullName)) return key;
  }
  return 'other';
}

function returnStatus(value) {
  const name = token(value);
  if (['yes','returning','true','1'].includes(name)) return 'yes';
  if (['no','not returning','false','0'].includes(name)) return 'no';
  return 'unknown';
}

function reservationStatus(value, returning) {
  if (returning !== 'yes') return returning === 'no' ? 'not_applicable' : 'unknown';
  const name = token(value);
  if (['applied','already applied','yes','reserved','true','1'].includes(name)) return 'applied';
  if (['not applied','yet to apply','not reserved','no','false','0'].includes(name)) return 'not_applied';
  return 'unknown';
}

function receivedTime(value) {
  if (!value) return null;
  // Unzoned sheet times are local to Pretoria, including day-first dates.
  const local = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:[ ,T]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(value);
  let iso = value;
  if (local) {
    const [,day,month,year,h='00',m='00',s='00'] = local;
    iso = year + '-' + month.padStart(2,'0') + '-' + day.padStart(2,'0') + 'T' + h.padStart(2,'0') + ':' + m + ':' + s + '+02:00';
  } else if (/^\d{4}-\d\d-\d\d(?:[ T]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)?$/.test(value)) {
    iso = (value.length === 10 ? value + 'T00:00' : value.replace(' ','T')) + '+02:00';
  } else if (!/^\d{4}-\d\d-\d\d[T ]\d{2}:\d{2}.*(?:Z|[+-]\d{2}:?\d{2})$/i.test(value)) {
    return null;
  }
  if (iso[10] === ' ') iso = iso.replace(' ','T');
  const time = Date.parse(iso);
  return Number.isFinite(time) ? time : null;
}

export function responseHistory(rawRows) {
  const rows = [];
  for (const raw of rawRows) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw) || !hasRecord(raw)) continue;
    if (text(raw.intakeYear) && Number(raw.intakeYear) !== 2027) continue;
    const row = {};
    for (const key of ['submissionId','receivedAt','firstName','lastName','gender','room','email','phone','reason','reasonDetail']) row[key] = text(raw[key]);
    if (/^27\d{9}$/.test(row.phone)) row.phone = '+' + row.phone;
    row.residence = residenceKey(raw.residence);
    row.residenceLabel = residences[row.residence] || text(raw.residence) || 'Unassigned';
    row.returning = returnStatus(raw.returning);
    row.reservation = reservationStatus(raw.reservation, row.returning);
    row.time = receivedTime(row.receivedAt);
    row.sheetRow = Number(raw.row_number) || 0;
    rows.push(row);
  }
  return rows.sort((a,b) => (b.time ?? -Infinity) - (a.time ?? -Infinity) || b.sheetRow - a.sheetRow);
}

export function unpackFeed(data) {
  // Both n8n's JSON envelope and its All Incoming Items response are supported.
  if (Array.isArray(data)) {
    if (data.length === 1 && Array.isArray(data[0]?.responses)) return unpackFeed(data[0]);
    if (data.some(row => row && typeof row === 'object' &&
      (Object.hasOwn(row,'ok') || (!hasRecord(row) && ['error','message','code'].some(k => Object.hasOwn(row,k)))))) {
      throw new Error('The GET reply did not contain sheet rows.');
    }
    return responseHistory(data);
  }
  if (data?.ok === true && Array.isArray(data.responses) && (!text(data.intakeYear) || Number(data.intakeYear) === 2027)) return responseHistory(data.responses);
  throw new Error('The GET reply must contain the response rows.');
}

export const planLabels = {yes:'Returning', no:'Not returning', unknown:'Return plan unspecified'};
export const applicationLabels = {applied:'Applied', not_applied:'Yet to apply', not_applicable:'Not applicable', unknown:'Unspecified'};

export function filterResponses(rows, {residence = 'all', status = 'all', search = ''} = {}) {
  const query = text(search).toLowerCase();
  const digits = query.replace(/[\s().-]/g,'');
  return rows.filter(row => {
    if (residence !== 'all' && row.residence !== residence) return false;
    if (status === 'returning' && row.returning !== 'yes') return false;
    if (status === 'leaving' && row.returning !== 'no') return false;
    if (status === 'unknown_return' && row.returning !== 'unknown') return false;
    if (status === 'unknown_application' && !(row.returning === 'yes' && row.reservation === 'unknown')) return false;
    if (['applied','not_applied'].includes(status) && row.reservation !== status) return false;
    if (!query) return true;
    const phone = row.phone.replace(/[\s().-]/g,'');
    if (/^[+\d]+$/.test(digits) && (phone.includes(digits) || (phone.startsWith('+27') && ('0' + phone.slice(3)).includes(digits)))) return true;
    return [row.firstName+' '+row.lastName,row.room,row.email,row.phone,row.submissionId].some(value => value.toLowerCase().includes(query));
  });
}

export function summarise(rows) {
  const counts = {total:rows.length, returning:0, leaving:0, unknownReturn:0, applied:0, not_applied:0, unknownApplication:0};
  for (const row of rows) {
    if (row.returning === 'yes') {
      counts.returning++;
      if (row.reservation === 'applied') counts.applied++;
      else if (row.reservation === 'not_applied') counts.not_applied++;
      else counts.unknownApplication++;
    } else if (row.returning === 'no') counts.leaving++;
    else counts.unknownReturn++;
  }
  return counts;
}
