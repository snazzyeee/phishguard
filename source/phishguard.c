#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>
#define MAX 10

typedef struct {
    int id;
    char sender[50], subject[100], body[200];
} Email;

Email q[MAX];
int front = 0, rear = -1, count = 0, nextId = 1;
int totals[3] = {0};  /* safe, suspicious, phishing */
const char *words[] = {
    "urgent", "verify", "password", "suspended", "click", "winner",
    "lottery", "otp", "bank", "login", "prize", "confirm"
};

void input(const char *prompt, char *s, int size) {
    printf("%s", prompt);
    if (!fgets(s, size, stdin)) { s[0] = 0; return; }
    s[strcspn(s, "\n")] = 0;
}

void lower(char *s) {
    for (; *s; s++) *s = (char)tolower((unsigned char)*s);
}

void enqueue(Email e) {
    rear = (rear + 1) % MAX;
    q[rear] = e; count++;
}

Email dequeue(void) {
    Email e = q[front];
    front = (front + 1) % MAX;
    count--; return e;
}

int scoreEmail(Email e, int *hits) {
    char text[320], sender[50], *ext;
    int score = 0;
    snprintf(text, sizeof(text), "%s %s", e.subject, e.body);
    strcpy(sender, e.sender);
    lower(text); lower(sender);
    *hits = 0;
    for (int i = 0; i < 12; i++)
        if (strstr(text, words[i])) { score += 10; (*hits)++; }
    if (strstr(text, "http://")) score += 15;
    if (!strchr(sender, '@')) score += 20;
    else {
        ext = strrchr(sender, '.');
        if (ext && (!strcmp(ext, ".xyz") || !strcmp(ext, ".top") ||
                    !strcmp(ext, ".tk"))) score += 20;
    }
    return score > 100 ? 100 : score;
}

void receive(void) {
    Email e = {0};
    if (count == MAX) { puts("Inbox queue is full (overflow)."); return; }
    input("Enter sender address: ", e.sender, sizeof(e.sender));
    input("Enter subject: ", e.subject, sizeof(e.subject));
    input("Enter message body: ", e.body, sizeof(e.body));
    if (!e.sender[0]) { puts("Sender cannot be empty."); return; }
    e.id = nextId++; enqueue(e);
    printf("Email #%d received and queued (position %d).\n", e.id, count);
}

void report(Email e) {
    int hits, s = scoreEmail(e, &hits);
    const char *name = s >= 60 ? "PHISHING" :
                       s >= 30 ? "SUSPICIOUS" : "SAFE";
    totals[s >= 60 ? 2 : s >= 30 ? 1 : 0]++;
    printf("\n----- THREAT REPORT : Email #%d -----\n", e.id);
    printf("From    : %s\nSubject : %s\n", e.sender, e.subject);
    printf("Keywords: %d suspicious\nScore   : %d / 100\n", hits, s);
    printf("Verdict : %s\n", name);
}

void assessNext(void) {
    if (!count) puts("No emails waiting (queue is empty).");
    else report(dequeue());
}

void assessAll(void) {
    if (!count) puts("No emails waiting (queue is empty).");
    while (count) report(dequeue());
}

void peek(void) {
    if (!count) { puts("No emails waiting (queue is empty)."); return; }
    printf("Next to assess -> #%d from %s | %s\n",
           q[front].id, q[front].sender, q[front].subject);
}

void display(void) {
    printf("\n===== PENDING EMAILS (%d/%d) =====\n", count, MAX);
    if (!count) { puts("Queue is empty."); return; }
    for (int i = 0; i < count; i++) {
        Email e = q[(front + i) % MAX];
        printf("%d. #%-3d %-25s %s\n", i + 1, e.id, e.sender, e.subject);
    }
}

void summary(void) {
    printf("\n===== SESSION SUMMARY =====\n");
    printf("Safe       : %d\nSuspicious : %d\n", totals[0], totals[1]);
    printf("Phishing   : %d\nPending    : %d\n", totals[2], count);
}

int main(void) {
    char line[16]; int choice;
    do {
        puts("\n===== PHISHGUARD =====\n1. Receive Email (Enqueue)"
             "\n2. Assess Next Email (Dequeue)\n3. Peek Next Email"
             "\n4. Display Pending Emails\n5. Assess All Pending Emails"
             "\n6. Session Summary\n0. Exit");
        input("Enter your choice: ", line, sizeof(line));
        choice = atoi(line);
        switch (choice) {
            case 1: receive(); break;
            case 2: assessNext(); break;
            case 3: peek(); break;
            case 4: display(); break;
            case 5: assessAll(); break;
            case 6: summary(); break;
            case 0: puts("Exiting PhishGuard."); break;
            default: puts("Invalid choice.");
        }
    } while (choice != 0);
    return 0;
}
