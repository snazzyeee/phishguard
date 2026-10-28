#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <ctype.h>
#define MAX 10        /* capacity of the circular queue */
#define KEYWORDS 12   /* number of suspicious keywords  */
struct Email {
    int  id;
    char sender[50];
    char subject[100];
    char body[200];
};
/* ---------- Circular queue (the data structure used) ---------- */
struct Email queue[MAX];
int front = 0, rear = -1, count = 0;
int nextId = 1;
int safeCount = 0, suspiciousCount = 0, phishingCount = 0;
const char *keyword[KEYWORDS] = {
    "urgent", "verify", "password", "suspended", "click", "winner",
    "lottery", "otp", "bank", "login", "prize", "confirm"
};
int isEmpty() { return count == 0; }
int isFull()  { return count == MAX; }
/* ENQUEUE: add an email at the rear of the queue */
void enqueue(struct Email e) {
    rear = (rear + 1) % MAX;       /* wrap around */
    queue[rear] = e;
    count++;
}
/* DEQUEUE: remove and return the email at the front */
struct Email dequeue() {
    struct Email e = queue[front];
    front = (front + 1) % MAX;     /* wrap around */
    count--;
    return e;
}
/* Read a full line (spaces allowed) */
void readLine(char s[], int size) {
    if (fgets(s, size, stdin) == NULL) { s[0] = '\0'; return; }
    s[strcspn(s, "\n")] = '\0';
}
void toLowerStr(char dest[], const char src[]) {
    int i;
    for (i = 0; src[i] != '\0'; i++)
        dest[i] = tolower((unsigned char)src[i]);
    dest[i] = '\0';
}
int endsWith(const char s[], const char tail[]) {
    int ls = strlen(s), lt = strlen(tail);
    return ls >= lt && strcmp(s + ls - lt, tail) == 0;
}
/* Threat score (0-100). *hits = number of suspicious keywords found */
int assess(struct Email *e, int *hits) {
    char text[320], sender[50];
    char *at;
    int score = 0, i;
    *hits = 0;
    snprintf(text, sizeof(text), "%s %s", e->subject, e->body);
    toLowerStr(text, text);
    toLowerStr(sender, e->sender);
    for (i = 0; i < KEYWORDS; i++) {         /* +10 per keyword */
        if (strstr(text, keyword[i])) {
            score += 10;
            (*hits)++;
        }
    }
    if (strstr(text, "http://"))             /* insecure link */
        score += 15;
    at = strchr(sender, '@');
    if (at == NULL)                          /* malformed sender */
        score += 20;
    else if (endsWith(at, ".xyz") || endsWith(at, ".top") || endsWith(at, ".tk"))
        score += 20;                         /* risky domain */
    return score > 100 ? 100 : score;
}
const char *verdict(int score) {
    if (score >= 60) return "PHISHING";
    if (score >= 30) return "SUSPICIOUS";
    return "SAFE";
}
void receiveEmail() {
    struct Email e;
    if (isFull()) {
        printf("Inbox queue is full (overflow). Assess some emails first.\n");
        return;
    }
    printf("Enter sender address: ");
    readLine(e.sender, sizeof(e.sender));
    printf("Enter subject: ");
    readLine(e.subject, sizeof(e.subject));
    printf("Enter message body: ");
    readLine(e.body, sizeof(e.body));
    if (strlen(e.sender) == 0) {
        printf("Sender cannot be empty.\n");
        return;
    }
    e.id = nextId++;
    enqueue(e);
    printf("Email #%d received and queued (position %d).\n", e.id, count);
}
void report(struct Email e) {
    int hits, score = assess(&e, &hits);
    const char *v = verdict(score);
    printf("\n----- THREAT REPORT : Email #%d -----\n", e.id);
    printf("From    : %s\n", e.sender);
    printf("Subject : %s\n", e.subject);
    printf("Keywords: %d suspicious\n", hits);
    printf("Score   : %d / 100\n", score);
    printf("Verdict : %s\n", v);
    if (score >= 60)      phishingCount++;
    else if (score >= 30) suspiciousCount++;
    else                  safeCount++;
}
/* Assess the email at the FRONT of the queue (first come, first served) */
void assessNext() {
    if (isEmpty()) {
        printf("No emails waiting (queue is empty).\n");
        return;
    }
    report(dequeue());
}
void assessAll() {
    if (isEmpty()) {
        printf("No emails waiting (queue is empty).\n");
        return;
    }
    while (!isEmpty())
        report(dequeue());
}
void peekNext() {
    if (isEmpty()) {
        printf("No emails waiting (queue is empty).\n");
        return;
    }
    printf("Next to assess -> #%d from %s | %s\n",
           queue[front].id, queue[front].sender, queue[front].subject);
}
void displayQueue() {
    int i;
    printf("\n===== PENDING EMAILS (%d/%d) =====\n", count, MAX);
    if (isEmpty()) {
        printf("Queue is empty.\n");
        return;
    }
    for (i = 0; i < count; i++) {
        struct Email *e = &queue[(front + i) % MAX];
        printf("%d. #%-3d %-25s %s\n", i + 1, e->id, e->sender, e->subject);
    }
}
void summary() {
    printf("\n===== SESSION SUMMARY =====\n");
    printf("Safe       : %d\n", safeCount);
    printf("Suspicious : %d\n", suspiciousCount);
    printf("Phishing   : %d\n", phishingCount);
    printf("Pending    : %d\n", count);
}
int main() {
    char line[10];
    int choice;
    do {
        printf("\n===== PHISHGUARD =====\n");
        printf("1. Receive Email (Enqueue)\n");
        printf("2. Assess Next Email (Dequeue)\n");
        printf("3. Peek Next Email\n");
        printf("4. Display Pending Emails\n");
        printf("5. Assess All Pending Emails\n");
        printf("6. Session Summary\n");
        printf("0. Exit\n");
        printf("Enter your choice: ");
        readLine(line, sizeof(line));
        choice = atoi(line);
        switch (choice) {
            case 1: receiveEmail(); break;
            case 2: assessNext();   break;
            case 3: peekNext();     break;
            case 4: displayQueue(); break;
            case 5: assessAll();    break;
            case 6: summary();      break;
            case 0: printf("Exiting PhishGuard.\n"); break;
            default: printf("Invalid choice.\n");
        }
    } while (choice != 0);
    return 0;
}
