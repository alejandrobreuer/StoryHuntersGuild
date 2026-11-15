-- 064: profile picture uploaded by the player.
--
-- Shown in the diamond on the profile's character card instead of the rank
-- emblem. Files live in the public shg-media bucket under avatars/<user id>/.
-- Null = show the rank emblem, as before.

alter table shg_users
  add column if not exists avatar_url text;
