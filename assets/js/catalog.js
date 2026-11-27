export const roles = {
  students: ['Student portal', 'user', 'View your room, track requests and manage your documents.'],
  management: ['Management', 'chart', 'Review applications, occupancy and work across the residence.'],
  maintenance: ['Maintenance', 'tools', 'Acknowledge repairs and keep residents updated.'],
  security: ['Security', 'shield', 'Check expected visitors and follow up on incident reports.'],
  transport: ['Transport', 'bus', 'Accept shuttle requests and share a trip update.'],
  housekeeping: ['Housekeeping', 'broom', 'Organise cleaning requests and record completed work.'],
};
export const kinds = {
  maintenance: ['Repair', 'tools'],
  incident: ['Incident', 'shield'],
  visitor: ['Visitor', 'users'],
  shuttle: ['Shuttle request', 'bus'],
  housekeeping: ['Cleaning request', 'broom'],
  application: ['Application', 'clipboard'],
  bed: ['Bed', 'bed'],
  inspection: ['Inspection', 'clipboard'],
  finance: ['Finance entry', 'wallet'],
  document: ['Document', 'file'],
  announcement: ['Announcement', 'bell'],
  stock: ['Stock item', 'box'],
  profile: ['Resident profile', 'user'],
  wifi: ['Wi-Fi network', 'wifi'],
};
// Each tuple describes a real navigation destination and the records visible there.
export const sections = {
  students: {
    '': ['Overview', 'home', []],
    maintenance: ['My repairs', 'tools', ['maintenance']],
    security: ['Security', 'shield', ['incident', 'visitor']],
    transport: ['Shuttle', 'bus', ['shuttle']],
    housekeeping: ['Housekeeping', 'broom', ['housekeeping']],
    profile: ['My profile & room', 'user', ['profile', 'bed', 'application']],
    finances: ['My finances', 'wallet', ['finance']],
    'digital-vault': ['Digital vault', 'file', ['document']],
    wifi: ['Wi-Fi', 'wifi', ['wifi']],
    notices: ['Residence notices', 'bell', ['announcement']],
  },
  management: {
    '': ['Overview', 'home', []],
    applications: ['Applications', 'clipboard', ['application']],
    students: ['Residents', 'users', ['profile']],
    occupancy: ['Occupancy', 'bed', ['bed']],
    maintenance: ['Maintenance', 'tools', ['maintenance']],
    security: ['Incidents', 'shield', ['incident']],
    visitors: ['Visitors', 'key', ['visitor']],
    transport: ['Transport', 'bus', ['shuttle']],
    inspections: ['Inspections', 'clipboard', ['inspection']],
    finances: ['Finances', 'wallet', ['finance']],
    documents: ['Documents', 'file', ['document']],
    housekeeping: ['Housekeeping', 'broom', ['housekeeping']],
    stock: ['Stock', 'box', ['stock']],
    communication: ['Communication', 'message', ['announcement']],
    reports: ['Reports', 'chart', []],
  },
  maintenance: { '': ['Repair desk', 'tools', ['maintenance']], stock: ['Stock register', 'box', ['stock']] },
  security: {
    '': ['Security desk', 'shield', ['incident']],
    visitors: ['Visitor register', 'users', ['visitor']],
  },
  transport: { '': ['Shuttle desk', 'bus', ['shuttle']] },
  housekeeping: { '': ['Cleaning desk', 'broom', ['housekeeping']] },
};
export const createKinds = {
  students: ['maintenance', 'incident', 'visitor', 'shuttle', 'housekeeping', 'application', 'document'],
  management: [
    'maintenance',
    'incident',
    'visitor',
    'shuttle',
    'housekeeping',
    'application',
    'bed',
    'inspection',
    'announcement',
    'stock',
  ],
  maintenance: ['maintenance'],
  security: ['incident', 'visitor'],
  transport: ['shuttle'],
  housekeeping: ['housekeeping'],
};
export const statusFlow = {
  maintenance: {
    open: ['acknowledged'],
    acknowledged: ['in_progress'],
    in_progress: ['resolved'],
    resolved: ['closed'],
  },
  housekeeping: {
    open: ['acknowledged'],
    acknowledged: ['in_progress'],
    in_progress: ['resolved'],
    resolved: ['closed'],
  },
  incident: { open: ['acknowledged'], acknowledged: ['resolved'], resolved: ['closed'] },
  visitor: { expected: ['checked_in', 'cancelled'], checked_in: ['checked_out'] },
  shuttle: { requested: ['accepted', 'cancelled'], accepted: ['completed'] },
  application: { submitted: ['in_review'], in_review: ['approved', 'rejected'] },
  inspection: { scheduled: ['completed'] },
};
export const initialStatus = {
  maintenance: 'open',
  incident: 'open',
  visitor: 'expected',
  shuttle: 'requested',
  housekeeping: 'open',
  application: 'submitted',
  bed: 'available',
  inspection: 'scheduled',
  announcement: 'published',
  stock: 'listed',
  document: 'filed',
};
export const staffKinds = {
  maintenance: ['maintenance', 'stock'],
  security: ['incident', 'visitor'],
  transport: ['shuttle'],
  housekeeping: ['housekeeping'],
};
export const threadKinds = ['maintenance', 'incident', 'shuttle', 'housekeeping'];
export const closed = new Set([
  'closed',
  'resolved',
  'checked_out',
  'completed',
  'cancelled',
  'approved',
  'rejected',
]);
export const fieldNames = {
  firstName: 'First name',
  lastName: 'Last name',
  room: 'Room',
  bed: 'Bed',
  studentId: 'Resident ID',
  funding: 'Funding',
  network: 'Network',
  usedGB: 'Data used (GB)',
  devices: 'Connected devices',
  priority: 'Priority',
  category: 'Category',
  location: 'Location',
  guestName: 'Guest name',
  visitDate: 'Visit date',
  pickup: 'Pickup point',
  destination: 'Destination',
  date: 'Date',
  intakeYear: 'Intake year',
  reference: 'Reference',
  service: 'Service',
  period: 'Statement period',
  amount: 'Amount',
  currency: 'Currency',
  documentType: 'Document type',
  quantity: 'Quantity',
  unit: 'Unit',
  positionAt: 'Last location update',
  latitude: 'Latitude',
  longitude: 'Longitude',
};
export const extraFields = {
  maintenance: ['room', 'category', 'priority'],
  incident: ['location', 'category', 'priority'],
  visitor: ['guestName', 'visitDate'],
  shuttle: ['pickup', 'destination'],
  housekeeping: ['room', 'service', 'date'],
  application: ['intakeYear'],
  bed: ['room', 'bed'],
  inspection: ['room', 'date'],
  announcement: ['category'],
  stock: ['quantity', 'unit'],
  document: ['documentType'],
};
export const optionFields = {
  priority: ['Normal', 'Urgent'],
  documentType: ['Proof of registration', 'Proof of funding', 'Lease', 'Other'],
  service: ['Cleaning', 'Linen', 'Shared facilities'],
};
export const actionText = {
  maintenance: 'Report a repair',
  incident: 'Report an incident',
  visitor: 'Register a visitor',
  shuttle: 'Request a shuttle',
  housekeeping: 'Request cleaning',
  application: 'Add application',
  bed: 'Add bed',
  inspection: 'Schedule inspection',
  announcement: 'Post notice',
  stock: 'Add stock item',
  document: 'Add document',
};
export function label(value) {
  return String(value || '')
    .replaceAll('_', ' ')
    .replace(/^./, (letter) => letter.toUpperCase());
}
export function tone(status) {
  if (
    [
      'resolved',
      'closed',
      'approved',
      'available',
      'completed',
      'published',
      'paid',
      'occupied',
      'active',
    ].includes(status)
  )
    return 'good';
  if (['rejected', 'cancelled', 'overdue'].includes(status)) return 'danger';
  if (['open', 'requested', 'expected', 'submitted', 'scheduled', 'outstanding'].includes(status))
    return 'warn';
  return 'info';
}
