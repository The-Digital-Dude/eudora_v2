-- Broadcasts have never been delivered by this system.
--
-- `CommunicationService.createBroadcast` writes a row and returns. There is no
-- SMS integration anywhere in the repository, and `EmailService.sendMail` is a
-- console mock. Despite that, `status` defaulted to 'SENT' and the composer
-- posted a random `recipientCount` (Math.random() * 50 + 12) that the log then
-- displayed as fact.
--
-- The default becomes 'RECORDED' — composed and stored, not delivered.
ALTER TABLE "broadcasts" ALTER COLUMN "status" SET DEFAULT 'RECORDED';

-- Backfill: every existing row asserts a delivery that did not occur, so the
-- claim is corrected rather than left standing. Restricted to the fabricated
-- state ('SENT'), so if a real dispatcher is ever added and writes genuine
-- SENT/FAILED rows, re-running this cannot rewrite real history.
UPDATE "broadcasts"
SET "status" = 'RECORDED', "recipientCount" = 0
WHERE "status" = 'SENT';
