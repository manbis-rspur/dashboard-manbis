-- ============================================================
-- 45. TUGAS DADAKAN DAN ASALNYA
--
-- Instruksi mendadak dari atasan datang lewat WhatsApp, sering di
-- luar jam kerja, dan hilang di bawah pesan lain sebelum sempat
-- dicatat. Sesudah ini ia bisa masuk lewat bot Telegram — disalin
-- sekali, langsung jadi tugas.
--
-- Dua kolom yang ditambahkan, dan keduanya bukan hiasan:
--
--   'dadakan' membuat rekap bulanan bisa menjawab pertanyaan yang
--   selama ini tidak terjawab: berapa banyak pekerjaan terencana
--   yang tergeser oleh yang mendadak. Tanpa angka itu, "kenapa
--   yang terjadwal tidak selesai" hanya bisa dijawab dengan
--   perasaan.
--
--   'sumber' dipakai /batal di bot: yang boleh dibatalkan hanya
--   tugas yang memang dibuat bot itu sendiri, bukan tugas yang
--   diketik sendiri di web atau dititipkan Koordinator.
--
-- Jalankan di Supabase -> SQL Editor -> Run
-- Aman dijalankan berulang kali.
-- ============================================================

alter table tugas
    add column if not exists dadakan boolean not null default false,
    add column if not exists sumber  text    not null default 'web';

alter table tugas drop constraint if exists tugas_sumber_check;
alter table tugas add constraint tugas_sumber_check
    check (sumber in ('web', 'telegram', 'titipan'));

create index if not exists idx_tugas_sumber on tugas(untuk, sumber, dibuat_pada desc);


-- ============================================================
-- CEK
-- ============================================================
select sumber, dadakan, count(*) from tugas group by sumber, dadakan;
