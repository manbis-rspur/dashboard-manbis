-- ============================================================
-- 57. KATA ASLI PELAPOR DISIMPAN SEBELUM DIBAKUKAN
--
-- Detail komplain boleh dirapikan bahasanya oleh AI, tapi kata
-- asli pelapor tidak boleh ikut hilang.
--
-- Alasannya bukan kerapian, melainkan pembuktian. Isi kolom
-- detail_masalah adalah keterangan orang yang mengadu, dan
-- komplain bisa berlanjut ke grading merah, komite medik, atau
-- keluar rumah sakit. Kalau kelak dipersoalkan "benarkah
-- keluarga bilang begitu", yang harus bisa ditunjukkan adalah
-- kalimat yang betul-betul mereka sampaikan -- bukan hasil
-- suntingan mesin, sebaik apa pun suntingannya.
--
-- Kolom ini HANYA terisi bila petugas menerima tawaran
-- perapian AI. Perapian mekanis (singkatan dan tanda baca)
-- tidak mengisinya, karena yang itu tidak menggeser makna dan
-- masih bisa diurungkan di layar sebelum disimpan.
--
-- Null berarti: tidak pernah ada AI yang menyentuh teks ini,
-- jadi detail_masalah memang kata pelapor sendiri.
-- ============================================================

alter table komplain
  add column if not exists detail_masalah_asli text;

comment on column komplain.detail_masalah_asli is
  'Kata asli pelapor sebelum dibakukan AI. Null = tidak pernah dirapikan AI, jadi detail_masalah sudah kata aslinya.';
