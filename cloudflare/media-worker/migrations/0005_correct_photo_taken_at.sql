-- Correct photos whose upload/export modification time was stored instead of
-- the original EXIF capture time. The previous value remains in each WHERE
-- clause so this migration fails closed if a row has already been edited.

UPDATE media SET taken_at = '2026-08-15T12:35:21Z' WHERE id = 'img-1786881355904-4224a9297d990792' AND taken_at = '2026-08-16T11:53:29.155Z';
UPDATE media SET taken_at = '2026-08-15T12:35:30Z' WHERE id = 'img-1786881354661-70852f2960f3b6c7' AND taken_at = '2026-08-16T11:53:29.151Z';
UPDATE media SET taken_at = '2026-08-15T12:41:12Z' WHERE id = 'img-1786881353346-e4144f1ee35a9fc7' AND taken_at = '2026-08-16T11:53:29.143Z';
UPDATE media SET taken_at = '2026-08-15T12:41:42Z' WHERE id = 'img-1786881352060-ccd42720e4da40d4' AND taken_at = '2026-08-16T11:53:29.135Z';
UPDATE media SET taken_at = '2026-08-15T12:41:51Z' WHERE id = 'img-1786881350977-87262cf0d17db702' AND taken_at = '2026-08-16T11:53:29.127Z';
UPDATE media SET taken_at = '2026-08-15T12:41:57Z' WHERE id = 'img-1786881349452-14e40d7e52aabfb7' AND taken_at = '2026-08-16T11:53:29.111Z';
UPDATE media SET taken_at = '2026-08-15T12:44:31Z' WHERE id = 'img-1786881347784-e115c9133bdce36e' AND taken_at = '2026-08-16T11:53:29.099Z';
UPDATE media SET taken_at = '2026-08-15T12:51:51Z' WHERE id = 'img-1786881346855-a4f0f7e85c62b88c' AND taken_at = '2026-08-16T11:53:29.091Z';
UPDATE media SET taken_at = '2026-08-15T12:54:51Z' WHERE id = 'img-1786881345357-d35f9b70b6c3c458' AND taken_at = '2026-08-16T11:53:29.083Z';
UPDATE media SET taken_at = '2026-08-15T13:20:53Z' WHERE id = 'img-1786881343988-f1d9f63a4fcc718b' AND taken_at = '2026-08-16T11:53:29.075Z';
UPDATE media SET taken_at = '2026-08-15T13:37:36Z' WHERE id = 'img-1786881342800-1b52b323bfc71a5a' AND taken_at = '2026-08-16T11:53:29.067Z';
UPDATE media SET taken_at = '2026-08-15T13:43:46Z' WHERE id = 'img-1786881341541-6b0bf784f7589e25' AND taken_at = '2026-08-16T11:53:29.059Z';
UPDATE media SET taken_at = '2026-08-15T14:08:54Z' WHERE id = 'img-1786881339553-f1c9871f6a8a66dd' AND taken_at = '2026-08-16T11:53:29.051Z';
UPDATE media SET taken_at = '2026-08-15T14:08:56Z' WHERE id = 'img-1786881337801-26c8a15abd5180fd' AND taken_at = '2026-08-16T11:53:29.043Z';
UPDATE media SET taken_at = '2026-08-15T14:08:57Z' WHERE id = 'img-1786881334364-12802c51ea3383d8' AND taken_at = '2026-08-16T11:53:29.035Z';
UPDATE media SET taken_at = '2026-08-15T14:08:58Z' WHERE id = 'img-1786881331996-57dabda33c44633d' AND taken_at = '2026-08-16T11:53:29.023Z';
UPDATE media SET taken_at = '2026-08-15T14:08:59Z' WHERE id = 'img-1786881329461-4ec2d4b823b36d52' AND taken_at = '2026-08-16T11:53:29.015Z';
UPDATE media SET taken_at = '2026-08-15T14:09:00Z' WHERE id = 'img-1786881327665-05b858858e42614d' AND taken_at = '2026-08-16T11:53:29.003Z';
UPDATE media SET taken_at = '2026-08-15T14:09:00Z' WHERE id = 'img-1786881325818-105339b376e6cb86' AND taken_at = '2026-08-16T11:53:28.995Z';
UPDATE media SET taken_at = '2026-08-15T14:09:02Z' WHERE id = 'img-1786881324387-89283735fd961c7b' AND taken_at = '2026-08-16T11:53:28.979Z';
UPDATE media SET taken_at = '2026-08-15T14:09:04Z' WHERE id = 'img-1786881322490-f256f50e87aa6c8a' AND taken_at = '2026-08-16T11:53:28.963Z';
UPDATE media SET taken_at = '2026-08-15T14:09:07Z' WHERE id = 'img-1786881320268-18bf6a80f9cc9e7f' AND taken_at = '2026-08-16T11:53:28.943Z';
UPDATE media SET taken_at = '2026-08-15T14:09:18Z' WHERE id = 'img-1786881318951-e37eb91db5ffe3ae' AND taken_at = '2026-08-16T11:53:28.931Z';
UPDATE media SET taken_at = '2026-08-15T14:09:25Z' WHERE id = 'img-1786881317578-94865a0b78531f3b' AND taken_at = '2026-08-16T11:53:28.919Z';
