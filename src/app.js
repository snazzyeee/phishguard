import { CircularQueue, MAX, SAMPLE_EMAILS } from './engine.js';

const queue = new CircularQueue();
const $ = (selector) => document.querySelector(selector);
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const menu = '\n===== PHISHGUARD =====\n1. Receive Email (Enqueue)\n2. Assess Next Email (Dequeue)\n3. Peek Next Email\n4. Display Pending Emails\n5. Assess All Pending Emails\n6. Session Summary\n0. Exit\n';
const overflow = 'Inbox queue is full (overflow). Assess some emails first.';
const underflow = 'No emails waiting (queue is empty).';
let terminal = menu;
let latestReport = null;
let toastTimer;
let runToken = 0;
let busy = false;
let sourceText = null;

function appendTerminal(output) {
  terminal += output;
  const pre = $('#terminal-output');
  pre.textContent = terminal;
  pre.scrollTop = pre.scrollHeight;
}

function command(number, output) {
  appendTerminal(`Enter your choice: ${number}\n${output}`);
}

function showToast(message, tone = 'error') {
  const toast = $('#toast');
  toast.textContent = message;
  toast.className = `toast show ${tone}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.className = 'toast'; }, 3700);
}

function receive(email, { initial = false } = {}) {
  if (queue.isFull()) {
    command(1, `${overflow}\n`);
    showToast(overflow);
    return false;
  }
  const sender = email.sender.trim();
  if (!sender) {
    $('#form-error').textContent = 'Sender cannot be empty.';
    command(1, `Enter sender address: ${email.sender}\nEnter subject: ${email.subject}\nEnter message body: ${email.body}\nSender cannot be empty.\n`);
    showToast('Sender cannot be empty.');
    return false;
  }
  const saved = queue.enqueue({ sender, subject: email.subject, body: email.body });
  command(1, `Enter sender address: ${saved.sender}\nEnter subject: ${saved.subject}\nEnter message body: ${saved.body}\nEmail #${saved.id} received and queued (position ${queue.count}).\n`);
  render();
  if (!initial) showToast(`Email #${saved.id} received at slot ${queue.rear}.`, 'success');
  return true;
}

function render() {
  $('#safe-count').textContent = queue.safeCount;
  $('#suspicious-count').textContent = queue.suspiciousCount;
  $('#phishing-count').textContent = queue.phishingCount;
  $('#pending-count').textContent = queue.count;
  $('#front-value').textContent = queue.front;
  $('#rear-value').textContent = queue.rear;
  $('#count-value').textContent = queue.count;
  $('#empty-value').textContent = String(queue.isEmpty());
  $('#full-value').textContent = String(queue.isFull());
  $('#ring-center-count').innerHTML = `${String(queue.count).padStart(2, '0')}<span>/10</span>`;
  $('#pending-label').textContent = `${String(queue.count).padStart(2, '0')} / 10`;
  renderSlots();
  renderPending();
  renderReport();
}

function renderSlots() {
  const ring = $('#ring-slots');
  const memory = $('#memory-slots');
  ring.replaceChildren();
  memory.replaceChildren();
  const stage = $('.ring-stage');
  const radius = Math.min(stage.clientWidth, stage.clientHeight) * .38;
  for (let i = 0; i < MAX; i++) {
    const email = queue.slots[i];
    const front = !queue.isEmpty() && queue.front === i;
    const rear = !queue.isEmpty() && queue.rear === i;
    const classes = `${email ? 'occupied' : 'empty'}${front ? ' front' : ''}${rear ? ' rear' : ''}`;
    const slot = document.createElement('button');
    slot.type = 'button';
    slot.className = `ring-slot ${classes}`;
    slot.style.left = `calc(50% + ${Math.cos(-Math.PI / 2 + 2 * Math.PI * i / MAX) * radius}px)`;
    slot.style.top = `calc(50% + ${Math.sin(-Math.PI / 2 + 2 * Math.PI * i / MAX) * radius}px)`;
    slot.setAttribute('aria-label', `Slot ${i}: ${email ? `email ${email.id}, ${email.subject}` : 'empty'}${front ? ', front' : ''}${rear ? ', rear' : ''}`);
    slot.innerHTML = `<span class="slot-top"><span class="slot-index">IDX ${String(i).padStart(2, '0')}</span><span class="pointer-flags">${front ? '<b class="f">F</b>' : ''}${rear ? '<b class="r">R</b>' : ''}</span></span><span class="slot-id">${email ? `#${String(email.id).padStart(3, '0')}` : 'EMPTY'}</span>`;
    slot.addEventListener('click', () => email ? inspect(email, i) : showToast(`Slot ${i} is empty.`, 'success'));
    ring.append(slot);

    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = `memory-slot ${classes}`;
    cell.setAttribute('aria-label', slot.getAttribute('aria-label'));
    cell.innerHTML = `<span class="index">[${i}] ${front ? 'F' : ''}${rear ? 'R' : ''}</span><span class="value">${email ? `#${email.id}` : '—'}</span>`;
    cell.addEventListener('click', () => email ? inspect(email, i) : showToast(`Slot ${i} is empty.`, 'success'));
    memory.append(cell);
  }
}

function renderPending() {
  const list = $('#pending-list');
  list.replaceChildren();
  if (queue.isEmpty()) {
    list.innerHTML = '<div class="empty-state"><div class="empty-glyph">∅</div><strong>Inbox queue is empty</strong><p>Use the receive form to add an email to the rear.</p></div>';
    return;
  }
  queue.pending().forEach(({ index, email }, order) => {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'pending-row';
    row.innerHTML = `<span class="pending-order">${String(order + 1).padStart(2, '0')}</span><span class="pending-main"><strong>${escapeHtml(email.subject || '(No subject)')}</strong><span>#${email.id} · ${escapeHtml(email.sender)}</span></span><span class="pending-location">[${index}]</span>`;
    row.addEventListener('click', () => inspect(email, index));
    list.append(row);
  });
}

function highlighted(text, words) {
  if (!words.length) return escapeHtml(text);
  const pattern = new RegExp(`(${words.join('|')})`, 'gi');
  return text.split(pattern).map((part) => words.some((word) => word.toLowerCase() === part.toLowerCase()) ? `<mark>${escapeHtml(part)}</mark>` : escapeHtml(part)).join('');
}

function renderReport() {
  const host = $('#report-content');
  if (!latestReport) {
    $('#report-label').textContent = 'NO REPORT';
    host.innerHTML = '<div class="empty-state"><div class="empty-glyph">↯</div><strong>No assessment yet</strong><p>Assess the next email to see a point-by-point threat report.</p></div>';
    return;
  }
  const report = latestReport;
  const tone = report.verdict.toLowerCase();
  $('#report-label').textContent = `EMAIL #${String(report.email.id).padStart(3, '0')}`;
  host.innerHTML = `<div class="report-top"><div class="report-email"><span class="report-id">THREAT REPORT / #${report.email.id}</span><h4 title="${escapeHtml(report.email.subject)}">${escapeHtml(report.email.subject || '(No subject)')}</h4><p title="${escapeHtml(report.email.sender)}">${escapeHtml(report.email.sender)}</p></div><span class="verdict-badge ${tone}">${report.verdict}</span></div><div class="score-block"><strong>${report.score}</strong><span>/ 100${report.rawScore > 100 ? ` · CAPPED FROM ${report.rawScore}` : ''}</span></div><div class="score-track"><div class="score-fill ${tone}" style="width:${report.score}%"></div></div><div class="breakdown"><span>Keyword matches (${report.matchedKeywords.length} × 10)</span><strong>+${report.matchedKeywords.length * 10}</strong><span>Insecure http:// link</span><strong>+${report.insecureLink ? 15 : 0}</strong><span>${escapeHtml(report.senderReason || 'Sender verification')}</span><strong>+${report.senderReason ? 20 : 0}</strong><span class="total">FINAL SCORE</span><strong class="total">${report.score} / 100</strong></div>${report.matchedKeywords.length ? `<div class="keyword-chips">${report.matchedKeywords.map((word) => `<span>${word}</span>`).join('')}</div>` : ''}<div class="report-preview"><span>SUBJECT + BODY / MATCHES HIGHLIGHTED</span><p>${highlighted(report.email.subject, report.matchedKeywords)}<br>${highlighted(report.email.body, report.matchedKeywords)}</p></div>`;
}

function inspect(email, index) {
  const dialog = $('#email-dialog');
  $('#dialog-title').textContent = `Email #${email.id}`;
  $('#dialog-content').innerHTML = `<div class="dialog-index">QUEUE SLOT [${index}]${queue.front === index && !queue.isEmpty() ? ' · NEXT TO ASSESS' : ''}</div><div class="dialog-field"><span>FROM</span><p>${escapeHtml(email.sender)}</p></div><div class="dialog-field"><span>SUBJECT</span><p>${escapeHtml(email.subject || '(No subject)')}</p></div><div class="dialog-field"><span>MESSAGE BODY</span><p>${escapeHtml(email.body || '(Empty body)')}</p></div>`;
  dialog.showModal();
}

function printReport(report) {
  return `\n----- THREAT REPORT : Email #${report.email.id} -----\nFrom    : ${report.email.sender}\nSubject : ${report.email.subject}\nKeywords: ${report.matchedKeywords.length} suspicious\nScore   : ${report.score} / 100\nVerdict : ${report.verdict}\n`;
}

function assessOne() {
  if (queue.isEmpty()) {
    command(2, `${underflow}\n`);
    showToast(underflow);
    return;
  }
  latestReport = queue.assessNext();
  command(2, printReport(latestReport));
  render();
  $('#report-title').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function peekNext() {
  if (queue.isEmpty()) {
    command(3, `${underflow}\n`);
    showToast(underflow);
    return;
  }
  const email = queue.peek();
  command(3, `Next to assess -> #${email.id} from ${email.sender} | ${email.subject}\n`);
  inspect(email, queue.front);
}

function displayPending() {
  let output = `\n===== PENDING EMAILS (${queue.count}/${MAX}) =====\n`;
  if (queue.isEmpty()) output += 'Queue is empty.\n';
  else queue.pending().forEach(({ email }, index) => { output += `${index + 1}. #${String(email.id).padEnd(3)} ${email.sender.padEnd(25)} ${email.subject}\n`; });
  command(4, output);
  $('#pending-panel').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function setBusy(value) {
  busy = value;
  ['#assess-next', '#peek-next', '#display-pending', '#assess-all', '#show-summary', '#receive-form button[type="submit"]'].forEach((selector) => { $(selector).disabled = value; });
  $('#assess-all').querySelector('span:nth-child(2)').firstChild.textContent = value ? 'Assessing…' : 'Assess all';
}

async function assessAll() {
  if (busy) return;
  if (queue.isEmpty()) {
    command(5, `${underflow}\n`);
    showToast(underflow);
    return;
  }
  const token = ++runToken;
  setBusy(true);
  appendTerminal('Enter your choice: 5\n');
  const instant = $('#instant-mode').checked || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  while (!queue.isEmpty() && token === runToken) {
    latestReport = queue.assessNext();
    appendTerminal(printReport(latestReport));
    render();
    if (!instant && !queue.isEmpty()) await new Promise((resolve) => setTimeout(resolve, 520));
  }
  if (token === runToken) {
    setBusy(false);
    showToast('All pending emails assessed.', 'success');
  }
}

function showSummary() {
  command(6, `\n===== SESSION SUMMARY =====\nSafe       : ${queue.safeCount}\nSuspicious : ${queue.suspiciousCount}\nPhishing   : ${queue.phishingCount}\nPending    : ${queue.count}\n`);
  $('.terminal-panel').classList.remove('collapsed');
  $('#toggle-terminal').textContent = 'Hide';
  $('#toggle-terminal').setAttribute('aria-expanded', 'true');
  $('#terminal-output').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function resetSession() {
  runToken++;
  setBusy(false);
  queue.reset();
  latestReport = null;
  terminal = menu;
  $('#terminal-output').textContent = terminal;
  $('#receive-form').reset();
  $('#form-error').textContent = '';
  render();
  showToast('Session reset. All ten slots are empty.', 'success');
}

function loadWrapDemo() {
  resetSession();
  for (let i = 0; i < MAX; i++) {
    receive({ sender: `demo${i + 1}@college.edu`, subject: `Queue test ${i + 1}`, body: 'Routine inbox message.' }, { initial: true });
  }
  for (let i = 0; i < 8; i++) {
    latestReport = queue.assessNext();
    command(2, printReport(latestReport));
  }
  receive(SAMPLE_EMAILS[0], { initial: true });
  receive(SAMPLE_EMAILS[1], { initial: true });
  render();
  showToast('Wrap-around ready: front = 8, rear = 1. New mail occupies slots 0 and 1.', 'success');
}

function syntaxLine(line) {
  const tokenPattern = /(\/\*.*?\*\/|\/\/.*$|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|#[a-z]+|\b(?:int|char|const|struct|void|return|if|else|while|for|do|switch|case|break|sizeof|NULL)\b|\b\d+\b)/gm;
  let cursor = 0;
  let result = '';
  for (const match of line.matchAll(tokenPattern)) {
    result += escapeHtml(line.slice(cursor, match.index));
    const token = match[0];
    const kind = token.startsWith('/*') || token.startsWith('//') ? 'comment' : token.startsWith('"') || token.startsWith("'") ? 'string' : token.startsWith('#') ? 'preproc' : /^\d/.test(token) ? 'number' : 'keyword';
    result += `<span class="token-${kind}">${escapeHtml(token)}</span>`;
    cursor = match.index + token.length;
  }
  return result + escapeHtml(line.slice(cursor));
}

async function loadSource() {
  if (sourceText !== null) return;
  try {
    const response = await fetch('source/phishguard.c');
    if (!response.ok) throw new Error('Source file unavailable');
    sourceText = (await response.text()).trimEnd();
    $('#source-code').innerHTML = sourceText.split('\n').map((line, index) => `<div class="source-line"><span class="line-number">${index + 1}</span><span class="line-text">${syntaxLine(line)}</span></div>`).join('');
  } catch {
    $('#source-code').textContent = 'Unable to load source. Run the app with npm start.';
  }
}

async function copyText(value, label) {
  try {
    await navigator.clipboard.writeText(value);
    showToast(`${label} copied to clipboard.`, 'success');
  } catch {
    showToast('Clipboard access is unavailable.');
  }
}

document.querySelectorAll('.nav-tab').forEach((button) => button.addEventListener('click', () => {
  const id = button.dataset.tab;
  document.querySelectorAll('.nav-tab').forEach((tab) => tab.classList.toggle('active', tab === button));
  document.querySelectorAll('.tab-panel').forEach((panel) => panel.classList.toggle('active', panel.id === id));
  if (id === 'source') loadSource();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}));

SAMPLE_EMAILS.forEach((email, index) => {
  const button = document.createElement('button');
  button.className = 'preset';
  button.type = 'button';
  button.textContent = email.label;
  button.addEventListener('click', () => {
    $('#sender').value = email.sender;
    $('#subject').value = email.subject;
    $('#body').value = email.body;
    $('#form-error').textContent = '';
    showToast(`Preset ${index + 1} loaded. Receive it when ready.`, 'success');
  });
  $('#presets').append(button);
});

$('#receive-form').addEventListener('submit', (event) => {
  event.preventDefault();
  if (busy) return;
  $('#form-error').textContent = '';
  const email = { sender: $('#sender').value, subject: $('#subject').value, body: $('#body').value };
  if (receive(email)) $('#receive-form').reset();
});
$('#assess-next').addEventListener('click', assessOne);
$('#peek-next').addEventListener('click', peekNext);
$('#display-pending').addEventListener('click', displayPending);
$('#assess-all').addEventListener('click', assessAll);
$('#show-summary').addEventListener('click', showSummary);
$('#reset-session').addEventListener('click', resetSession);
$('#wrap-demo').addEventListener('click', loadWrapDemo);
$('#close-dialog').addEventListener('click', () => $('#email-dialog').close());
$('#email-dialog').addEventListener('click', (event) => { if (event.target === $('#email-dialog')) $('#email-dialog').close(); });
$('#copy-terminal').addEventListener('click', () => copyText(terminal, 'Terminal output'));
$('#copy-source').addEventListener('click', async () => { await loadSource(); if (sourceText) copyText(sourceText, 'C source'); });
$('#toggle-terminal').addEventListener('click', () => {
  const collapsed = $('.terminal-panel').classList.toggle('collapsed');
  $('#toggle-terminal').textContent = collapsed ? 'Show' : 'Hide';
  $('#toggle-terminal').setAttribute('aria-expanded', String(!collapsed));
});
new ResizeObserver(() => renderSlots()).observe($('.ring-stage'));

$('#terminal-output').textContent = terminal;
receive(SAMPLE_EMAILS[0], { initial: true });
receive(SAMPLE_EMAILS[1], { initial: true });
