-- ============================================================
-- 25. DOKUMEN ARSIP BOLEH BERUPA TAUTAN SAJA
--
-- Sampai sekarang setiap baris arsip wajib punya berkas. Padahal
-- ada dokumen yang memang lebih masuk akal ditaruh di Google Drive
-- lalu dibagikan tautannya — berkas rancangan yang masih digarap
-- ramai-ramai, atau berkas yang terlalu besar untuk dibawa-bawa.
--
-- Sesudah ini sebuah baris sah kalau punya salah satu dari tiga:
-- berkas yang diunggah, isi teks yang disunting di tempat, atau
-- tautan Google Docs/Drive. Kolom tautannya sudah ada sejak
-- berkas 19 — yang berubah cuma kewajiban adanya berkas.
--
-- Jalankan di Supabase -> SQL Editor -> Run
-- Aman dijalankan berulang kali.
-- ============================================================

alter table publikasi alter column berkas_jalur drop not null;
alter table publikasi alter column berkas_nama  drop not null;

-- Baris kosong melompong tidak ada gunanya: yang membukanya tidak
-- menemukan apa pun. Syarat ini menjaga supaya minimal ada satu
-- bentuk isi.
alter table publikasi drop constraint if exists publikasi_ada_isinya;
alter table publikasi add constraint publikasi_ada_isinya
    check (
        berkas_jalur is not null
        or isi is not null
        or tautan_docs is not null
    );

-- Berkas dan nama berkas harus ada berbarengan; salah satunya saja
-- berarti catatannya cacat.
alter table publikasi drop constraint if exists publikasi_berkas_lengkap;
alter table publikasi add constraint publikasi_berkas_lengkap
    check ((berkas_jalur is null) = (berkas_nama is null));


-- ============================================================
-- CEK
-- ============================================================
select id, judul,
       case when berkas_jalur is not null then 'berkas'
            when isi is not null          then 'teks'
            else                               'tautan saja' end as bentuk,
       coalesce(tautan_docs, '—') as tautan
  from publikasi order by id;
