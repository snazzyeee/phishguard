export const MAX = 10;
export const KEYWORDS = [
  'urgent', 'verify', 'password', 'suspended', 'click', 'winner',
  'lottery', 'otp', 'bank', 'login', 'prize', 'confirm',
];

export const SAMPLE_EMAILS = [
  {
    sender: 'support@secure-bank.xyz',
    subject: 'URGENT: Verify your account',
    body: 'Your account is suspended. Click http://secure-bank.xyz/login to confirm your password.',
    label: 'Bank alert · PDF sample',
  },
  {
    sender: 'prof.mehta@college.edu',
    subject: 'Mini project submission',
    body: 'Please submit your report by Friday.',
    label: 'College note · PDF sample',
  },
  {
    sender: 'prizes@reward-center.top',
    subject: 'Winner! Claim your lottery prize',
    body: 'Click to confirm your OTP at http://reward-center.top/claim',
    label: 'Prize scam · high risk',
  },
  {
    sender: 'notice-without-at',
    subject: 'Password reset notice',
    body: 'Please verify the login request.',
    label: 'Malformed sender · edge case',
  },
  {
    sender: 'updates@college.edu',
    subject: 'Timetable update',
    body: 'The new timetable is available in the portal.',
    label: 'Routine update · safe',
  },
];

export function assessEmail(email) {
  const text = `${email.subject} ${email.body}`.toLowerCase();
  const sender = email.sender.toLowerCase();
  const matchedKeywords = KEYWORDS.filter((word) => text.includes(word));
  const insecureLink = text.includes('http://');
  const at = sender.indexOf('@');
  const senderReason = at === -1
    ? 'Malformed sender · no @ symbol'
    : ['.xyz', '.top', '.tk'].some((suffix) => sender.slice(at).endsWith(suffix))
      ? 'Risky sender domain'
      : null;
  const rawScore = matchedKeywords.length * 10 + (insecureLink ? 15 : 0) + (senderReason ? 20 : 0);
  const score = Math.min(rawScore, 100);
  const verdict = score >= 60 ? 'PHISHING' : score >= 30 ? 'SUSPICIOUS' : 'SAFE';
  return { matchedKeywords, insecureLink, senderReason, rawScore, score, verdict };
}

export class CircularQueue {
  constructor() { this.reset(); }

  reset() {
    this.slots = Array(MAX).fill(null);
    this.front = 0;
    this.rear = -1;
    this.count = 0;
    this.nextId = 1;
    this.safeCount = 0;
    this.suspiciousCount = 0;
    this.phishingCount = 0;
  }

  isEmpty() { return this.count === 0; }
  isFull() { return this.count === MAX; }

  enqueue({ sender, subject, body }) {
    if (this.isFull()) return null;
    const email = { id: this.nextId++, sender, subject, body };
    this.rear = (this.rear + 1) % MAX;
    this.slots[this.rear] = email;
    this.count++;
    return email;
  }

  peek() { return this.isEmpty() ? null : this.slots[this.front]; }

  dequeue() {
    if (this.isEmpty()) return null;
    const email = this.slots[this.front];
    this.slots[this.front] = null;
    this.front = (this.front + 1) % MAX;
    this.count--;
    return email;
  }

  pending() {
    return Array.from({ length: this.count }, (_, i) => ({
      index: (this.front + i) % MAX,
      email: this.slots[(this.front + i) % MAX],
    }));
  }

  assessNext() {
    const email = this.dequeue();
    if (!email) return null;
    const assessment = assessEmail(email);
    if (assessment.verdict === 'SAFE') this.safeCount++;
    else if (assessment.verdict === 'SUSPICIOUS') this.suspiciousCount++;
    else this.phishingCount++;
    return { email, ...assessment };
  }
}
