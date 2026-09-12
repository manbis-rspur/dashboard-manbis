-- ============================================================
-- 29. PERAN YANG BERJALAN TERUS
--
-- Sebagian pekerjaan tidak punya garis selesai: sekretaris
-- akreditasi, anggota pokja, konten media sosial yang tiap minggu
-- ada. Kalau tidak dicatat, ia terlupa. Kalau dicatat sebagai tugas
-- biasa, ia nongkrong di "Hari ini" selamanya — dan daftar yang
-- selalu penuh dengan hal yang sama cepat berhenti dibaca, lalu
-- yang benar-benar mendesak ikut tenggelam bersamanya.
--
-- Jadi dibedakan jenisnya, bukan dipaksa masuk salah satu. Yang
-- berjalan tetap tercatat, tetap terlihat Koordinator sebagai beban
-- yang ditanggung seseorang, tapi punya tempatnya sendiri dan tidak
-- ikut ditanya tiap sore saat menutup hari.
--
-- Jalankan di Supabase -> SQL Editor -> Run
-- Aman dijalankan berulang kali.
-- ============================================================

alter table tugas
    add column if not exists jenis text not null default 'Tugas';

alter table tugas drop constraint if exists tugas_jenis_check;
alter table tugas add constraint tugas_jenis_check
    check (jenis in ('Tugas', 'Berjalan'));

-- Peran yang berjalan tidak punya tenggat, dan memberinya tenggat
-- justru menyesatkan — seolah ada hari ia berhenti.
alter table tugas drop constraint if exists tugas_berjalan_tanpa_tenggat;
alter table tugas add constraint tugas_berjalan_tanpa_tenggat
    check (jenis <> 'Berjalan' or tenggat is null);

create index if not exists idx_tugas_jenis on tugas(untuk, jenis)
    where status not in ('Selesai','Batal');


-- ============================================================
-- CEK
-- ============================================================
select p.nama,
       count(*) filter (where t.jenis = 'Tugas'
                          and t.status not in ('Selesai','Batal')) as tugas_berjalan,
       count(*) filter (where t.jenis = 'Berjalan'
                          and t.status not in ('Selesai','Batal')) as peran_berjalan
  from pengguna p
  left join tugas t on t.untuk = p.id
 group by p.id, p.nama
 order by p.id;
