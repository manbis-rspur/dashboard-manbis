-- ============================================================
-- 04. MENYAMBUNGKAN AKUN LOGIN KE BARIS PENGGUNA
--
-- Persoalannya: tabel `pengguna` berisi anggota manbis, sedangkan
-- akun login tersimpan terpisah di bagian Authentication milik
-- Supabase. Keduanya disambung lewat kolom auth_user_id.
--
-- Untuk akun yang dibuat DARI DALAM APLIKASI (menu Pengguna),
-- penyambungan sudah dikerjakan aplikasi. Berkas ini dipakai untuk
-- akun yang dibuat LEWAT DASHBOARD Supabase — terutama akun Admin
-- yang pertama, yang mau tidak mau harus dibuat dari sana karena
-- menu Pengguna baru bisa dibuka setelah ada Admin yang masuk.
--
-- Catatan: versi sebelumnya memasang pemicu otomatis di auth.users.
-- Cara itu ditinggalkan karena membuat pemicu di skema `auth` butuh
-- hak kepemilikan yang tidak diberikan Supabase pada umumnya —
-- perintahnya berhenti dengan galat, dan tidak ada yang tersambung.
--
-- Jalankan di Supabase -> SQL Editor -> Run
-- Aman dijalankan berulang kali, dan aman dijalankan kapan saja
-- setelah menambah akun baru lewat dashboard.
-- ============================================================


-- ------------------------------------------------------------
-- Menyambungkan berdasarkan kecocokan email.
--
-- Perbandingannya mengabaikan besar-kecil huruf, karena orang
-- biasa mengetik email dengan gaya yang berbeda-beda.
--
-- Hanya baris yang belum tersambung yang disentuh, jadi
-- sambungan yang sudah ada tidak akan tertimpa.
-- ------------------------------------------------------------
update pengguna p
   set auth_user_id = u.id
  from auth.users u
 where lower(u.email) = lower(p.email)
   and p.auth_user_id is null;


-- ============================================================
-- CEK — memperlihatkan siapa yang sudah punya akun login.
--
-- Kalau ada yang masih "belum dibuat" padahal akunnya sudah dibuat
-- di dashboard, berarti emailnya berbeda. Betulkan email di tabel
-- pengguna, lalu jalankan berkas ini sekali lagi.
-- ============================================================
select p.nama,
       p.jabatan,
       p.email,
       p.peran,
       case when p.auth_user_id is null
            then 'belum dibuat'
            else 'sudah tersambung'
       end as akun_login
  from pengguna p
 order by p.id;
