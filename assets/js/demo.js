import { createKinds, initialStatus, statusFlow, staffKinds, threadKinds } from './catalog.js';

// This adapter has no network or auth dependencies. All fixture people, accounts and rooms are invented.
export const demoStudent = '11111111-1111-4111-8111-111111111111';
const neighbour = '22222222-2222-4222-8222-222222222222';
const demoStaff = '33333333-3333-4333-8333-333333333333';
let database;
function openDemo() {
  if (!database)
    database = new Promise((resolve, reject) => {
      const request = indexedDB.open('rezflow-demonstrations-v2', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('residences');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        database = null;
        reject(new Error('Allow browser storage to open this demonstration.'));
      };
    });
  return database;
}
function seed() {
  const now = Date.now();
  const ago = (hours) => new Date(now - hours * 3600000).toISOString();
  const tomorrow = new Date(now + 86400000).toISOString().slice(0, 10);
  const series = [];
  function add(kind, title, status, owner, detail, fields, hours) {
    const created = ago(hours + 18),
      updated = ago(hours);
    const row = {
      id: crypto.randomUUID(),
      kind,
      title,
      status,
      owner,
      detail,
      fields,
      createdAt: created,
      updatedAt: updated,
      history: [{ at: created, action: 'created', message: 'Record opened.' }],
    };
    if (status !== initialStatus[kind])
      row.history.push({
        at: updated,
        action: 'transition',
        message: 'Status updated to ' + status.replaceAll('_', ' ') + '.',
      });
    series.push(row);
    return row;
  }
  add(
    'profile',
    'Lebo Dlamini',
    'active',
    demoStudent,
    'Sample resident profile.',
    { firstName: 'Lebo', lastName: 'Dlamini', room: 'A12' },
    24,
  );
  add(
    'profile',
    'Mila Sibiya',
    'active',
    neighbour,
    'Sample resident profile.',
    { firstName: 'Mila', lastName: 'Sibiya', room: 'B06' },
    32,
  );
  add(
    'profile',
    'Kamo Tolo',
    'active',
    '44444444-4444-4444-8444-444444444444',
    'Sample resident awaiting a room.',
    { firstName: 'Kamo', lastName: 'Tolo' },
    16,
  );
  add(
    'maintenance',
    'Kitchen tap keeps dripping',
    'acknowledged',
    demoStudent,
    'The cold tap by the shared kitchen sink drips after use.',
    { room: 'A12', category: 'Plumbing', priority: 'Normal' },
    2,
  );
  add(
    'maintenance',
    'Study light needs a new bulb',
    'open',
    neighbour,
    'The light above the study desk is out.',
    { room: 'B06', category: 'Electrical', priority: 'Normal' },
    6,
  );
  add(
    'maintenance',
    'Wardrobe hinge repaired',
    'closed',
    demoStudent,
    'The maintenance team tightened the loose hinge.',
    { room: 'A12', category: 'Furniture' },
    64,
  );
  add(
    'incident',
    'Side entrance light flickers',
    'open',
    neighbour,
    'Please check the lighting outside the entrance.',
    { location: 'East entrance', category: 'Facilities' },
    9,
  );
  add(
    'visitor',
    'Saturday study visit',
    'expected',
    demoStudent,
    'A classmate is visiting for a group assignment.',
    { guestName: 'Ari Sample', visitDate: tomorrow },
    4,
  );
  add(
    'shuttle',
    'Morning campus shuttle',
    'requested',
    demoStudent,
    'One seat requested for the library route.',
    { pickup: 'Residence gate', destination: 'Campus library' },
    3,
  );
  add(
    'housekeeping',
    'Shared kitchen clean',
    'open',
    demoStudent,
    'Please include the shared counters in the next round.',
    { room: 'A12', service: 'Shared facilities', date: tomorrow },
    10,
  );
  add(
    'application',
    'Accommodation application',
    'approved',
    demoStudent,
    'Funding documents reviewed in this sample application.',
    { intakeYear: String(new Date().getFullYear() + 1), reference: 'DEMO-A12' },
    48,
  );
  add(
    'application',
    'New intake application',
    'submitted',
    neighbour,
    'Ready for a first review.',
    { intakeYear: String(new Date().getFullYear() + 1), reference: 'DEMO-B06' },
    12,
  );
  for (const [room, bed, owner] of [
    ['A12', '1', demoStudent],
    ['B06', '1', neighbour],
    ['A14', '1', null],
    ['A14', '2', null],
  ])
    add(
      'bed',
      `Room ${room} · Bed ${bed}`,
      owner ? 'occupied' : 'available',
      owner,
      'Residence bed inventory.',
      { room, bed },
      40,
    );
  add(
    'inspection',
    'Common-room inspection',
    'scheduled',
    null,
    'Check seating, lights and condition of shared furniture.',
    { room: 'Common room', date: tomorrow },
    11,
  );
  add(
    'finance',
    'Residence fee allocation',
    'reconciled',
    demoStudent,
    'Funding matched to this sample statement entry.',
    { amount: '4200.00', currency: 'ZAR', period: ago(0).slice(0, 7), reference: 'DEMO-F01' },
    30,
  );
  add(
    'finance',
    'Residence fee allocation',
    'outstanding',
    neighbour,
    'Awaiting statement matching.',
    { amount: '3890.50', currency: 'ZAR', period: ago(0).slice(0, 7), reference: 'DEMO-F02' },
    18,
  );
  add(
    'document',
    'Proof of registration',
    'filed',
    demoStudent,
    'A sample file from the resident vault.',
    { documentType: 'Proof of registration', reference: crypto.randomUUID() },
    33,
  );
  add(
    'announcement',
    'Study room hours',
    'published',
    null,
    'The study room is available until 21:00 on weekdays. Please leave the space ready for the next group.',
    { category: 'Residence life' },
    1,
  );
  add(
    'stock',
    'LED desk bulbs',
    'listed',
    null,
    'Replacement bulbs in the maintenance store.',
    { quantity: 12, unit: 'bulbs' },
    34,
  );
  add(
    'wifi',
    'Resident network',
    'available',
    demoStudent,
    'Synthetic network information for this demonstration.',
    {
      network: 'Residence-Demo',
      password: 'Sample-WiFi-Only',
      usedGB: '6.2',
      devices: ['Demo phone', 'Demo laptop'],
    },
    42,
  );
  return { records: series, receipts: {} };
}
async function transaction(tenant, fn) {
  const db = await openDemo();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('residences', 'readwrite'),
      store = tx.objectStore('residences');
    let result, failure;
    const read = store.get(tenant);
    read.onsuccess = () => {
      try {
        const state = read.result || seed();
        result = fn(state);
        store.put(state, tenant);
      } catch (e) {
        failure = e;
        tx.abort();
      }
    };
    tx.oncomplete = () => resolve(result);
    tx.onabort = () =>
      reject(failure || new Error('The demonstration could not save this change. Try again.'));
  });
}
function visible(row, role) {
  if (role === 'management') return row.kind !== 'wifi';
  if (role === 'students') return row.owner === demoStudent || row.kind === 'announcement';
  return staffKinds[role]?.includes(row.kind);
}
export function readDemo(ctx) {
  return transaction(ctx.residence, (state) => {
    const records = state.records
      .filter((r) => visible(r, ctx.role))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return { records, total: records.length, nextCursor: null };
  });
}
export function writeDemo(ctx, change) {
  return transaction(ctx.residence, (state) => {
    const { action, recordId, submissionId, payload } = change,
      signature = JSON.stringify([ctx.role, action, recordId, payload]);
    if (state.receipts[submissionId]) {
      const receipt = state.receipts[submissionId];
      if (receipt.signature !== signature)
        throw new Error('These details differ from the original request. Reopen the form.');
      return {
        ...state.records.find((r) => r.id === receipt.recordId),
        relatedRecords: state.records.filter((r) => receipt.relatedIds?.includes(r.id)),
      };
    }
    const now = new Date().toISOString();
    let row = state.records.find((r) => r.id === recordId);
    let message,
      relatedRecords = [];
    if (action === 'create') {
      if (!createKinds[ctx.role]?.includes(payload.kind) || !payload.title?.trim())
        throw new Error('Choose a supported request and enter a title.');
      if (
        payload.kind === 'bed' &&
        state.records.some(
          (r) =>
            r.kind === 'bed' &&
            ['bed', 'room'].every(
              (k) =>
                String(r.fields[k]).trim().toLowerCase() === String(payload.fields[k]).trim().toLowerCase(),
            ),
        )
      )
        throw new Error('This bed is already listed for the room.');
      const owner = ctx.role === 'students' ? demoStudent : null;
      row = {
        id: crypto.randomUUID(),
        kind: payload.kind,
        title: payload.title.trim(),
        detail: payload.detail || '',
        status: initialStatus[payload.kind],
        fields: payload.fields || {},
        owner,
        createdAt: now,
        updatedAt: now,
        history: [],
      };
      state.records.push(row);
      message = 'Record opened.';
    } else {
      if (!row || !visible(row, ctx.role)) throw new Error('This record is unavailable.');
      if (
        action === 'comment' &&
        threadKinds.includes(row.kind) &&
        !['closed', 'completed', 'cancelled'].includes(row.status)
      )
        message = payload.message;
      else if (
        action === 'transition' &&
        (ctx.role !== 'students' ||
          (['shuttle', 'visitor'].includes(row.kind) && payload.status === 'cancelled')) &&
        statusFlow[row.kind]?.[row.status]?.includes(payload.status) &&
        row.status === payload.expectedStatus
      ) {
        row.status = payload.status;
        message = 'Status changed to ' + row.status.replaceAll('_', ' ') + '.';
        if (row.kind === 'shuttle' && row.status !== 'accepted')
          for (const k of ['latitude', 'longitude', 'positionAt']) delete row.fields[k];
      } else if (
        (action === 'allocate' || action === 'release') &&
        ctx.role === 'management' &&
        row.kind === 'bed'
      ) {
        if (action === 'allocate') {
          if (
            row.owner ||
            !state.records.some((r) => r.kind === 'profile' && r.owner === payload.studentId) ||
            state.records.some((r) => r.kind === 'bed' && r.owner === payload.studentId)
          )
            throw new Error('The bed or resident already has an allocation. Refresh the register.');
          row.owner = payload.studentId;
          row.status = 'occupied';
          message = 'Bed allocated.';
        } else {
          if (!row.owner || row.owner !== payload.studentId)
            throw new Error('The allocation changed. Refresh the register.');
          row.owner = null;
          row.status = 'available';
          message = 'Bed released.';
        }
      } else if (action === 'adjustStock' && ctx.role === 'management' && row.kind === 'stock') {
        const quantity = Number(row.fields.quantity) + payload.change;
        if (
          !Number.isInteger(quantity) ||
          quantity < 0 ||
          quantity > 999999 ||
          !payload.change ||
          !payload.note?.trim()
        )
          throw new Error('Check the quantity and reason. Stock cannot become negative.');
        row.fields.quantity = quantity;
        message = `Stock changed by ${payload.change} to ${quantity}. ${payload.note}`;
      } else if (action === 'moveBed' && ctx.role === 'management' && row.kind === 'bed') {
        const dest = state.records.find((r) => r.id === payload.destinationId && r.kind === 'bed');
        if (!row.owner || row.owner !== payload.studentId || !dest || dest.status !== 'available')
          throw new Error('The bed assignment changed. Refresh the register.');
        dest.owner = row.owner;
        dest.status = 'occupied';
        dest.updatedAt = now;
        dest.history.push({ at: now, action, message: 'Resident moved from ' + row.title + '.' });
        row.owner = null;
        row.status = 'available';
        message = 'Resident moved to ' + dest.title + '.';
        relatedRecords = [dest];
      } else if (
        action === 'position' &&
        ['transport', 'management'].includes(ctx.role) &&
        row.kind === 'shuttle' &&
        row.status === 'accepted'
      ) {
        Object.assign(row.fields, { latitude: -25.7479, longitude: 28.2293, positionAt: now });
        message = 'Sample location updated.';
      } else throw new Error('This action is unavailable for the current status. Refresh the record.');
    }
    row.updatedAt = now;
    row.history.push({
      at: now,
      action,
      message,
      actor: ctx.role === 'students' ? 'Student' : 'Residence team',
    });
    state.receipts[submissionId] = {
      signature,
      recordId: row.id,
      relatedIds: relatedRecords.map((r) => r.id),
    };
    return { ...row, relatedRecords };
  });
}
