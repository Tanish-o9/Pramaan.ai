/**
 * Ajay Kumar Garg Engineering College, Ghaziabad
 * Department of Computer Science & Engineering [CSE-AIML and CSE-DS]
 * Session: 2026-27 | W.E.F: 07-09-2026
 * Course & Branch: B. Tech. & CSE(AIML) | Semester: III | Section: CSE(AIML-2)
 * Room No: CL-11 | Class Coordinator: Mr. Narendra Kumar
 */

export const AKGEC_META = {
  college: 'Ajay Kumar Garg Engineering College, Ghaziabad',
  department: 'Department of Computer Science & Engineering [CSE-AIML and CSE-DS]',
  branch: 'B. Tech. & CSE(AIML)',
  semester: 'III',
  section: 'CSE(AIML-2)',
  room: 'CL-11',
  coordinator: 'Mr. Narendra Kumar',
  session: '2026-27',
  wef: '07-09-2026',
};

export const AKGEC_PERIODS = [
  { id: 1, name: 'Period 1', slot: '08:30 - 09:20', startMin: 8 * 60 + 30, endMin: 9 * 60 + 20, isBreak: false },
  { id: 2, name: 'Period 2', slot: '09:20 - 10:10', startMin: 9 * 60 + 20, endMin: 10 * 60 + 10, isBreak: false },
  { id: 3, name: 'Break', slot: '10:10 - 11:00', startMin: 10 * 60 + 10, endMin: 11 * 60, isBreak: true },
  { id: 4, name: 'Period 4', slot: '11:00 - 11:50', startMin: 11 * 60, endMin: 11 * 60 + 50, isBreak: false },
  { id: 5, name: 'Period 5', slot: '11:50 - 12:40', startMin: 11 * 60 + 50, endMin: 12 * 60 + 40, isBreak: false },
  { id: 6, name: 'Lunch', slot: '12:40 - 13:30', startMin: 12 * 60 + 40, endMin: 13 * 60 + 30, isBreak: true },
  { id: 7, name: 'Period 7', slot: '13:30 - 14:20', startMin: 13 * 60 + 30, endMin: 14 * 60 + 20, isBreak: false },
  { id: 8, name: 'Period 8', slot: '14:20 - 15:10', startMin: 14 * 60 + 20, endMin: 15 * 60 + 10, isBreak: false },
  { id: 9, name: 'Period 9', slot: '15:10 - 16:00', startMin: 15 * 60 + 10, endMin: 16 * 60, isBreak: false },
];

export const AKGEC_SUBJECTS = {
  BAS301: { code: 'BAS301', name: 'Technical Communication', faculty: 'Dr. Neetu Sharma', venue: 'CL-11' },
  BCS301: { code: 'BCS301', name: 'Data Structure', faculty: 'Mr. Sharma Ji', venue: 'CL-11' },
  BCS302: { code: 'BCS302', name: 'Computer Organisation & Architecture', faculty: 'Mr. Narendra', venue: 'CL-11' },
  BCS303: { code: 'BCS303', name: 'Discrete Structure & Theory', faculty: 'Ms. Ritika Dhyani', venue: 'CL-11' },
  BCC301: { code: 'BCC301', name: 'Cyber Security', faculty: 'Mr. Manoj Kumar', venue: 'CL-11' },
  BOE304: { code: 'BOE304', name: 'ESE', faculty: 'Respective OE Faculty', venue: 'CL-11' },
  BCS351: { code: 'BCS351', name: 'Data Structure Lab', faculty: 'Mr. Sharma Ji', venue: 'LAB-5, LAB-4' },
  BCS352: { code: 'BCS352', name: 'Computer Organisation Lab', faculty: 'Mr. Narendra', venue: 'LAB-4' },
  BCS353: { code: 'BCS353', name: 'Web Designing Workshop', faculty: 'Mr. Gaurav Kumar', venue: 'LAB-5' },
  BCC351: { code: 'BCC351', name: 'Internship Assesment/Mini Project', faculty: 'Mr. Amit Goel', venue: 'CL-11' },
};

export const AKGEC_WEEKLY_SCHEDULE = {
  Mon: [
    { periodId: 1, code: 'BAS301', subject: 'Technical Communication', faculty: 'Dr. Neetu Sharma', venue: 'CL-11' },
    { periodId: 2, code: 'BCS303', subject: 'Discrete Structure & Theory', faculty: 'Ms. Ritika Dhyani', venue: 'CL-11' },
    { periodId: 3, code: 'BREAK', subject: 'Break', isBreak: true },
    { periodId: 4, code: 'BCS352', subject: 'COA-LAB (C+D) / DS-LAB (A+B)', faculty: 'Mr. Narendra / Mr. Sharma Ji', venue: 'LAB-4 / LAB-5' },
    { periodId: 5, code: 'BCS351', subject: 'COA-LAB (C+D) / DS-LAB (A+B)', faculty: 'Mr. Narendra / Mr. Sharma Ji', venue: 'LAB-4 / LAB-5' },
    { periodId: 6, code: 'LUNCH', subject: 'Lunch Break', isBreak: true },
    { periodId: 7, code: 'BOE304', subject: 'ESE', faculty: 'Respective OE Faculty', venue: 'CL-11' },
    { periodId: 8, code: 'BCS303', subject: 'Discrete Structure & Theory', faculty: 'Ms. Ritika Dhyani', venue: 'CL-11' },
    { periodId: 9, code: 'STUDY_BREAK', subject: 'Study Break', isBreak: true },
  ],
  Tue: [
    { periodId: 1, code: 'BCC301', subject: 'Cyber Security', faculty: 'Mr. Manoj Kumar', venue: 'CL-11' },
    { periodId: 2, code: 'BAS301', subject: 'Technical Communication', faculty: 'Dr. Neetu Sharma', venue: 'CL-11' },
    { periodId: 3, code: 'BREAK', subject: 'Break', isBreak: true },
    { periodId: 4, code: 'BCS302', subject: 'Computer Organisation & Architecture', faculty: 'Mr. Narendra', venue: 'CL-11' },
    { periodId: 5, code: 'BCS302', subject: 'Computer Organisation & Architecture', faculty: 'Mr. Narendra', venue: 'CL-11' },
    { periodId: 6, code: 'LUNCH', subject: 'Lunch Break', isBreak: true },
    { periodId: 7, code: 'BOE304', subject: 'ESE', faculty: 'Respective OE Faculty', venue: 'CL-11' },
    { periodId: 8, code: 'STUDY_BREAK', subject: 'Study Break', isBreak: true },
    { periodId: 9, code: 'STUDY_BREAK', subject: 'Study Break', isBreak: true },
  ],
  Wed: [
    { periodId: 1, code: 'BCS301', subject: 'Data Structure', faculty: 'Mr. Sharma Ji', venue: 'CL-11' },
    { periodId: 2, code: 'BAS301', subject: 'Technical Communication', faculty: 'Dr. Neetu Sharma', venue: 'CL-11' },
    { periodId: 3, code: 'BREAK', subject: 'Break', isBreak: true },
    { periodId: 4, code: 'BCS303', subject: 'Discrete Structure & Theory', faculty: 'Ms. Ritika Dhyani', venue: 'CL-11' },
    { periodId: 5, code: 'BCS302', subject: 'Computer Organisation & Architecture', faculty: 'Mr. Narendra', venue: 'CL-11' },
    { periodId: 6, code: 'LUNCH', subject: 'Lunch Break', isBreak: true },
    { periodId: 7, code: 'BOE304', subject: 'ESE', faculty: 'Respective OE Faculty', venue: 'CL-11' },
    { periodId: 8, code: 'BCC351', subject: 'Internship Assesment/Mini Project', faculty: 'Mr. Amit Goel', venue: 'CL-11' },
    { periodId: 9, code: 'BCC351', subject: 'Internship Assesment/Mini Project', faculty: 'Mr. Amit Goel', venue: 'CL-11' },
  ],
  Thu: [
    { periodId: 1, code: 'BCS302', subject: 'Computer Organisation & Architecture', faculty: 'Mr. Narendra', venue: 'CL-11' },
    { periodId: 2, code: 'BCS301', subject: 'Data Structure', faculty: 'Mr. Sharma Ji', venue: 'CL-11' },
    { periodId: 3, code: 'BREAK', subject: 'Break', isBreak: true },
    { periodId: 4, code: 'BCS303', subject: 'Discrete Structure & Theory', faculty: 'Ms. Ritika Dhyani', venue: 'CL-11' },
    { periodId: 5, code: 'BCS301', subject: 'Data Structure', faculty: 'Mr. Sharma Ji', venue: 'CL-11' },
    { periodId: 6, code: 'LUNCH', subject: 'Lunch Break', isBreak: true },
    { periodId: 7, code: 'BOE304', subject: 'ESE', faculty: 'Respective OE Faculty', venue: 'CL-11' },
    { periodId: 8, code: 'BCS351', subject: 'DS-LAB (C+D) / WD-LAB (A+B)', faculty: 'Mr. Sharma Ji / Mr. Gaurav Kumar', venue: 'LAB-4 / LAB-5' },
    { periodId: 9, code: 'BCS353', subject: 'DS-LAB (C+D) / WD-LAB (A+B)', faculty: 'Mr. Sharma Ji / Mr. Gaurav Kumar', venue: 'LAB-4 / LAB-5' },
  ],
  Fri: [
    { periodId: 1, code: 'BCS303', subject: 'Discrete Structure & Theory', faculty: 'Ms. Ritika Dhyani', venue: 'CL-11' },
    { periodId: 2, code: 'BCS302', subject: 'Computer Organisation & Architecture', faculty: 'Mr. Narendra', venue: 'CL-11' },
    { periodId: 3, code: 'BREAK', subject: 'Break', isBreak: true },
    { periodId: 4, code: 'BCS301', subject: 'Data Structure', faculty: 'Mr. Sharma Ji', venue: 'CL-11' },
    { periodId: 5, code: 'BCS301', subject: 'Data Structure', faculty: 'Mr. Sharma Ji', venue: 'CL-11' },
    { periodId: 6, code: 'LUNCH', subject: 'Lunch Break', isBreak: true },
    { periodId: 7, code: 'BCC301', subject: 'Cyber Security', faculty: 'Mr. Manoj Kumar', venue: 'CL-11' },
    { periodId: 8, code: 'BCS352', subject: 'COA-LAB (A+B) / WD-LAB (C+D)', faculty: 'Mr. Narendra / Mr. Gaurav Kumar', venue: 'LAB-4 / LAB-5' },
    { periodId: 9, code: 'BCS353', subject: 'COA-LAB (A+B) / WD-LAB (C+D)', faculty: 'Mr. Narendra / Mr. Gaurav Kumar', venue: 'LAB-4 / LAB-5' },
  ],
};

/**
 * Returns current period and ongoing lecture based on current Day & Time.
 */
export function getCurrentLectureSlot() {
  const now = new Date();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const day = dayNames[now.getDay()];
  const minutes = now.getHours() * 60 + now.getMinutes();

  const period = AKGEC_PERIODS.find((p) => minutes >= p.startMin && minutes < p.endMin) || AKGEC_PERIODS[0];
  const daySchedule = AKGEC_WEEKLY_SCHEDULE[day] || AKGEC_WEEKLY_SCHEDULE.Mon;
  const lecture = daySchedule.find((item) => item.periodId === period.id);

  return {
    day,
    period,
    lecture,
    isClassHours: minutes >= 8 * 60 + 30 && minutes <= 16 * 60,
  };
}
