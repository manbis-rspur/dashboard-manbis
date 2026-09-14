-- ============================================================
-- 36. KALENDER KONTEN: RENTANG TANGGAL DAN USUL TEMA
--
-- Dua keluhan nyata dari yang memakainya.
--
-- (A) Durasi cuma bisa dipilih mingguan, bulanan, atau tahunan.
--     Padahal kegiatan sungguhan jarang jatuh serapi itu — persiapan
--     satu acara bisa sepuluh hari, dan menutupinya dengan "satu
--     bulan" menghasilkan setengah kalender yang tidak terpakai.
--
-- (B) Tema kampanye wajib diisi, dan justru menentukan tema itulah
--     yang paling sulit. Orang berhenti di kotak pertama, dan modul
--     yang tidak bisa dimulai sama saja dengan tidak ada.
--
-- Jawabannya: tanggal boleh ditentukan sendiri, dan tema boleh
-- dikosongkan — kalau kosong, AI yang mengusulkan lebih dulu, lalu
-- menyusun kalendernya memakai usulan terkuat sambil menyebutkan
-- alasannya. Usulnya berpijak pada hari kesehatan di rentang itu,
-- layanan yang sedang didorong, dan evaluasi bulan sebelumnya yang
-- sudah terisi sendiri dari laporan media sosial.
--
-- Semua perubahan di sini hanya dijalankan bila belum ada, supaya
-- suntingan yang dilakukan sendiri lewat menu Sunting Modul tidak
-- tertimpa.
--
-- Jalankan di Supabase -> SQL Editor -> Run
-- Aman dijalankan berulang kali.
-- ============================================================


-- ------------------------------------------------------------
-- (A) Dua isian tanggal.
-- ------------------------------------------------------------
update modul_ai
   set kolom = kolom || jsonb_build_array(
           jsonb_build_object(
               'kunci',    'tanggal_mulai',
               'label',    'Tanggal Mulai',
               'jenis',    'date',
               'petunjuk', 'Boleh dikosongkan. Kalau diisi, rentang inilah yang dipakai, bukan pilihan durasi di atas.'
           ),
           jsonb_build_object(
               'kunci',    'tanggal_selesai',
               'label',    'Tanggal Selesai',
               'jenis',    'date',
               'petunjuk', 'Isi bersama tanggal mulai untuk menentukan rentangnya sendiri.'
           )
       )
 where judul ilike '%kalender konten%'
   and not (kolom @> '[{"kunci":"tanggal_mulai"}]'::jsonb);


-- ------------------------------------------------------------
-- (B) Tema tidak lagi wajib, dan petunjuknya menyebutkan itu.
--
-- jsonb_set dipakai per elemen karena kolom adalah larik: yang
-- diubah hanya butir bertanda 'topik', sisanya dibiarkan apa adanya.
-- ------------------------------------------------------------
update modul_ai m
   set kolom = (
       select jsonb_agg(
           case when butir->>'kunci' = 'topik'
                then butir
                     - 'wajib'
                     || jsonb_build_object(
                            'label', 'Fokus Tema / Kampanye',
                            'petunjuk',
                            'Boleh dikosongkan. Kalau kosong, AI mengusulkan dua sampai tiga tema lebih dulu berdasarkan hari kesehatan pada rentang itu dan evaluasi bulan lalu, lalu memakai yang paling kuat.'
                        )
                else butir end
       )
       from jsonb_array_elements(m.kolom) as butir
   )
 where m.judul ilike '%kalender konten%';


-- ------------------------------------------------------------
-- (C) Perintahnya diberi tahu cara memakai keduanya.
-- ------------------------------------------------------------
update modul_ai
   set pola_perintah = pola_perintah
        || E'\n\nRentang tanggal yang diminta: {{tanggal_mulai}} sampai {{tanggal_selesai}}.\n'
        || 'Bila kedua tanggal itu terisi, SUSUN KALENDER PERSIS PADA RENTANG ITU dan abaikan pilihan durasi, '
        || 'bulan mulai, serta tahun di atas. Sebutkan tanggal sungguhan pada tiap butir, bukan "pekan pertama". '
        || 'Bila kedua tanggal bertanda hubung atau kosong, ikuti durasi seperti biasa.'
 where judul ilike '%kalender konten%'
   and pola_perintah not like '%{{tanggal_mulai}}%';

update modul_ai
   set pola_perintah = pola_perintah
        || E'\n\nBila Fokus Tema / Kampanye kosong atau bertanda hubung, JANGAN langsung menyusun kalender. '
        || E'Mulailah dengan bagian berjudul "Usulan Tema" berisi dua sampai tiga pilihan tema, masing-masing '
        || E'satu kalimat alasan yang bertumpu pada hari besar kesehatan yang jatuh pada rentang itu, layanan '
        || E'rumah sakit yang sedang didorong, dan evaluasi bulan sebelumnya bila diberikan. Sesudah itu pilih '
        || E'satu tema yang paling kuat, sebutkan alasan memilihnya dalam satu kalimat, lalu susun kalendernya '
        || E'memakai tema itu. Jangan meminta balasan — pilih sendiri, karena yang membaca menunggu kalender '
        || E'yang siap dipakai, bukan pertanyaan balik.'
 where judul ilike '%kalender konten%'
   and pola_perintah not like '%Usulan Tema%';


-- ============================================================
-- CEK
-- ============================================================
select judul,
       (select count(*) from jsonb_array_elements(kolom)) as jumlah_isian,
       kolom @> '[{"kunci":"tanggal_mulai"}]'::jsonb as ada_rentang,
       pola_perintah like '%Usulan Tema%'               as bisa_usul_tema
  from modul_ai
 where judul ilike '%kalender konten%';
