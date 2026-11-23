# Streak Jar

Streak Jar is the digital version of the physical "marble jar" habit method.
When a habit is completed, a colorful marble drops into the jar; when the jar is full, a celebration screen is triggered.

Streak rule: a streak counts consecutive local days with a marble, ending today — or yesterday if today has no marble yet, so a streak stays alive until the day ends; impossible calendar dates (e.g. `2026-02-30`) never count.

## Daily reminders

Turn on **Daily reminder** from a jar’s page and allow notifications when your
browser asks. Reminders are off for new jars unless you opt in. The default is
**20:00** in your device’s local time; change it in **Settings → Reminders**.
An unfinished jar that still needs today’s marble can send one reminder that
day. Click the notification to open that jar.

Reminders work only while a Streak Jar tab is open and able to run in a
supported browser. If the tab was paused at reminder time, it can catch up
later that same day. They do not run with all Streak Jar tabs closed.
Preferences stay in this browser and aren't included in backups.

To check native delivery locally, run `pnpm dev` and open
`http://localhost:5050/streak-jar/` in a browser that supports notifications,
service workers, and Web Locks. Create a first jar without adding a marble,
allow notifications, and set the reminder time a minute ahead. Leave a tab open
until the notification is delivered, close that tab, then click the notification.
The correct jar should open with focus on its add-marble action.
To exercise the existing-tab path instead, open the jar from the home page
before clicking the notification. The open jar should receive focus without
opening another tab.

## Status

This repository is currently in its initial setup phase.
