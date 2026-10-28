import { CircularQueue, MAX } from './engine.js';

const queue = new CircularQueue();
const form = document.querySelector('#receive-form');
const output = document.querySelector('#output');
const pendingCount = document.querySelector('#pending-count');
const underflow = 'No emails waiting (queue is empty).';

function print(choice, message) {
  output.textContent += (output.textContent ? '\n\n' : '') + 'Enter your choice: ' + choice + '\n' + message;
  output.scrollTop = output.scrollHeight;
}

function updateCount() {
  pendingCount.textContent = queue.count;
}

function report(result) {
  return [
    '----- THREAT REPORT : Email #' + result.email.id + ' -----',
    'From    : ' + result.email.sender,
    'Subject : ' + result.email.subject,
    'Keywords: ' + result.matchedKeywords.length + ' suspicious',
    'Score   : ' + result.score + ' / 100',
    'Verdict : ' + result.verdict,
  ].join('\n');
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (queue.isFull()) {
    print(1, 'Inbox queue is full (overflow).');
    output.scrollIntoView({ block: 'nearest' });
    return;
  }

  const sender = form.elements.sender.value;
  if (!sender) {
    print(1, 'Sender cannot be empty.');
    form.elements.sender.reportValidity();
    return;
  }

  const email = queue.enqueue({
    sender,
    subject: form.elements.subject.value,
    body: form.elements.body.value,
  });
  print(1, 'Email #' + email.id + ' received and queued (position ' + queue.count + ').');
  updateCount();
  form.reset();
  form.elements.sender.focus();
});

document.querySelector('#operations').addEventListener('click', (event) => {
  const button = event.target.closest('button[data-choice]');
  if (!button) return;

  switch (button.dataset.choice) {
    case '2': {
      const result = queue.assessNext();
      print(2, result ? report(result) : underflow);
      break;
    }
    case '3': {
      const email = queue.peek();
      print(3, email ? 'Next to assess -> #' + email.id + ' from ' + email.sender + ' | ' + email.subject : underflow);
      break;
    }
    case '4': {
      const rows = queue.pending().map(({ email }, index) =>
        (index + 1) + '. #' + String(email.id).padEnd(3) + ' ' + email.sender.padEnd(25) + ' ' + email.subject
      );
      print(4, '===== PENDING EMAILS (' + queue.count + '/' + MAX + ') =====\n' + (rows.length ? rows.join('\n') : 'Queue is empty.'));
      break;
    }
    case '5': {
      if (queue.isEmpty()) {
        print(5, underflow);
        break;
      }
      const reports = [];
      while (!queue.isEmpty()) reports.push(report(queue.assessNext()));
      print(5, reports.join('\n\n'));
      break;
    }
    case '6':
      print(6, [
        '===== SESSION SUMMARY =====',
        'Safe       : ' + queue.safeCount,
        'Suspicious : ' + queue.suspiciousCount,
        'Phishing   : ' + queue.phishingCount,
        'Pending    : ' + queue.count,
      ].join('\n'));
      break;
    case '0':
      print(0, 'Exiting PhishGuard.');
      document.querySelectorAll('button, input, textarea').forEach((control) => { control.disabled = true; });
      break;
  }

  updateCount();
});
