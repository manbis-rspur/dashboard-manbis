-- ============================================================
-- 46. PENANGKAL KIRIMAN GANDA DARI TELEGRAM
--
-- Menyusun kalender butuh setengah menit lebih. Telegram tidak
-- menunggu selama itu: bila belum dijawab, ia MENGIRIM ULANG pesan
-- yang sama, berkali-kali, sampai dijawab.
--
-- Tanpa penangkal, satu perintah bisa menghasilkan tiga kalender
-- yang isinya hampir sama di Draf Bersama — persis "draf jadi
-- semak" yang justru ingin dihindari.
--
-- Caranya: nomor tiap pesan dicatat LEBIH DULU, sebelum
-- pekerjaannya dimulai. Nomor yang sudah tercatat berarti pesan
-- itu sedang atau sudah dikerjakan, dan kiriman ulangnya diabaikan.
-- Pencatatan dan pemeriksaannya jadi satu langkah, sehingga dua
-- kiriman yang datang berbarengan pun tidak bisa lolos berdua.
--
-- Tabel ini bukan milik pengguna mana pun dan tidak berisi apa-apa
-- selain nomor. Tidak ada kebijakan baca-tulis sama sekali: yang
-- memakainya cuma webhook, yang berjalan dengan kunci layanan.
--
-- Jalankan di Supabase -> SQL Editor -> Run
-- Aman dijalankan berulang kali.
-- ============================================================

create table if not exists telegram_pesan (
    update_id bigint primary key,
    pada      timestamptz not null default now()
);

create index if not exists idx_telegram_pesan on telegram_pesan(pada);

alter table telegram_pesan enable row level security;


-- ------------------------------------------------------------
-- Membersihkan catatan lama.
--
-- Telegram tidak pernah mengirim ulang pesan yang sudah lewat
-- sehari, jadi menyimpannya lebih lama hanya menumpuk baris.
-- Dipanggil sendiri tiap kali ada pesan masuk — tidak perlu
-- penjadwal tersendiri, yang jatahnya memang terbatas.
-- ------------------------------------------------------------
create or replace function bersihkan_telegram_pesan()
returns void
language sql
security definer
set search_path = public
as $bersih$
    delete from telegram_pesan where pada < now() - interval '2 days';
$bersih$;

grant execute on function bersihkan_telegram_pesan() to authenticated;


-- ============================================================
-- CEK
-- ============================================================
select count(*) as pesan_tercatat from telegram_pesan;
