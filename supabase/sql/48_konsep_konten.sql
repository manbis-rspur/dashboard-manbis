-- ============================================================
-- 48. MODUL KONSEP KONTEN
--
-- Kalender konten menjawab "apa dan kapan". Yang belum dijawab:
-- "bagaimana bikinnya". Selama ini jarak antara satu baris
-- kalender dan konten yang jadi diisi sendiri oleh yang
-- memproduksi — dan tiap orang mengisinya dengan cara berbeda.
--
-- Modul ini mengisi jarak itu: satu baris kalender jadi satu brief
-- produksi yang bisa langsung dikerjakan desainer, videografer,
-- dan copywriter.
--
-- Dibuat sebagai baris modul_ai, bukan ditanam di kode, supaya
-- susunan perintahnya bisa diperbaiki sendiri lewat menu Sunting
-- Modul saat ternyata ada yang kurang pas.
--
-- Jalankan di Supabase -> SQL Editor -> Run
-- Aman dijalankan berulang kali.
-- ============================================================

insert into modul_ai (
    judul, deskripsi, kategori, ikon, instruksi_sistem, pola_perintah, kolom,
    bawaan, aktif, urutan, pakai_dokter, pakai_isu, pakai_layanan
)
select
    'Konsep Konten',
    'Mengubah satu baris kalender jadi brief produksi: hook, isi, CTA, ide visual, teks, dan kebutuhan syuting.',
    'Konten',
    'template',

-- ------------------------------------------------------------
-- Instruksi sistem
-- ------------------------------------------------------------
$instruksi$Anda Content Strategist sekaligus penulis naskah media sosial Rumah Sakit Pertamedika Ummi Rosnati (RSPUR), akun @rspurosnati.

Susun konsep produksi untuk SATU konten saja. Yang membaca ini desainer grafis, videografer, dan copywriter rumah sakit — jadi tulis sebagai brief yang tinggal dikerjakan, bukan sebagai saran atau pilihan.

Bentuk keluarannya MENGIKUTI format yang diminta.

=== BILA FORMATNYA REELS ATAU TIKTOK (video pendek) ===

## Hook (0-3 detik)
- **Diucapkan:** kalimat pembuka, maksimal 12 kata
- **Teks di layar:** maksimal 7 kata, huruf besar semua
- **Visual:** apa yang terlihat di 3 detik pertama

## Isi
Tabel dengan kolom: | Detik | Visual | Diucapkan | Teks di layar |
Tiga sampai empat baris, berurutan, berhenti di detik yang disebutkan sebagai awal CTA.

## Penutup dan Ajakan
- **Diucapkan:** kalimat penutup
- **Teks di layar:** ajakannya
- **Visual:** apa yang terlihat

## Caption
Kalimat pertama harus menahan orang berhenti menggulir. Lalu isi tiga sampai lima kalimat. Tutup dengan ajakan.

## Tagar
Delapan sampai dua belas tagar, campuran umum dan lokal Aceh.

## Kebutuhan Produksi
Talent, lokasi, properti, gaya musik, dan catatan izin bila perlu mengambil gambar di area pasien.

=== BILA FORMATNYA CAROUSEL ===

Tabel dengan kolom: | Halaman | Judul di Gambar | Teks Pendukung | Ide Visual |
Halaman pertama WAJIB hook, halaman terakhir WAJIB ajakan. Judul di gambar maksimal 7 kata; teks pendukung maksimal 20 kata.

Sesudah tabelnya: ## Caption dan ## Tagar seperti di atas.

=== BILA FORMATNYA FOTO TUNGGAL, POSTER, ATAU FEED BIASA ===

## Ide Visual
Satu gambar. Jelaskan susunannya: apa yang jadi pusat perhatian, apa latarnya, warna dan nadanya.

## Teks di Gambar
- **Judul:** maksimal 7 kata
- **Anak judul:** maksimal 12 kata

## Caption
## Tagar

=== AJAKAN MENGIKUTI TAHAP CORONG ===

Ini yang paling sering keliru di akun rumah sakit: semua konten ditutup "segera buat janji temu", termasuk edukasi yang ditonton orang yang belum merasa sakit. Yang begitu terasa seperti jualan, dan orang berhenti mengikuti.

- **TOFU** — ajak MENYIMPAN atau MEMBAGIKAN. "Simpan dulu, siapa tahu perlu." "Bagikan ke keluarga." JANGAN mengajak berobat, jangan menyebut nomor pendaftaran.
- **MOFU** — ajak MENCARI TAHU. "Lihat jadwal poliklinik." "Tanya di kolom komentar." Boleh menyebut poliklinik dan dokternya.
- **BOFU** — baru di sini ajak DATANG. Buat janji lewat WhatsApp, jam praktik, alur pendaftaran BPJS, jam IGD.

=== ATURAN YANG TIDAK BOLEH DILANGGAR ===

- Jangan menjanjikan kesembuhan, dan jangan mengesankan satu tindakan pasti berhasil.
- Jangan menakut-nakuti. Nada yang dipakai menolong, bukan mengancam.
- Jangan menyebut nama pasien, kondisi perorangan, atau apa pun yang menyerempet rekam medis.
- Nama dokter ditulis persis seperti yang diberikan, lengkap gelarnya. Bila tidak ada nama dokter yang diberikan, tulis peran umumnya saja — JANGAN mengarang nama.
- Jangan membandingkan dengan rumah sakit lain.
- Bahasa Indonesia yang hangat dan lugas. Boleh sedikit logat Aceh pada sapaan bila terasa wajar.$instruksi$,

-- ------------------------------------------------------------
-- Pola perintah
-- ------------------------------------------------------------
$pola$Buatkan konsep produksi untuk satu konten berikut.

- Tanggal tayang   : {{tanggal}}
- Tahap corong     : {{tahap}}
- Pilar konten     : {{pilar}}
- Topik dan judul  : {{topik}}
- Format dan kanal : {{format}}
- Angle yang sudah ditetapkan : {{angle}}
- Dokter / narasumber : {{dokter}}
- Poliklinik / layanan : {{poliklinik}}
- Catatan tambahan : {{catatan}}

Batas yang harus dipatuhi:
- Video pendek (Reels, TikTok): durasi total {{durasi_video}} detik. Jangan lebih.
- Carousel: maksimal {{maks_carousel}} halaman. Jangan lebih.
- Foto tunggal atau poster: satu gambar saja.

Bila "Format dan kanal" menyebut lebih dari satu kanal, pilih SATU yang paling utama dan susun konsepnya untuk itu; sebutkan di awal kanal mana yang Anda pilih dan kenapa, dalam satu kalimat.

Bila "Angle yang sudah ditetapkan" berisi keterangan, itu pijakan yang harus diikuti — jangan diganti dengan gagasan lain.

Mulai dokumen dengan satu baris judul: tanggal, format, dan judul kontennya. Jangan menambahkan pengantar, penutup, atau catatan tentang apa yang Anda kerjakan.$pola$,

-- ------------------------------------------------------------
-- Isian
-- ------------------------------------------------------------
$kolom$[
  {"kunci":"topik","label":"Topik dan Judul Konten","jenis":"textarea","wajib":true,
   "petunjuk":"Disalin dari kolom Topik pada kalender. Boleh juga ditulis sendiri untuk konten di luar kalender.",
   "contoh":"Kenali gejala serangan jantung; jangan tunggu reda"},
  {"kunci":"format","label":"Format dan Kanal","jenis":"select",
   "pilihan":["Reels Instagram","Video TikTok","Carousel Instagram","Foto Tunggal Instagram","Poster","Story"],
   "bawaan":"Carousel Instagram"},
  {"kunci":"tahap","label":"Tahap Corong","jenis":"select","pilihan":["TOFU","MOFU","BOFU"],"bawaan":"MOFU",
   "petunjuk":"Menentukan bentuk ajakannya. TOFU mengajak menyimpan, MOFU mengajak mencari tahu, BOFU baru mengajak datang."},
  {"kunci":"tanggal","label":"Tanggal Tayang","jenis":"date"},
  {"kunci":"pilar","label":"Pilar Konten","jenis":"text","contoh":"Edukasi"},
  {"kunci":"angle","label":"Angle yang Sudah Ditetapkan","jenis":"textarea",
   "petunjuk":"Boleh dikosongkan. Kalau diisi, inilah pijakan yang harus diikuti."},
  {"kunci":"dokter","label":"Dokter / Narasumber","jenis":"text",
   "petunjuk":"Kosongkan bila tidak ada. Jangan diisi nama yang tidak ada di Daftar Dokter."},
  {"kunci":"poliklinik","label":"Poliklinik / Layanan","jenis":"text"},
  {"kunci":"durasi_video","label":"Durasi Video (detik)","jenis":"number","bawaan":"60"},
  {"kunci":"maks_carousel","label":"Maksimal Halaman Carousel","jenis":"number","bawaan":"4"},
  {"kunci":"catatan","label":"Catatan Tambahan","jenis":"textarea",
   "petunjuk":"Acara yang menyertainya, larangan tertentu, atau permintaan khusus."}
]$kolom$::jsonb,

    false, true,
    coalesce((select max(urutan) from modul_ai), 0) + 1,
    true, false, true
where not exists (select 1 from modul_ai where judul = 'Konsep Konten');


-- ============================================================
-- CEK
-- ============================================================
select judul, kategori, aktif, pakai_dokter, pakai_layanan,
       (select count(*) from jsonb_array_elements(kolom)) as jumlah_isian
  from modul_ai order by urutan, id;
