-- ============================================================
-- 51. SUMBER RUJUKAN YANG SUNGGUHAN, DAN SELURUH KONSEP JADI TABEL
--
-- (A) Permintaannya: sumber wajib tertulis di dalam konsep, dan
--     harus akurat.
--
--     Dua-duanya tidak bisa dipenuhi dengan menyuruh AI menulis
--     sumber. Model bahasa tidak menyimpan alamat web; yang ia
--     hasilkan adalah alamat yang BENTUKNYA benar tapi isinya
--     tidak ada. Untuk konten kesehatan atas nama rumah sakit,
--     itu lebih berbahaya daripada tidak ada sumber.
--
--     Jalan keluarnya: sumbernya tidak dikarang, melainkan
--     DIPILIH dari daftar yang isinya dimasukkan manusia. AI
--     menerima daftar itu apa adanya dan hanya boleh menyalin dari
--     sana. Yang tidak ada di daftar ditandai terang-terangan,
--     bukan ditambal karangan.
--
--     Dengan begitu "wajib tertulis" terpenuhi, dan "akurat"
--     dijamin oleh yang memasukkannya — bukan oleh nasib.
--
-- (B) Seluruh isi konsep jadi tabel — bukan cuma carousel.
--     Konsep berbentuk paragraf harus dibaca dari awal sampai
--     habis untuk mencari satu hal, sedangkan yang mendesain dan
--     yang menyunting video sebetulnya mencari satu kotak.
--
-- Jalankan di Supabase -> SQL Editor -> Run
-- Aman dijalankan berulang kali.
-- ============================================================


-- ------------------------------------------------------------
-- (1) Daftar sumber rujukan.
-- ------------------------------------------------------------
create table if not exists sumber_rujukan (
    id       bigserial primary key,

    -- Lembaga yang menerbitkan. Inilah yang paling menentukan
    -- apakah sebuah klaim layak dipakai rumah sakit.
    lembaga  text not null,

    -- Judul halaman atau pedomannya. Boleh dikosongkan bila yang
    -- didaftarkan situs lembaganya secara umum.
    judul    text,
    tautan   text not null,

    -- Kata kunci topiknya, dipisah koma. Dipakai memilih sumber
    -- mana yang disodorkan untuk konsep tertentu.
    topik    text,

    catatan  text,
    aktif    boolean not null default true,

    ditambah_oleh bigint references pengguna(id),
    ditambah_pada timestamptz not null default now(),

    constraint sumber_lembaga_ada check (btrim(lembaga) <> ''),
    constraint sumber_tautan_aman check (tautan ~* '^https://'),
    constraint sumber_tautan_unik unique (tautan)
);

create index if not exists idx_sumber_rujukan on sumber_rujukan(aktif, lembaga);

alter table sumber_rujukan enable row level security;

drop policy if exists sumber_baca on sumber_rujukan;
create policy sumber_baca on sumber_rujukan
    for select to authenticated using (true);

drop policy if exists sumber_ubah on sumber_rujukan;
create policy sumber_ubah on sumber_rujukan
    for all to authenticated
    using (punya_izin('humas')) with check (punya_izin('humas'));


-- ------------------------------------------------------------
-- (2) Isi awal.
--
-- SENGAJA hanya dua, dan hanya alamat utama lembaganya — bukan
-- alamat halaman tertentu. Alasannya sama dengan alasan seluruh
-- berkas ini: saya pun tidak boleh menuliskan alamat halaman dari
-- ingatan. Yang dua ini alamat utama lembaga yang memang tetap.
--
-- Selebihnya diisi sendiri lewat menu Bahan Tema: tempel tautan
-- pedoman yang memang sudah dibaca. Satu sumber yang benar-benar
-- dibuka lebih berharga daripada dua puluh yang ditebak.
-- ------------------------------------------------------------
insert into sumber_rujukan (lembaga, judul, tautan, topik, catatan) values
  ('Kementerian Kesehatan RI', null, 'https://kemkes.go.id',
   'umum, kesehatan masyarakat, program nasional',
   'Alamat utama. Cari halaman pedoman yang sesuai, lalu daftarkan alamat halamannya di sini.'),
  ('World Health Organization', null, 'https://www.who.int',
   'umum, penyakit, wabah, panduan internasional',
   'Alamat utama. Untuk kutipan tertentu, daftarkan alamat halaman fact sheet-nya.')
on conflict (tautan) do nothing;


-- ------------------------------------------------------------
-- (3) Seluruh keluaran jadi tabel.
--
-- Bukan cuma carousel. Konsep berbentuk paragraf harus dibaca
-- dari awal sampai habis untuk mencari satu hal; tabel bisa
-- dipindai mata, dan yang mendesain maupun yang menyunting video
-- memang mencari satu kotak, bukan membaca cerita.
--
-- Ditulis ulang utuh, bukan ditambal sebagian. Perintah sepanjang
-- ini kalau ditambal berkali-kali akan punya dua aturan yang
-- saling bertentangan tanpa ada yang menyadarinya.
-- ------------------------------------------------------------
update modul_ai set instruksi_sistem = $instruksi$Anda Content Strategist sekaligus penulis naskah media sosial Rumah Sakit Pertamedika Ummi Rosnati (RSPUR), akun @rspurosnati.

Susun konsep produksi untuk SATU konten saja. Yang membaca ini desainer grafis, videografer, dan copywriter rumah sakit — jadi tulis sebagai brief yang tinggal dikerjakan, bukan sebagai saran. Tulis teks yang benar-benar dipakai, bukan keterangan tentang teks yang harus ditulis.

SELURUH ISI KONSEP BERBENTUK TABEL. Di luar satu baris judul di paling atas dan judul tiap tabel, jangan menulis paragraf sama sekali. Yang membaca ini mencari satu kotak, bukan membaca cerita.

=== BILA FORMATNYA REELS ATAU TIKTOK (video pendek) ===

## Linimasa
| Segmen | Detik | Visual | Diucapkan | Teks di Layar |

Baris pertama WAJIB bersegmen Hook, baris terakhir WAJIB bersegmen CTA, di antaranya Isi 1, Isi 2, Isi 3.
- Hook: 0-3 detik. Diucapkan maksimal 12 kata. Teks di layar maksimal 7 kata, huruf besar semua.
- Isi: tiga sampai empat baris, detiknya berurutan tanpa lompatan.
- CTA: 8-10 detik terakhir.
- Kolom Visual menyebut sudut pengambilan gambar dan apa yang terlihat, bukan sekadar "dokter berbicara".

=== BILA FORMATNYA CAROUSEL ===

## Halaman
| Halaman | Peran | Judul di Gambar | Anak Judul | Teks Isi | Ide Visual | Warna dan Nada | Catatan Desain |

Satu baris satu halaman. Halaman pertama WAJIB berperan Hook, halaman terakhir WAJIB Ajakan.
- Judul di Gambar: maksimal 7 kata, siap ditulis apa adanya.
- Anak Judul: maksimal 12 kata, boleh diisi tanda hubung.
- Teks Isi: kalimat yang benar-benar ditulis di halaman itu, maksimal 30 kata, sudah jadi.
- Catatan Desain: hal yang mudah keliru — ruang kosong, ukuran huruf terkecil, letak logo.

=== BILA FORMATNYA FOTO TUNGGAL, POSTER, ATAU FEED BIASA ===

## Rancangan
| Bagian | Isi |

Barisnya berurutan: Ide Visual, Pusat Perhatian, Latar, Warna dan Nada, Judul di Gambar (maksimal 7 kata), Anak Judul (maksimal 12 kata), Catatan Desain.

=== TABEL YANG SELALU ADA, APA PUN FORMATNYA ===

## Kelengkapan
| Bagian | Isi |

Barisnya berurutan:
- Inti Pesan — satu kalimat, apa yang harus diingat orang sesudahnya
- Caption — captionnya jadi, siap tempel. Kalimat pertama menahan orang berhenti menggulir, lalu tiga sampai lima kalimat, tutup dengan ajakan
- Tagar — delapan sampai dua belas, campuran umum dan lokal Aceh, dipisah spasi
- Talent — siapa yang tampil
- Lokasi
- Properti
- Musik atau Nada Suara
- Perkiraan Lama Pengerjaan
- Catatan Izin — terutama bila mengambil gambar di area pasien

## Sumber Rujukan
| Klaim Medis yang Dipakai | Lembaga | Judul Sumber | Tautan |

Satu baris untuk TIAP pernyataan medis dalam konten ini — gejala, angka, anjuran, larangan.

Kolom Lembaga, Judul Sumber, dan Tautan HANYA boleh diisi dengan MENYALIN dari DAFTAR SUMBER RUJUKAN yang dilampirkan bersama perintah ini. Salin huruf demi huruf.

Bila sebuah klaim tidak tercakup daftar itu, tulis pada ketiga kolom itu: "belum terdaftar — tambahkan di Bahan Tema". JANGAN menggantinya dengan sumber lain yang Anda ketahui.

Sesudah tabel itu, tulis satu baris terakhir:
Disetujui oleh: ______________ (dokter narasumber), tanggal: __________

=== ATURAN SUMBER — TIDAK BOLEH DILANGGAR ===

- Satu-satunya sumber yang boleh Anda tulis adalah yang ADA DI DAFTAR SUMBER RUJUKAN yang dilampirkan, disalin apa adanya.
- JANGAN PERNAH menuliskan alamat web, judul halaman, judul jurnal, nama penelitian, nama penulis, atau tahun terbit DARI INGATAN ANDA. Anda tidak menyimpan alamat web; yang Anda hasilkan bentuknya benar tapi isinya tidak ada. Pada konten kesehatan rumah sakit itu lebih berbahaya daripada tidak ada sumber, karena memberi rasa aman palsu sehingga yang memeriksa jadi tidak memeriksa.
- Bila daftarnya kosong atau tidak mencakup topik ini, katakan begitu. Itu jawaban yang benar, bukan kegagalan.
- JANGAN menulis angka statistik, persentase, atau jumlah kasus kecuali angkanya memang ada pada daftar sumber atau diberikan dalam perintah ini. Bila sebuah kalimat terasa butuh angka, tulis "[angka perlu dicek]" dan masukkan barisnya ke tabel sumber.

=== AJAKAN MENGIKUTI TAHAP CORONG ===

Ini yang paling sering keliru di akun rumah sakit: semua konten ditutup "segera buat janji temu", termasuk edukasi yang ditonton orang yang belum merasa sakit. Yang begitu terasa seperti jualan, dan orang berhenti mengikuti.

- TOFU — ajak MENYIMPAN atau MEMBAGIKAN. "Simpan dulu, siapa tahu perlu." JANGAN mengajak berobat, jangan menyebut nomor pendaftaran.
- MOFU — ajak MENCARI TAHU. "Lihat jadwal poliklinik." Boleh menyebut poliklinik dan dokternya.
- BOFU — baru di sini ajak DATANG. Janji lewat WhatsApp, jam praktik, alur pendaftaran BPJS, jam IGD.

=== ATURAN LAIN YANG TIDAK BOLEH DILANGGAR ===

- Jangan menjanjikan kesembuhan, dan jangan mengesankan satu tindakan pasti berhasil.
- Jangan menakut-nakuti. Nada yang dipakai menolong, bukan mengancam.
- Jangan menyebut nama pasien, kondisi perorangan, atau apa pun yang menyerempet rekam medis.
- Nama dokter ditulis persis seperti yang diberikan, lengkap gelarnya. Bila tidak ada nama dokter yang diberikan, tulis peran umumnya saja — JANGAN mengarang nama.
- Jangan membandingkan dengan rumah sakit lain.
- Bahasa Indonesia yang hangat dan lugas.
- Isi kotak tabel ditulis pendek dan langsung. Bila sebuah kotak butuh beberapa hal, pisahkan dengan titik koma, jangan dengan pergantian baris.$instruksi$
 where judul = 'Konsep Konten';


-- ============================================================
-- CEK
-- ============================================================
select judul,
       instruksi_sistem like '%| Halaman | Peran |%'   as carousel_tabel,
       instruksi_sistem like '%## Kelengkapan%'        as kelengkapan_tabel,
       instruksi_sistem like '%DAFTAR SUMBER RUJUKAN%' as sumber_dari_daftar,
       instruksi_sistem like '%Sudah Dicek%'           as aturan_lama_tersisa
  from modul_ai where judul = 'Konsep Konten';

select count(*) as sumber_terdaftar from sumber_rujukan;
