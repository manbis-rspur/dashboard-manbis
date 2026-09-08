-- ============================================================
-- 19. TAUTAN GOOGLE DOCS PADA DOKUMEN ARSIP
--
-- Untuk dokumen yang memang perlu digarap ramai-ramai di Google
-- Docs, cukup disimpan tautannya. Berkasnya ditaruh di Drive
-- sekali oleh yang mengunggah, lalu tautannya ditempel di sini.
--
-- Sengaja TIDAK menyambungkan Drive API: akun layanan tidak punya
-- jatah penyimpanan Drive sendiri sehingga harus menumpang Shared
-- Drive milik Workspace rumah sakit — akun yang sudah terbukti
-- dibatasi dari layanan Google lain. Sambungan yang bisa mati
-- karena kebijakan administrator bukan pondasi yang baik untuk
-- alur kerja harian.
--
-- Penyuntingan berjalur teks tetap ada dan tetap dianjurkan untuk
-- dokumen yang perlu dikoreksi bolak-balik, karena hanya jalur itu
-- yang menyimpan riwayat siapa mengubah apa.
--
-- Jalankan di Supabase -> SQL Editor -> Run
-- Aman dijalankan berulang kali.
-- ============================================================

alter table publikasi
    add column if not exists tautan_docs text;

-- Hanya menerima tautan aman. Tanpa syarat ini, sebuah tautan
-- berisi skrip bisa tersimpan dan terpasang sebagai tombol yang
-- diklik orang lain.
alter table publikasi drop constraint if exists publikasi_tautan_aman;
alter table publikasi add constraint publikasi_tautan_aman
    check (tautan_docs is null or tautan_docs ~* '^https://');


-- ============================================================
-- CEK
-- ============================================================
select id, judul,
       case when isi is not null then 'teks — bisa disunting di tempat'
            else 'berkas' end as bentuk,
       coalesce(tautan_docs, '(belum ada tautan)') as google_docs
  from publikasi order by id;
