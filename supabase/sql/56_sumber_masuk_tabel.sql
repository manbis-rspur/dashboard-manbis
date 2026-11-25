-- ============================================================
-- 56. SUMBER RUJUKAN MASUK KE DALAM TABELNYA SENDIRI
--
-- Permintaannya: daftar rujukan cukup menampilkan sumber
-- literatur beserta tautannya, dan disatukan ke dalam tabel
-- kalender konten. Untuk konsep juga sama.
--
-- Yang dibongkar dari berkas 54:
--
-- (A) Bagian "## Dasar Rujukan" yang berdiri sendiri dihapus.
--     Tabel terpisah memaksa orang mencocokkan sendiri baris
--     jadwal dengan baris rujukan — dan yang mencocokkan itu
--     justru orang yang sedang buru-buru menyerahkan konten ke
--     desainer. Sumbernya sekarang duduk di baris topiknya.
--
-- (B) Kolomnya dipangkas jadi satu. Topik, Klaim, Lembaga,
--     Judul, Tautan, dan Status adalah enam kolom untuk
--     menyampaikan dua hal: sumbernya apa, dan tautannya mana.
--
-- (C) Berkas 54 punya satu keliru yang baru ketahuan sesudah
--     dijalankan: bagian ATURAN SUMBER untuk Kalender Konten
--     TIDAK PERNAH terpasang. Penjaganya berbunyi "pasang kalau
--     belum ada kata ATURAN SUMBER", padahal langkah sebelumnya
--     sudah menuliskan kalimat "diatur pada ATURAN SUMBER di
--     bawah" — jadi penjaganya menutup pintu bagi isinya
--     sendiri. Akibatnya kalender memuat kolom Status tanpa ada
--     keterangan apa pun cara mengisinya. Di berkas ini
--     penjaganya memakai seluruh baris judulnya, yang cuma ada
--     di dalam isi yang dipasang.
--
-- Jalankan di Supabase -> SQL Editor -> Run
-- Aman dijalankan berulang kali.
-- ============================================================


-- ------------------------------------------------------------
-- (1) Kalender Konten: bagian Dasar Rujukan dibongkar.
-- ------------------------------------------------------------
update modul_ai
   set instruksi_sistem = replace(
        instruksi_sistem,

'Sesudah tabel jadwal, tulis bagian "## Dasar Rujukan".

Isinya tabel markdown dengan kolom:
| Topik Konten | Klaim Medis yang Dipakai | Lembaga | Judul Sumber | Tautan | Status |

Satu baris untuk TIAP topik yang memuat pernyataan medis — gejala, penyebab, angka, anjuran, larangan, atau pencegahan. Topik yang murni ucapan hari besar, informasi jadwal layanan, atau profil tim TIDAK perlu masuk tabel ini.

Usahakan tiap klaim penting berdiri di atas dua kaki: satu rujukan NASIONAL (Kementerian Kesehatan RI atau perhimpunan dokter spesialis Indonesia) dan satu rujukan INTERNASIONAL (WHO, CDC, dan sejenisnya). Tulis dua baris untuk klaim yang sama bila keduanya ada.

Cara mengisi tiga kolom terakhir diatur pada ATURAN SUMBER di bawah.

Tutup dengan',

'Tutup dengan')
 where judul = 'Kalender Konten';


-- ------------------------------------------------------------
-- (2) Kalender Konten: sumbernya jadi kolom pada tabel jadwal.
-- ------------------------------------------------------------
update modul_ai
   set instruksi_sistem = replace(
        instruksi_sistem,

'| Minggu / Tanggal | Tahap | Pilar Konten | Topik & Judul Konten | Format & Kanal | Konsep / Angle Copywriting | Dokter / Narasumber | PIC & Tim Produksi | Target Capaian |
Setiap baris harus terperinci, realistis, dan siap dikerjakan.',

'| Minggu / Tanggal | Tahap | Pilar Konten | Topik & Judul Konten | Format & Kanal | Konsep / Angle Copywriting | Dokter / Narasumber | PIC & Tim Produksi | Target Capaian | Sumber Rujukan |
Setiap baris harus terperinci, realistis, dan siap dikerjakan.

Kolom Sumber Rujukan diisi lembaga sumbernya lalu tautannya, dipisah tanda hubung:
Kemenkes P2PTM — https://p2ptm.kemkes.go.id

Bila sebuah topik memakai rujukan nasional dan internasional sekaligus, tulis keduanya dalam kotak yang sama, dipisah titik koma. Usahakan memang begitu untuk topik yang membawa klaim penting: pedoman Indonesia yang mengikat praktiknya, dan rujukan internasional yang jadi dasarnya.

Baris yang tidak memuat pernyataan medis — ucapan hari besar, informasi jadwal layanan, profil tim — diisi tanda hubung saja.

Cara mengisi kolom itu selengkapnya ada pada bagian terakhir dokumen instruksi ini.')
 where judul = 'Kalender Konten';


-- ------------------------------------------------------------
-- (3) Kalender Konten: bentuk DAFTAR ikut membawa sumbernya.
-- ------------------------------------------------------------
update modul_ai
   set instruksi_sistem = replace(
        instruksi_sistem,
        '- **[Tanggal/Hari]** : [Judul Konten] — [Kanal & Format] — [Brief singkat & PIC]',
        '- **[Tanggal/Hari]** : [Judul Konten] — [Kanal & Format] — [Brief singkat & PIC] — [Lembaga sumber dan tautannya]')
 where judul = 'Kalender Konten';


-- ------------------------------------------------------------
-- (4) Kalender Konten: aturan sumbernya, yang di berkas 54
--     tidak pernah terpasang.
--
-- Penjaganya seluruh baris judul, bukan sepotong kata — inilah
-- yang dulu membuatnya mengunci dirinya sendiri.
-- ------------------------------------------------------------
update modul_ai
   set instruksi_sistem = instruksi_sistem || '

=== ATURAN SUMBER — TIDAK BOLEH DILANGGAR ===

Bersama perintah ini dilampirkan DAFTAR SUMBER RUJUKAN. Isinya dimasukkan manusia dari halaman yang memang sudah dibuka.

Cara mengisi kolom Sumber Rujukan:

1. Topiknya tercakup daftar — salin nama lembaga dan tautannya dari daftar itu, huruf demi huruf.
   Contoh: Kemenkes P2PTM — https://p2ptm.kemkes.go.id

2. Topiknya TIDAK tercakup daftar — sebutkan lembaga dan nama pedoman yang Anda yakini memuat klaim itu, diawali kata "Usulan:", dan TANPA tautan. Gunanya memberi tahu yang memeriksa harus mencari ke mana.
   Contoh: Usulan: Pedoman Nasional Hipertensi, Kemenkes RI — belum ada tautan

Yang tidak boleh ditulis dari ingatan, dalam keadaan apa pun:
- alamat web
- nama penulis, tahun terbit, nomor jilid, nomor halaman
- judul artikel jurnal beserta nama jurnalnya
- angka statistik, persentase, atau jumlah kasus

Anda tidak menyimpan alamat web maupun angka; yang Anda hasilkan bentuknya benar tetapi isinya belum tentu ada. Pada konten kesehatan atas nama rumah sakit, sumber palsu lebih berbahaya daripada tidak ada sumber — ia membuat yang memeriksa merasa sudah aman sehingga tidak jadi memeriksa. Menyebut nama pedoman masih bisa dicari dan dikoreksi; menulis alamat karangan tidak.

Bila sebuah kalimat terasa butuh angka, tulis "[angka perlu dicek]" pada kotaknya.'
 where judul = 'Kalender Konten'
   and instruksi_sistem not like '%=== ATURAN SUMBER — TIDAK BOLEH DILANGGAR ===%';


-- ------------------------------------------------------------
-- (5) Konsep Konten: tabel sumbernya dipangkas jadi dua kolom.
--
-- Status tidak jadi kolom tersendiri lagi. Keadaan "belum ada
-- tautan" sudah terbaca dari kolom tautannya sendiri, dan kolom
-- yang isinya bisa disimpulkan dari kolom sebelah cuma
-- memakan lebar.
-- ------------------------------------------------------------
update modul_ai
   set instruksi_sistem = replace(
        instruksi_sistem,

'## Sumber Rujukan
| Klaim Medis yang Dipakai | Lembaga | Judul Sumber | Tautan | Lingkup | Status |

Satu baris untuk TIAP pernyataan medis dalam konten ini — gejala, angka, anjuran, larangan.

Usahakan tiap klaim penting berdiri di atas dua kaki: satu rujukan NASIONAL (Kementerian Kesehatan RI atau perhimpunan dokter spesialis Indonesia) dan satu rujukan INTERNASIONAL (WHO, CDC, dan sejenisnya). Tulis dua baris untuk klaim yang sama bila keduanya ada. Kolom Lingkup diisi "Nasional" atau "Internasional".

Ada dua keadaan, dan keduanya ditulis apa adanya:

1. Klaimnya tercakup DAFTAR SUMBER RUJUKAN yang dilampirkan — salin Lembaga, Judul Sumber, dan Tautan dari daftar itu, huruf demi huruf. Kolom Status diisi "Terdaftar".

2. Klaimnya TIDAK tercakup daftar — kolom Status diisi "Usulan — perlu diperiksa", kolom Tautan diisi tanda hubung. Kolom Lembaga dan Judul Sumber boleh Anda isi dengan lembaga dan nama pedoman yang Anda yakini memuat klaim itu, supaya yang memeriksa tahu harus mencari ke mana. Tulis nama pedomannya seperti yang Anda ingat, tanpa dilengkap-lengkapi.',

'## Sumber Rujukan
| Sumber Literatur | Tautan |

Kolom Sumber Literatur diisi nama lembaganya, lalu nama pedoman atau halamannya bila ada, dipisah tanda hubung. Kolom Tautan diisi alamatnya.

Satu baris untuk tiap sumber, bukan untuk tiap kalimat. Sumber yang dipakai beberapa kali cukup ditulis sekali.

Usahakan ada keduanya: rujukan NASIONAL (Kementerian Kesehatan RI atau perhimpunan dokter spesialis Indonesia) dan rujukan INTERNASIONAL (WHO, CDC, dan sejenisnya). Pedoman Indonesia mengikat praktiknya, rujukan internasional jadi dasarnya.

Ada dua keadaan, dan keduanya ditulis apa adanya:

1. Sumbernya ada pada DAFTAR SUMBER RUJUKAN yang dilampirkan — salin lembaga, judul, dan tautannya huruf demi huruf.

2. Sumbernya TIDAK ada pada daftar itu — tulis lembaga dan nama pedoman yang Anda yakini memuat klaim itu, diawali kata "Usulan:", dan isi kolom Tautan dengan "belum ada tautan — perlu dicek". Gunanya memberi tahu yang memeriksa harus mencari ke mana.')
 where judul = 'Konsep Konten';


-- ------------------------------------------------------------
-- (6) Konsep Konten: aturannya menyesuaikan kolom yang baru.
-- ------------------------------------------------------------
update modul_ai
   set instruksi_sistem = replace(
        instruksi_sistem,
        'Nama lembaga dan nama pedoman boleh Anda sebut dari pengetahuan Anda, asalkan barisnya bertanda "Usulan — perlu diperiksa" dan kolom tautannya tanda hubung.',
        'Nama lembaga dan nama pedoman boleh Anda sebut dari pengetahuan Anda, asalkan diawali kata "Usulan:" dan kolom tautannya berbunyi "belum ada tautan — perlu dicek".')
 where judul = 'Konsep Konten';


-- ------------------------------------------------------------
-- (7) Memastikan hasilnya.
--
-- Yang paling perlu dilihat: kalender TIDAK lagi memuat
-- "## Dasar Rujukan", memuat kolom "Sumber Rujukan" pada tabel
-- jadwalnya, dan kali ini benar-benar punya ATURAN SUMBER.
-- ------------------------------------------------------------
select judul,
       instruksi_sistem like '%## Dasar Rujukan%'                        as sisa_bagian_lama,
       instruksi_sistem like '%Target Capaian | Sumber Rujukan |%'       as kolom_di_tabel,
       instruksi_sistem like '%=== ATURAN SUMBER — TIDAK BOLEH DILANGGAR ===%' as ada_aturan,
       instruksi_sistem like '%| Sumber Literatur | Tautan |%'           as tabel_konsep_ringkas
  from modul_ai
 where judul in ('Kalender Konten', 'Konsep Konten')
 order by judul;
