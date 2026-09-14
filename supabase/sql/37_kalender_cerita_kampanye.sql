-- ============================================================
-- 37. KALENDER KONTEN: CERITAKAN KAMPANYENYA, JANGAN BERI JUDUL
--
-- Isian pertama dulu bernama "Fokus Tema / Kampanye" dan berupa satu
-- baris. Dua-duanya keliru untuk pekerjaan ini.
--
-- Meminta judul berarti meminta kesimpulan lebih dulu, padahal
-- menyimpulkan justru langkah terakhir. Orang berhenti di kotak
-- pertama karena belum tahu mau menamai apa — sementara ia sebenarnya
-- sudah tahu apa yang ingin dicapai.
--
-- Dan satu baris terlalu sempit untuk menceritakan keadaan: layanan
-- apa yang didorong, siapa yang disasar, ada acara apa, nadanya
-- seperti apa. Yang sempit memaksa meringkas, dan yang diringkas
-- kehilangan justru bagian yang membuat kalendernya tepat.
--
-- Sesudah ini isian itu jadi kotak bertingkat dan pertanyaannya
-- berubah: ceritakan kampanyenya. Tetap boleh dikosongkan — AI tetap
-- mengusulkan tema lebih dulu seperti yang sudah diatur berkas 36.
--
-- Jalankan di Supabase -> SQL Editor -> Run
-- Aman dijalankan berulang kali.
-- ============================================================

update modul_ai m
   set kolom = (
       select jsonb_agg(
           case when butir->>'kunci' = 'topik'
                then butir
                     - 'wajib'
                     || jsonb_build_object(
                            'jenis',  'textarea',
                            'label',  'Ceritakan Kampanye yang Ingin Dibuat',
                            'contoh',
                            'Mau mendorong layanan fisioterapi. Sasarannya ibu muda setelah melahirkan. Ada senam bersama tanggal 20. Nadanya hangat, jangan terlalu klinis.',
                            'petunjuk',
                            'Ceritakan apa adanya, tidak perlu rapi — layanan apa yang didorong, siapa yang disasar, ada acara atau momen apa, nadanya seperti apa. Boleh dikosongkan: kalau kosong, AI mengusulkan temanya lebih dulu.'
                        )
                else butir end
       )
       from jsonb_array_elements(m.kolom) as butir
   )
 where m.judul ilike '%kalender konten%';


-- ------------------------------------------------------------
-- Perintahnya menyebut isian itu sebagai cerita, bukan judul.
--
-- Baris lama tetap dibiarkan; yang ditambahkan hanya penegasan cara
-- membacanya, dan hanya bila belum ada.
-- ------------------------------------------------------------
update modul_ai
   set pola_perintah = pola_perintah
        || E'\n\nIsian "Tema / Kampanye" di atas adalah cerita bebas, bukan judul. '
        || 'Baca sebagai keterangan keadaan: layanan yang ingin didorong, sasarannya, '
        || 'acara yang sudah terjadwal, dan nada yang diinginkan. Simpulkan sendiri '
        || 'nama kampanyenya dari cerita itu, sebutkan di awal, lalu susun kalendernya.'
 where judul ilike '%kalender konten%'
   and pola_perintah not like '%adalah cerita bebas%';


-- ============================================================
-- CEK
-- ============================================================
select butir->>'kunci'    as kunci,
       butir->>'jenis'    as jenis,
       butir->>'label'    as label,
       butir ? 'wajib'    as masih_wajib
  from modul_ai m, jsonb_array_elements(m.kolom) as butir
 where m.judul ilike '%kalender konten%'
   and butir->>'kunci' = 'topik';
