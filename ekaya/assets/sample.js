// Invented examples used only after a visitor selects the sample dashboard.
const examples = [
  ['Naledi','Mokoena','B-204','yes','applied'],
  ['Kabelo','Dube','A-107','yes','not_applied'],
  ['Lindiwe','Zwane','C-311','no','not_applicable','Finishing my studies'],
  ['Anele','Ndlovu','A-109','yes','applied'],
  ['Tshepo','Molefe','B-205','yes','not_applied'],
  ['Ayanda','Langa','C-302','no','not_applicable','Moving to another residence'],
  ['Neo','Sibiya','A-113','yes','applied'],
  ['Thando','Maseko','B-203','yes','applied'],
];
export const sampleRows = examples.map(([firstName,lastName,room,returning,reservation,reason], index) => ({
  submissionId:'69b249b2-321d-47a4-8e44-' + String(index + 1).padStart(12,'0'),
  residence:index % 2 ? 'ekaya' : 'phumelela', intakeYear:2027, receivedAt:'2026-11-20T' + String(15-index).padStart(2,'0') + ':15:00.000Z',
  firstName, lastName, email:firstName.toLowerCase() + '@residents.example', phone:'+2700000010' + String(index).padStart(2,'0'),
  room, gender:index % 2 ? 'Male' : 'Female', returning, reservation, reason:reason || '', reasonDetail:''
}));
