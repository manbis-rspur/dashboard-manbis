-- ============================================================
-- 09. WADAH BERKAS TERTUTUP
--
-- Tempat menyimpan template formulir komplain resmi.
--
-- Berbeda dari wadah 'publik' yang berisi logo dan foto profil,
-- wadah ini TIDAK boleh dibaca siapa pun lewat alamat langsung.
-- Sengaja tanpa kebijakan akses sama sekali: satu-satunya yang
-- bisa menyentuhnya adalah aplikasi lewat kunci rahasianya, dan
-- aplikasi memeriksa dulu siapa yang meminta.
--
-- Jalankan di Supabase -> SQL Editor -> Run
-- Aman dijalankan berulang kali.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('dokumen', 'dokumen', false)
on conflict (id) do nothing;

-- Membersihkan kebijakan lama bila berkas ini pernah dijalankan
-- dengan isi yang berbeda.
drop policy if exists p_dokumen_baca   on storage.objects;
drop policy if exists p_dokumen_unggah on storage.objects;


-- ============================================================
-- CEK — wadah 'dokumen' harus ada dan TIDAK publik.
-- ============================================================
select id, public as terbuka_untuk_umum
  from storage.buckets
 where id in ('publik', 'dokumen')
 order by id;
