-- ============================================================
-- 54. RUJUKAN MEDIS DI KALENDER KONTEN, DAN SUMBER YANG BERGUNA
--     WALAU BELUM TERDAFTAR
--
-- Permintaannya: tiap keluaran medis — di Kalender Konten maupun
-- di Konsep Konten — menyebutkan literatur rujukannya, nasional
-- maupun internasional.
--
-- Ada tiga hal yang menghalangi itu sekarang:
--
-- (A) Kalender Konten sama sekali tidak punya bagian sumber.
--     Padahal topik dan angle-nya sudah memuat klaim medis, dan
--     klaim itulah yang dibawa terus ke konsep sampai ke unggahan.
--     Diperbaiki: ditambah bagian "Dasar Rujukan" sesudah tabel
--     jadwal — bukan kolom baru, karena tabel jadwalnya sudah
--     sembilan kolom dan menjadi tidak terbaca kalau ditambah.
--
-- (B) Daftar sumbernya baru berisi dua alamat, keduanya halaman
--     depan lembaga. Akibatnya hampir tiap klaim jatuh ke
--     "belum terdaftar", dan aturan yang benar itu terasa seperti
--     fitur yang rusak.
--     Diperbaiki: didaftarkan lembaga rujukan nasional dan
--     internasional yang lazim dipakai rumah sakit. SELURUH
--     alamat di bawah ini sudah dicoba dibuka satu per satu pada
--     18 September 2026 dan menjawab — bukan disalin dari ingatan.
--
-- (C) Klaim yang tidak tercakup daftar berujung tulisan
--     "belum terdaftar" dan berhenti di situ. Itu jujur, tetapi
--     tidak menolong: yang memeriksa tidak diberi tahu harus
--     mencari ke mana.
--     Diperbaiki: AI sekarang boleh MENYEBUT lembaga dan nama
--     pedoman yang ia yakini memuat klaim itu, ditandai
--     "Usulan — perlu diperiksa", TANPA alamat. Menyebut nama
--     pedoman memberi petunjuk mencari; menulis alamat palsu
--     memberi rasa aman palsu. Yang pertama menolong, yang kedua
--     berbahaya — jadi yang dilarang tetap alamat, angka, nama
--     penulis, dan tahun terbit.
--
-- Jalankan di Supabase -> SQL Editor -> Run
-- Aman dijalankan berulang kali.
-- ============================================================


-- ------------------------------------------------------------
-- (1) Lingkup sumber: nasional atau internasional.
--
-- Dipakai supaya konten kesehatan berdiri di atas dua kaki —
-- pedoman Indonesia yang mengikat praktiknya, dan rujukan
-- internasional yang jadi dasar pedoman itu. Mengandalkan satu
-- saja membuat kontennya entah tidak berlaku di sini, atau tidak
-- bisa ditelusuri lebih dalam.
-- ------------------------------------------------------------
alter table sumber_rujukan
    add column if not exists lingkup text not null default 'nasional';

do $$
begin
    if not exists (
        select 1 from pg_constraint where conname = 'sumber_lingkup_sah'
    ) then
        alter table sumber_rujukan
            add constraint sumber_lingkup_sah
            check (lingkup in ('nasional', 'internasional'));
    end if;
end $$;

update sumber_rujukan set lingkup = 'internasional'
 where lingkup = 'nasional'
   and tautan ~* '^https://(www\.)?(who\.int|iris\.who\.int|cdc\.gov|medlineplus\.gov)';


-- ------------------------------------------------------------
-- (2) Lembaga rujukan yang lazim, nasional dan internasional.
--
-- Yang didaftarkan halaman lembaganya, bukan pedoman tertentu —
-- alamat pedoman berubah tiap kali situsnya dirapikan, sedangkan
-- alamat lembaganya bertahan. Pedoman yang sering dipakai
-- silakan ditambah sendiri lewat Bahan Tema, dan itu memang yang
-- paling berharga karena sudah pernah dibuka orang.
--
-- "on conflict do nothing" pada tautan: yang sudah ada tidak
-- ditimpa, supaya catatan dan topik yang sudah disunting tim
-- tidak hilang kalau berkas ini dijalankan lagi.
-- ------------------------------------------------------------
insert into sumber_rujukan (lembaga, judul, tautan, topik, lingkup, aktif) values
    ('Kementerian Kesehatan RI', null, 'https://kemkes.go.id',
     'umum, kesehatan masyarakat, program nasional', 'nasional', true),

    ('Kementerian Kesehatan RI — Ayo Sehat', null, 'https://ayosehat.kemkes.go.id',
     'gaya hidup sehat, gizi, imunisasi, edukasi awam', 'nasional', true),

    ('Kementerian Kesehatan RI — P2PTM', null, 'https://p2ptm.kemkes.go.id',
     'hipertensi, diabetes, jantung, stroke, kanker, penyakit tidak menular', 'nasional', true),

    ('BPOM RI', null, 'https://www.pom.go.id',
     'obat, suplemen, kosmetik, keamanan pangan, hoaks produk', 'nasional', true),

    ('BKKBN', null, 'https://www.bkkbn.go.id',
     'keluarga berencana, stunting, kesehatan reproduksi, remaja', 'nasional', true),

    ('IDAI — Ikatan Dokter Anak Indonesia', null, 'https://www.idai.or.id',
     'anak, bayi, imunisasi, tumbuh kembang, ASI', 'nasional', true),

    ('PAPDI — Perhimpunan Dokter Spesialis Penyakit Dalam', null, 'https://www.papdi.or.id',
     'penyakit dalam, diabetes, ginjal, infeksi, geriatri', 'nasional', true),

    ('PERKI — Perhimpunan Dokter Spesialis Kardiovaskular', null, 'https://inaheart.org',
     'jantung, hipertensi, kolesterol, gagal jantung', 'nasional', true),

    ('PDPI — Perhimpunan Dokter Paru Indonesia', null, 'https://klikpdpi.com',
     'paru, asma, PPOK, TBC, rokok, polusi udara', 'nasional', true),

    ('PERDOSKI — Perhimpunan Dokter Kulit dan Kelamin', null, 'https://perdoski.id',
     'kulit, jerawat, alergi, kosmetik, infeksi menular seksual', 'nasional', true),

    ('POGI — Perkumpulan Obstetri dan Ginekologi Indonesia', null, 'https://pogi.or.id',
     'kehamilan, persalinan, kandungan, kesehatan perempuan', 'nasional', true),

    ('World Health Organization', null, 'https://www.who.int',
     'umum, penyakit, wabah, panduan internasional', 'internasional', true),

    ('WHO — Fact Sheets', null, 'https://www.who.int/news-room/fact-sheets',
     'ringkasan penyakit, angka global, definisi resmi', 'internasional', true),

    ('WHO — IRIS (perpustakaan dokumen resmi)', null, 'https://iris.who.int',
     'pedoman lengkap, laporan teknis, dokumen resmi WHO', 'internasional', true),

    ('CDC — Centers for Disease Control and Prevention', null, 'https://www.cdc.gov',
     'penyakit menular, imunisasi, pencegahan, kesehatan perjalanan', 'internasional', true),

    ('MedlinePlus — US National Library of Medicine', null, 'https://medlineplus.gov',
     'penjelasan penyakit untuk awam, obat, pemeriksaan laboratorium', 'internasional', true),

    ('PubMed — US National Library of Medicine', null, 'https://pubmed.ncbi.nlm.nih.gov',
     'jurnal, penelitian, tinjauan ilmiah', 'internasional', true),

    ('Cochrane Library', null, 'https://www.cochranelibrary.com',
     'tinjauan sistematis, bukti pengobatan', 'internasional', true),

    ('NICE — National Institute for Health and Care Excellence', null, 'https://www.nice.org.uk',
     'pedoman klinis, tata laksana penyakit', 'internasional', true),

    ('Mayo Clinic', null, 'https://www.mayoclinic.org',
     'penjelasan penyakit untuk awam, gejala, persiapan pemeriksaan', 'internasional', true),

    ('American Heart Association', null, 'https://www.heart.org',
     'jantung, stroke, tekanan darah, kolesterol', 'internasional', true),

    ('American Diabetes Association', null, 'https://diabetes.org',
     'diabetes, gula darah, pola makan', 'internasional', true),

    ('IARC — Global Cancer Observatory', null, 'https://gco.iarc.fr',
     'kanker, angka kejadian, data global', 'internasional', true)
on conflict (tautan) do nothing;


-- ------------------------------------------------------------
-- (3) Modul mana yang dibekali daftar sumber.
--
-- Bukan semuanya. Balasan ulasan pasien dan siaran pers tidak
-- memuat klaim medis, dan melampirkan daftar sumber ke sana
-- hanya memanjangkan perintah tanpa gunanya.
-- ------------------------------------------------------------
alter table modul_ai
    add column if not exists pakai_sumber boolean not null default false;

update modul_ai set pakai_sumber = true
 where judul in ('Kalender Konten', 'Konsep Konten', 'Naskah Video Edukasi Dokter');


-- ------------------------------------------------------------
-- (4) Kalender Konten: bagian Dasar Rujukan.
--
-- Ditaruh sesudah tabel jadwal dan sebelum penutup, supaya yang
-- membaca sudah tahu topiknya dulu, baru melihat dasarnya.
-- ------------------------------------------------------------
update modul_ai
   set instruksi_sistem = replace(
        instruksi_sistem,
        'Tutup dengan tabel ringkas jam dan hari tayang terbaik, serta beberapa poin rekomendasi eksekusi dan evaluasi.',

'Sesudah tabel jadwal, tulis bagian "## Dasar Rujukan".

Isinya tabel markdown dengan kolom:
| Topik Konten | Klaim Medis yang Dipakai | Lembaga | Judul Sumber | Tautan | Status |

Satu baris untuk TIAP topik yang memuat pernyataan medis — gejala, penyebab, angka, anjuran, larangan, atau pencegahan. Topik yang murni ucapan hari besar, informasi jadwal layanan, atau profil tim TIDAK perlu masuk tabel ini.

Usahakan tiap klaim penting berdiri di atas dua kaki: satu rujukan NASIONAL (Kementerian Kesehatan RI atau perhimpunan dokter spesialis Indonesia) dan satu rujukan INTERNASIONAL (WHO, CDC, dan sejenisnya). Tulis dua baris untuk klaim yang sama bila keduanya ada.

Cara mengisi tiga kolom terakhir diatur pada ATURAN SUMBER di bawah.

Tutup dengan tabel ringkas jam dan hari tayang terbaik, serta beberapa poin rekomendasi eksekusi dan evaluasi.')
 where judul = 'Kalender Konten'
   and instruksi_sistem not like '%## Dasar Rujukan%';


-- ------------------------------------------------------------
-- (5) Aturan sumber untuk Kalender Konten.
--
-- Ditulis terpisah dari bagian (4) supaya kalau kelak salah satu
-- diperbaiki, yang lain tidak ikut tergeser.
-- ------------------------------------------------------------
update modul_ai
   set instruksi_sistem = instruksi_sistem || '

=== ATURAN SUMBER — TIDAK BOLEH DILANGGAR ===

Kolom Tautan HANYA boleh diisi dengan MENYALIN alamat dari DAFTAR SUMBER RUJUKAN yang dilampirkan bersama perintah ini, huruf demi huruf. Tidak ada sumber alamat yang lain.

Ada dua keadaan, dan keduanya harus ditulis apa adanya:

1. Klaimnya tercakup daftar — salin Lembaga, Judul Sumber, dan Tautan dari daftar. Kolom Status diisi "Terdaftar".

2. Klaimnya TIDAK tercakup daftar — kolom Status diisi "Usulan — perlu diperiksa", kolom Tautan diisi tanda hubung. Kolom Lembaga dan Judul Sumber boleh Anda isi dengan lembaga dan nama pedoman yang Anda yakini memuat klaim itu, supaya yang memeriksa tahu harus mencari ke mana. Tulis nama pedomannya seperti yang Anda ingat, tanpa dilengkap-lengkapi.

Yang tidak boleh ditulis dari ingatan, dalam keadaan apa pun:
- alamat web
- nama penulis, tahun terbit, nomor jilid, nomor halaman
- judul artikel jurnal beserta nama jurnalnya
- angka statistik, persentase, atau jumlah kasus

Anda tidak menyimpan alamat web maupun angka; yang Anda hasilkan bentuknya benar tetapi isinya belum tentu ada. Pada konten kesehatan atas nama rumah sakit, sumber palsu lebih berbahaya daripada tidak ada sumber — ia membuat yang memeriksa merasa sudah aman sehingga tidak jadi memeriksa.

Bila sebuah kalimat terasa butuh angka, tulis "[angka perlu dicek]" dan masukkan barisnya ke tabel Dasar Rujukan.'
 where judul = 'Kalender Konten'
   and instruksi_sistem not like '%ATURAN SUMBER%';


-- ------------------------------------------------------------
-- (6) Konsep Konten: sumber yang belum terdaftar tetap menolong.
-- ------------------------------------------------------------
update modul_ai
   set instruksi_sistem = replace(
        instruksi_sistem,

'## Sumber Rujukan
| Klaim Medis yang Dipakai | Lembaga | Judul Sumber | Tautan |

Satu baris untuk TIAP pernyataan medis dalam konten ini — gejala, angka, anjuran, larangan.

Kolom Lembaga, Judul Sumber, dan Tautan HANYA boleh diisi dengan MENYALIN dari DAFTAR SUMBER RUJUKAN yang dilampirkan bersama perintah ini. Salin huruf demi huruf.

Bila sebuah klaim tidak tercakup daftar itu, tulis pada ketiga kolom itu: "belum terdaftar — tambahkan di Bahan Tema". JANGAN menggantinya dengan sumber lain yang Anda ketahui.',

'## Sumber Rujukan
| Klaim Medis yang Dipakai | Lembaga | Judul Sumber | Tautan | Lingkup | Status |

Satu baris untuk TIAP pernyataan medis dalam konten ini — gejala, angka, anjuran, larangan.

Usahakan tiap klaim penting berdiri di atas dua kaki: satu rujukan NASIONAL (Kementerian Kesehatan RI atau perhimpunan dokter spesialis Indonesia) dan satu rujukan INTERNASIONAL (WHO, CDC, dan sejenisnya). Tulis dua baris untuk klaim yang sama bila keduanya ada. Kolom Lingkup diisi "Nasional" atau "Internasional".

Ada dua keadaan, dan keduanya ditulis apa adanya:

1. Klaimnya tercakup DAFTAR SUMBER RUJUKAN yang dilampirkan — salin Lembaga, Judul Sumber, dan Tautan dari daftar itu, huruf demi huruf. Kolom Status diisi "Terdaftar".

2. Klaimnya TIDAK tercakup daftar — kolom Status diisi "Usulan — perlu diperiksa", kolom Tautan diisi tanda hubung. Kolom Lembaga dan Judul Sumber boleh Anda isi dengan lembaga dan nama pedoman yang Anda yakini memuat klaim itu, supaya yang memeriksa tahu harus mencari ke mana. Tulis nama pedomannya seperti yang Anda ingat, tanpa dilengkap-lengkapi.')
 where judul = 'Konsep Konten';


-- ------------------------------------------------------------
-- (7) Aturan sumber Konsep Konten disamakan dengan yang di atas.
--
-- Larangannya tidak dilonggarkan — yang berubah cuma: menyebut
-- nama pedoman tanpa alamat sekarang diminta, bukan dilarang.
-- ------------------------------------------------------------
update modul_ai
   set instruksi_sistem = replace(
        instruksi_sistem,

'- Satu-satunya sumber yang boleh Anda tulis adalah yang ADA DI DAFTAR SUMBER RUJUKAN yang dilampirkan, disalin apa adanya.
- JANGAN PERNAH menuliskan alamat web, judul halaman, judul jurnal, nama penelitian, nama penulis, atau tahun terbit DARI INGATAN ANDA.',

'- Satu-satunya ALAMAT WEB yang boleh Anda tulis adalah yang ADA DI DAFTAR SUMBER RUJUKAN yang dilampirkan, disalin apa adanya. Nama lembaga dan nama pedoman boleh Anda sebut dari pengetahuan Anda, asalkan barisnya bertanda "Usulan — perlu diperiksa" dan kolom tautannya tanda hubung.
- JANGAN PERNAH menuliskan alamat web, judul artikel jurnal beserta nama jurnalnya, nama penulis, nomor jilid, nomor halaman, atau tahun terbit DARI INGATAN ANDA.')
 where judul = 'Konsep Konten';


-- ------------------------------------------------------------
-- (8) Memastikan hasilnya.
-- ------------------------------------------------------------
select judul,
       pakai_sumber,
       instruksi_sistem like '%## Dasar Rujukan%'  as ada_dasar_rujukan,
       instruksi_sistem like '%Usulan — perlu diperiksa%' as ada_usulan
  from modul_ai
 where judul in ('Kalender Konten', 'Konsep Konten')
 order by judul;

select lingkup, count(*) as jumlah
  from sumber_rujukan
 where aktif
 group by lingkup
 order by lingkup;
