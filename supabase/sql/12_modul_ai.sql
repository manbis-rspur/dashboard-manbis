-- ============================================================
-- 12. MODUL BANTUAN AI — HUMAS & MARKETING
--
-- Pindahan dari aplikasi "Sistem Informasi Humas & Marketing
-- RSPUR" yang sebelumnya berdiri sendiri. Empat hal sengaja
-- diubah, bukan disalin apa adanya:
--
--   1. Di sana modul buatan sendiri dan riwayat dokumen disimpan
--      di peramban masing-masing. Modul yang dibuat Humas tidak
--      terlihat oleh Marketing, dan semuanya hilang begitu data
--      peramban dibersihkan. Di sini keduanya tersimpan di
--      database dan menjadi milik tim.
--
--   2. Di sana tiga modul utama ditulis tetap di dalam kode,
--      sementara sisanya berupa data. Di sini SEMUANYA data,
--      sehingga tim bisa memperbaiki susunan perintahnya sendiri
--      tanpa menunggu siapa pun.
--
--   3. Di sana tidak ada login sama sekali. Di sini modul ini
--      hanya terbuka bagi yang diberi izin.
--
--   4. Di sana alamat AI-nya terbuka untuk umum — siapa pun yang
--      menemukannya bisa memakai kuota Gemini rumah sakit. Di
--      sini permintaan hanya dilayani untuk yang sudah masuk.
--
-- Jalankan di Supabase -> SQL Editor -> Run
-- Aman dijalankan berulang kali.
-- ============================================================


-- ------------------------------------------------------------
-- (1) Modul.
--
-- Kolom isian disimpan sebagai jsonb: tiap modul punya bentuk
-- formulir yang berbeda, dan memaksakannya jadi tabel tersendiri
-- hanya akan menyulitkan tanpa manfaat nyata.
--
-- 'bawaan' menandai enam modul asal. Modul bawaan boleh disunting
-- tapi tidak boleh dihapus — supaya tidak ada yang tak sengaja
-- membuang hasil kerja penyusunan perintah yang panjang itu.
-- ------------------------------------------------------------
create table if not exists modul_ai (
    id                bigserial primary key,
    judul             text not null,
    deskripsi         text not null,
    kategori          text not null default 'Umum',
    ikon              text not null default 'Sparkles',
    instruksi_sistem  text not null,
    pola_perintah     text not null,
    kolom             jsonb not null default '[]'::jsonb,
    bawaan            boolean not null default false,
    aktif             boolean not null default true,
    urutan            integer not null default 100,
    dibuat_oleh       bigint references pengguna(id),
    dibuat_pada       timestamptz not null default now(),
    diubah_pada       timestamptz
);

create index if not exists idx_modul_ai_urut on modul_ai(aktif, urutan, id);

alter table modul_ai enable row level security;


-- ------------------------------------------------------------
-- (2) Riwayat dokumen yang pernah dihasilkan.
--
-- Disimpan penuh, bukan hanya ringkasannya: menyusun ulang
-- perintah yang sama tidak menghasilkan tulisan yang sama, jadi
-- dokumen yang sudah dipakai harus bisa ditemukan kembali apa
-- adanya.
-- ------------------------------------------------------------
create table if not exists riwayat_ai (
    id           bigserial primary key,
    modul_id     bigint references modul_ai(id) on delete set null,
    modul_judul  text not null,
    judul        text not null,
    hasil        text not null,
    masukan      jsonb,
    oleh         bigint not null references pengguna(id),
    pada         timestamptz not null default now()
);

create index if not exists idx_riwayat_ai on riwayat_ai(pada desc);

alter table riwayat_ai enable row level security;


-- ------------------------------------------------------------
-- (3) Siapa boleh apa.
--
-- Semua yang berizin melihat seluruh modul dan seluruh riwayat —
-- memang itu gunanya dipindahkan ke database: supaya hasil kerja
-- satu orang bisa dipakai yang lain.
--
-- Menyunting modul: siapa pun yang berizin. Ini perkakas kerja
-- bersama, bukan milik perseorangan.
-- Menghapus: hanya modul buatan sendiri, dan tidak pernah untuk
-- modul bawaan.
-- ------------------------------------------------------------
drop policy if exists modul_ai_baca on modul_ai;
create policy modul_ai_baca on modul_ai
    for select to authenticated using (boleh_akses('humas'));

drop policy if exists modul_ai_buat on modul_ai;
create policy modul_ai_buat on modul_ai
    for insert to authenticated
    with check (boleh_akses('humas') and dibuat_oleh = id_saya() and bawaan = false);

drop policy if exists modul_ai_sunting on modul_ai;
create policy modul_ai_sunting on modul_ai
    for update to authenticated
    using (boleh_akses('humas'))
    with check (boleh_akses('humas'));

drop policy if exists modul_ai_hapus on modul_ai;
create policy modul_ai_hapus on modul_ai
    for delete to authenticated
    using (
        boleh_akses('humas')
        and bawaan = false
        and (dibuat_oleh = id_saya() or peran_saya() = 'Admin')
    );

drop policy if exists riwayat_ai_baca on riwayat_ai;
create policy riwayat_ai_baca on riwayat_ai
    for select to authenticated using (boleh_akses('humas'));

drop policy if exists riwayat_ai_tulis on riwayat_ai;
create policy riwayat_ai_tulis on riwayat_ai
    for insert to authenticated
    with check (boleh_akses('humas') and oleh = id_saya());

drop policy if exists riwayat_ai_hapus on riwayat_ai;
create policy riwayat_ai_hapus on riwayat_ai
    for delete to authenticated
    using (boleh_akses('humas') and (oleh = id_saya() or peran_saya() = 'Admin'));


-- ------------------------------------------------------------
-- (4) Izin awal: Koordinator, Humas, dan Digital Marketing.
-- ------------------------------------------------------------
insert into akses_modul (pengguna_id, modul)
select p.id, 'humas'
  from pengguna p
 where p.jabatan in ('Koordinator Manajemen Bisnis', 'Humas', 'Digital Marketing')
on conflict do nothing;


-- ------------------------------------------------------------
-- (5) Enam modul awal.
--
-- Ketiganya yang pertama dulu ditulis tetap di dalam kode aplikasi
-- lama; di sini semuanya menjadi data yang bisa diperbaiki sendiri
-- oleh tim. Susunan perintahnya dipertahankan apa adanya — di
-- situlah nilai sesungguhnya, dan mengarangnya ulang berarti
-- membuang pekerjaan yang sudah matang.
--
-- Penanda {{kunci}} pada pola perintah diganti isian formulir.
-- ------------------------------------------------------------
insert into modul_ai (judul, deskripsi, kategori, ikon, urutan, bawaan, instruksi_sistem, pola_perintah, kolom)
select * from (values

-- ---------- 1. Siaran Pers ----------
('Siaran Pers Resmi',
 'Menyusun siaran media resmi RSPUR dengan struktur baku pers: dateline, lead 5W+1H, kutipan pimpinan, sampai kontak media.',
 'Publikasi & Media', 'Newspaper', 10, true,
$instruksi$Tulis Siaran Media Resmi (Press Release) untuk Rumah Sakit Pertamedika Ummi Rosnati (RSPUR).

STRUKTUR WAJIB DAN AKURAT:
1. Header paling atas:
# HUMAS RSPUR | Rumah Sakit Pertamedika Ummi Rosnati | SIARAN MEDIA RESMI
2. Judul Siaran Pers besar dan tegas, menarik minat editor media berita.
3. Dateline lokasi dan tanggal dengan huruf kapital tebal, langsung disambung paragraf pembuka berupa lead berita 5W+1H yang ringkas, lugas, dan bernilai berita tinggi.
4. Paragraf latar belakang dan pernyataan resmi Direktur/Pimpinan berupa kutipan langsung yang berbobot.
5. Poin-poin komitmen dan manfaat nyata bagi pasien serta masyarakat luas, dalam daftar bernomor yang rapi.
6. Bagian resmi:
### PROSESI PENANDATANGANAN / KEGIATAN DIHADIRI OLEH:
Tampilkan terpisah dan terstruktur antara pihak Manajemen RSPUR dan pihak Mitra / Tamu Kehormatan.
7. Paragraf penutup berisi ajakan dan harapan ke depan.
8. Catatan kontak media:
**Untuk Informasi Lebih Lanjut:**
Bagian Humas & Komunikasi Publik RSPUR
Rumah Sakit Pertamedika Ummi Rosnati
Footer penutup: *Disusun oleh: HUMAS RSPUR*

GAYA BAHASA:
Formal, kredibel, sesuai kode etik jurnalistik, bebas basa-basi.

Jangan mengarang angka, nama pejabat, nomor telepon, atau fakta yang tidak diberikan. Bila sebuah keterangan tidak tersedia, tulis dalam kurung siku sebagai bagian yang harus dilengkapi manusia, misalnya [nama Direktur].$instruksi$,
$pola$Tema/Judul Kegiatan : {{tema}}
Lokasi dan Tanggal  : {{tanggal_lokasi}}
Target Distribusi   : {{target_media}}
Gaya Bahasa         : {{gaya_bahasa}}

Poin-poin Komitmen  :
{{komitmen}}

Daftar Hadir        :
{{hadirin}}$pola$,
$kolom$[
 {"kunci":"tema","label":"Tema / Judul Kegiatan","jenis":"text","wajib":true,"contoh":"Penandatanganan MoU RSPUR dengan Jasa Raharja"},
 {"kunci":"tanggal_lokasi","label":"Lokasi dan Tanggal","jenis":"text","contoh":"Banda Aceh, 12 September 2026"},
 {"kunci":"target_media","label":"Target Distribusi","jenis":"select","pilihan":["Media Massa Lokal Aceh","Media Nasional","Media Sosial Resmi RSPUR","Internal Rumah Sakit"],"bawaan":"Media Massa Lokal Aceh"},
 {"kunci":"gaya_bahasa","label":"Gaya Bahasa","jenis":"select","pilihan":["Formal Jurnalistik Standar Pers (5W+1H)","Formal Hangat dan Humanis","Ringkas untuk Media Sosial"],"bawaan":"Formal Jurnalistik Standar Pers (5W+1H)"},
 {"kunci":"komitmen","label":"Poin-poin Komitmen","jenis":"textarea","petunjuk":"Satu poin per baris. Inilah yang jadi isi utama siaran pers.","contoh":"Perluasan akses layanan gawat darurat\nPenjaminan biaya bagi korban kecelakaan lalu lintas"},
 {"kunci":"hadirin","label":"Daftar Hadir","jenis":"textarea","petunjuk":"Pisahkan pihak RSPUR dan pihak mitra.","contoh":"RSPUR: Direktur, Wadir Pelayanan Medis\nMitra: Kepala Cabang Jasa Raharja Aceh"}
]$kolom$::jsonb),

-- ---------- 2. Kalender Konten ----------
('Kalender Konten',
 'Rencana konten bulanan atau setahun penuh beserta pilar konten, kanal, PIC, dan target capaian — siap dibagi ke tim desain dan videografer.',
 'Konten & Media Sosial', 'CalendarDays', 20, true,
$instruksi$Anda adalah Content Strategist sekaligus PR Manager rumah sakit dengan pengalaman panjang di komunikasi kesehatan masyarakat, bekerja untuk Rumah Sakit Pertamedika Ummi Rosnati (RSPUR).

Susun kalender konten yang edukatif, menarik, etis secara medis, terstruktur rapi, dan mudah didelegasikan ke tim desainer grafis, videografer, dan copywriter rumah sakit.

Awali dokumen dengan dua bagian ringkas: Strategi dan Sasaran Kampanye, lalu Target Capaian Utama.

Bila format yang diminta TABEL, sajikan jadwalnya sebagai tabel markdown dengan kolom:
| Minggu / Tanggal | Pilar Konten | Topik & Judul Konten | Format & Kanal | Konsep / Angle Copywriting | PIC & Tim Produksi | Target Capaian |
Setiap baris harus terperinci, realistis, dan siap dikerjakan.

Bila format yang diminta DAFTAR, gunakan judul bagian per bulan atau per minggu, lalu daftar berpoin:
- **[Tanggal/Hari]** : [Judul Konten] — [Kanal & Format] — [Brief singkat & PIC]

Tutup dengan tabel ringkas jam dan hari tayang terbaik, serta beberapa poin rekomendasi eksekusi dan evaluasi.

Bila pilar Hari Besar Nasional dan Keagamaan dipilih, sertakan juga hari penting di luar hari kesehatan — misalnya Tahun Baru, Idul Fitri, Idul Adha, Natal, Hari Kemerdekaan, Hari Kartini, Hari Ibu, Hari Pendidikan Nasional, dan hari besar daerah Aceh. Kaitkan tiap hari besar dengan pesan yang wajar bagi rumah sakit: ucapan, informasi jadwal layanan selama libur, atau imbauan kesehatan yang relevan dengan kebiasaan pada hari itu. Jangan memaksakan kaitan medis yang dibuat-buat, dan jangan memakai hari berkabung sebagai bahan promosi layanan.

Jangan menjanjikan klaim medis yang berlebihan, dan hindari topik yang menyerempet iklan layanan berbayar yang melanggar etika rumah sakit.$instruksi$,
$pola$Buatkan kalender konten dan strategi publikasi Humas RSPUR yang lengkap, terstruktur, dan siap dikerjakan.

- Tema / Kampanye Utama : {{topik}}
- Kanal Distribusi      : {{kanal}}
- Durasi Kalender       : {{durasi}}
- Bulan & Tahun Mulai   : {{bulan_mulai}} {{tahun}}
- Pilar Konten Fokus    : {{pilar_konten}}
- Format Keluaran       : {{format_keluaran}}

Untuk durasi satu minggu, susun tujuh hari berurutan dari Senin sampai Minggu, satu sampai dua konten tiap hari, dan sebutkan nama harinya. Cantumkan tanggal hanya bila tanggalnya memang diberikan.
Untuk durasi satu bulan, tampilkan kegiatan harian teratur sekitar tiga sampai empat konten per minggu, berurutan dari awal hingga akhir bulan.
Untuk durasi satu tahun, susun dua belas bulan berturut-turut, tiap bulan empat sampai enam kegiatan utama lengkap dengan PIC, format visual, dan target capaian.$pola$,
$kolom$[
 {"kunci":"topik","label":"Fokus Tema / Kampanye","jenis":"text","wajib":true,"contoh":"Kampanye Cegah Stunting dan Gizi Anak"},
 {"kunci":"kanal","label":"Kanal Distribusi","jenis":"select","pilihan":["Semua Kanal (Omnichannel)","Instagram","TikTok","Facebook","YouTube","Website RSPUR","WhatsApp Broadcast"],"bawaan":"Semua Kanal (Omnichannel)"},
 {"kunci":"durasi","label":"Durasi Kalender","jenis":"select","pilihan":["1 Minggu (jadwal harian)","1 Bulan (jadwal harian)","12 Bulan (rencana tahunan)"],"bawaan":"1 Bulan (jadwal harian)"},
 {"kunci":"bulan_mulai","label":"Bulan Mulai","jenis":"select","pilihan":["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"],"bawaan":"September"},
 {"kunci":"tahun","label":"Tahun","jenis":"number","bawaan":"2026"},
 {"kunci":"pilar_konten","label":"Pilar Konten","jenis":"multiselect","boleh_lain":true,"pilihan":["Edukasi Medis & Preventif","Profil Dokter Spesialis & Fasilitas","Testimoni & Kisah Pasien","Promo Layanan & Paket Pemeriksaan","Hari Kesehatan Nasional & Internasional","Hari Besar Nasional & Keagamaan","Kegiatan Sosial & CSR","Informasi Layanan & Jadwal Praktik"],"bawaan":["Edukasi Medis & Preventif","Profil Dokter Spesialis & Fasilitas"]},
 {"kunci":"format_keluaran","label":"Format Keluaran","jenis":"select","pilihan":["Tabel","Daftar"],"bawaan":"Tabel"}
]$kolom$::jsonb),

-- ---------- 3. Event Planner ----------
('Perencana Event Kesehatan',
 'Rencana operasional acara: rundown, alur peserta, pembagian tim, logistik medis dan non-medis, sampai mitigasi risiko lapangan.',
 'Acara & Kegiatan', 'CalendarCheck', 30, true,
$instruksi$Anda adalah Event Director sekaligus penanggung jawab logistik untuk acara kesehatan masyarakat Rumah Sakit Pertamedika Ummi Rosnati (RSPUR).

Berikan rencana operasional yang lengkap, taktis, dan mendalam — siap dicetak sebagai lembar kerja panitia.

Susun dengan urutan bagian berikut:
1. Ide dan konsep kegiatan
2. Rundown dan susunan acara kronologis
3. Alur peserta dari kedatangan sampai pulang
4. Pembagian tim dan uraian tugas
5. Logistik medis dan bahan habis pakai, dihitung untuk jumlah peserta yang diberikan ditambah cadangan aman 20 persen, termasuk penanganan limbah dan keselamatan kerja
6. Logistik non-medis, branding, dan alat tulis
7. Manajemen risiko lapangan beserta pencegahan dan solusi daruratnya

Bila format yang diminta TABEL, sajikan bagian 4 sampai 7 sebagai tabel markdown. Bila DAFTAR, gunakan daftar berpoin dengan judul bagian yang sama.

Angka kebutuhan logistik harus dihitung dari jumlah peserta yang diberikan, bukan dikarang. Bila sebuah harga atau biaya tidak diketahui, tulis sebagai perkiraan kasar dan tandai bahwa masih perlu dikonfirmasi.$instruksi$,
$pola$Rincian permintaan acara kesehatan RSPUR:

- Nama Acara         : {{nama_event}}
- Jenis Acara        : {{jenis_event}}
- Perkiraan Peserta  : {{jumlah_peserta}} orang
- Durasi Acara       : {{durasi}}
- Target Peserta     : {{target_peserta}}
- Layanan Medis      : {{layanan_medis}}
- Tujuan Utama       : {{tujuan}}
- Jumlah Panitia     : {{jumlah_tim}} orang
- Indikasi Anggaran  : {{anggaran}}
- Ada Games          : {{ada_games}}
- Ada Souvenir       : {{ada_souvenir}}
- Ada Senam Bersama  : {{ada_senam}}
- Tema Khusus        : {{tema_khusus}}
- Format Keluaran    : {{format_keluaran}}$pola$,
$kolom$[
 {"kunci":"nama_event","label":"Nama Acara","jenis":"text","wajib":true,"contoh":"Bakti Sosial Cek Kesehatan Gratis"},
 {"kunci":"jenis_event","label":"Jenis Acara","jenis":"select","pilihan":["Bakti Sosial & Pemeriksaan Gratis","Seminar / Talkshow Kesehatan","Senam & Gaya Hidup Sehat","Donor Darah","Peringatan Hari Kesehatan","Peresmian Layanan Baru"],"bawaan":"Bakti Sosial & Pemeriksaan Gratis"},
 {"kunci":"jumlah_peserta","label":"Perkiraan Jumlah Peserta","jenis":"number","bawaan":"200"},
 {"kunci":"durasi","label":"Durasi Acara","jenis":"text","bawaan":"1 hari (07.00 - 12.00)"},
 {"kunci":"target_peserta","label":"Target Peserta","jenis":"multiselect","boleh_lain":true,"pilihan":["Masyarakat Umum","Lansia","Ibu Hamil & Menyusui","Anak & Remaja","Karyawan Perusahaan Mitra","Tenaga Kesehatan"],"bawaan":["Masyarakat Umum"]},
 {"kunci":"layanan_medis","label":"Layanan Medis yang Disediakan","jenis":"multiselect","boleh_lain":true,"pilihan":["Pemeriksaan Tekanan Darah","Gula Darah & Kolesterol","Pemeriksaan Gigi","Konsultasi Dokter Umum","Konsultasi Dokter Spesialis","Skrining Gizi & Tumbuh Kembang","Donor Darah"],"bawaan":["Pemeriksaan Tekanan Darah","Gula Darah & Kolesterol"]},
 {"kunci":"tujuan","label":"Tujuan Utama","jenis":"textarea","bawaan":"Edukasi dan skrining kesehatan masyarakat"},
 {"kunci":"jumlah_tim","label":"Jumlah Panitia","jenis":"number","bawaan":"15"},
 {"kunci":"anggaran","label":"Indikasi Anggaran","jenis":"text","contoh":"Sekitar 15 juta rupiah"},
 {"kunci":"ada_games","label":"Sertakan ide games edukasi berhadiah","jenis":"checkbox","bawaan":"true"},
 {"kunci":"ada_souvenir","label":"Sertakan rekomendasi souvenir sehat","jenis":"checkbox","bawaan":"true"},
 {"kunci":"ada_senam","label":"Sertakan sesi senam bersama","jenis":"checkbox","bawaan":"false"},
 {"kunci":"tema_khusus","label":"Tema Khusus","jenis":"text","contoh":"Hari Jantung Sedunia"},
 {"kunci":"format_keluaran","label":"Format Keluaran","jenis":"select","pilihan":["Tabel","Daftar"],"bawaan":"Tabel"}
]$kolom$::jsonb),

-- ---------- 4. Manajemen Krisis ----------
('Manajemen Krisis & Klarifikasi Isu',
 'Tanggapan cepat atas isu, pernyataan klarifikasi resmi, atau penangkal kabar bohong medis — lengkap dengan panduan jawaban untuk admin media sosial.',
 'Manajemen Krisis & Reputasi', 'ShieldAlert', 40, true,
$instruksi$Anda adalah Kepala Humas dan Komunikasi Krisis rumah sakit yang berpengalaman.

Rumuskan pernyataan klarifikasi dan penanganan isu publik secara profesional: mengutamakan keselamatan pasien, berempati tinggi, menjunjung etika kedokteran, dan menjaga reputasi Rumah Sakit Pertamedika Ummi Rosnati (RSPUR).

STRUKTUR RESPON KLARIFIKASI:
1. Judul klarifikasi resmi
2. Pernyataan empati dan apresiasi atas masukan masyarakat serta empati mendalam kepada pasien
3. Fakta dan kronologi yang transparan, dijelaskan berimbang tanpa menyalahkan pihak mana pun
4. Tindakan korektif dan komitmen RSPUR berupa langkah nyata evaluasi serta perbaikan layanan
5. Saluran pengaduan resmi rumah sakit
6. Panduan tanya-jawab singkat untuk customer service dan admin media sosial: dua sampai tiga kemungkinan pertanyaan warganet beserta arahan jawabannya

Jangan mengakui kesalahan hukum, menyebut nama pasien atau tenaga medis, atau mengungkapkan rekam medis. Bila fakta belum lengkap, sarankan pernyataan sementara yang jujur bahwa penelusuran masih berjalan.$instruksi$,
$pola$Mohon buatkan dokumen tanggapan klarifikasi krisis rumah sakit dengan rincian:

- Isu / Masalah      : {{isu}}
- Fakta Internal     : {{fakta}}
- Saluran Rilis      : {{saluran}}
- Nada Penyampaian   : {{nada}}$pola$,
$kolom$[
 {"kunci":"isu","label":"Isu / Keluhan / Kabar Bohong yang Beredar","jenis":"textarea","wajib":true,"contoh":"Isu di media sosial tentang dugaan lambatnya penanganan antrean IGD pada malam hari"},
 {"kunci":"fakta","label":"Fakta Internal & Kronologi Sebenarnya","jenis":"textarea","petunjuk":"Sebutkan fakta objektif dan prosedur yang sudah dijalankan. Jangan menyertakan identitas pasien.","contoh":"Pasien tiba pukul 23.10, dilakukan triase dalam 4 menit, penanganan sesuai derajat kegawatan"},
 {"kunci":"saluran","label":"Media Publikasi Klarifikasi","jenis":"select","pilihan":["Siaran Pers Media Massa","Unggahan Resmi Instagram/Facebook","Surat Jawaban Langsung ke Pasien/Keluarga","Internal Rumah Sakit"],"bawaan":"Unggahan Resmi Instagram/Facebook"},
 {"kunci":"nada","label":"Nada Penyampaian","jenis":"select","pilihan":["Empatik & Menenangkan","Tegas Berbasis Bukti Medis","Edukatif & Solutif"],"bawaan":"Empatik & Menenangkan"}
]$kolom$::jsonb),

-- ---------- 5. Script Video ----------
('Naskah Video Edukasi Dokter',
 'Naskah video pendek 45-60 detik untuk Reels, TikTok, atau Shorts: hook pembuka, arahan visual, dialog per bagian, sampai caption dan tagar.',
 'Konten & Media Sosial', 'Video', 50, true,
$instruksi$Anda adalah creative director sekaligus penulis naskah medis untuk video pendek di akun resmi rumah sakit.

Susun naskah video edukasi berdurasi 45 sampai 60 detik yang menarik, mudah dipahami masyarakat awam tanpa istilah medis rumit, dan tetap kredibel.

STRUKTUR NASKAH:
1. Informasi video: judul, sasaran penonton, rekomendasi audio
2. Hook detik 0-3: kalimat pembuka yang menghentikan gulir penonton
3. Arahan visual dan talent: gerakan, ekspresi, properti dokter di depan kamera
4. Naskah per bagian pada detik 0-15, 15-35, dan 35-50: dialog dokter beserta tulisan di layar
5. Ajakan pada detik 50-60 yang mengarah ke layanan RSPUR
6. Caption siap unggah beserta tagar yang relevan

Informasi medis harus benar dan berhati-hati: sebutkan bahwa gejala bisa berbeda pada tiap orang, dan arahkan penonton berkonsultasi, bukan mendiagnosis diri sendiri.$instruksi$,
$pola$Buatkan naskah video pendek edukasi medis RSPUR:

- Topik               : {{topik}}
- Spesialisasi Dokter : {{spesialisasi}}
- Gaya Pembawaan      : {{gaya}}
- Ajakan Penutup      : {{ajakan}}$pola$,
$kolom$[
 {"kunci":"topik","label":"Topik Kesehatan","jenis":"text","wajib":true,"contoh":"Gejala darah tinggi yang sering diabaikan"},
 {"kunci":"spesialisasi","label":"Spesialisasi / Poliklinik","jenis":"select","pilihan":["Spesialis Jantung & Pembuluh Darah","Spesialis Penyakit Dalam","Spesialis Anak","Spesialis Kebidanan & Kandungan","Spesialis Saraf","Dokter Gigi","Dokter Umum"],"bawaan":"Spesialis Jantung & Pembuluh Darah"},
 {"kunci":"gaya","label":"Gaya Pembawaan","jenis":"select","pilihan":["Santai dan Edukatif","Mitos vs Fakta Cepat","Bercerita dari Kasus Pasien"],"bawaan":"Santai dan Edukatif"},
 {"kunci":"ajakan","label":"Ajakan Penutup","jenis":"text","bawaan":"Konsultasikan gejala Anda di Poli Spesialis RSPUR"}
]$kolom$::jsonb),

-- ---------- 6. Respon Ulasan ----------
('Balasan Ulasan & Komplain Pasien',
 'Draft balasan untuk ulasan Google Maps, pesan WhatsApp, atau survei kepuasan — dua versi sekaligus, ringkas dan lengkap.',
 'Layanan Pelanggan', 'MessageSquareText', 60, true,
$instruksi$Anda adalah petugas hubungan pasien Rumah Sakit Pertamedika Ummi Rosnati (RSPUR).

Balas ulasan dan komplain pasien secara santun, menghargai perasaan pasien, dan menunjukkan kesungguhan rumah sakit menjaga mutu pelayanan.

PRINSIP WAJIB:
- Jangan pernah berdebat atau membela diri
- Selalu berterima kasih dan menyampaikan maaf atas ketidaknyamanan
- Berikan dua pilihan draft balasan:
  Pilihan 1 — ringkas dan hangat, cocok untuk Google Review atau media sosial
  Pilihan 2 — lengkap dan personal, cocok untuk pesan pribadi, WhatsApp, atau surel
- Sertakan arahan menghubungi layanan pelanggan RSPUR untuk penelusuran lebih lanjut

Jangan menyebut kondisi medis, diagnosis, atau data pasien di ruang publik — walaupun pasien sendiri yang menyebutnya lebih dulu. Ajak pindah ke jalur pribadi untuk hal seperti itu.$instruksi$,
$pola$Susun balasan untuk ulasan pasien:

- Tipe Ulasan   : {{tipe}}
- Isi Ulasan    : {{isi_ulasan}}
- Unit Terkait  : {{unit}}$pola$,
$kolom$[
 {"kunci":"tipe","label":"Tipe Ulasan / Rating","jenis":"select","pilihan":["Bintang 1-2 (keluhan kritis)","Bintang 3 (netral / masukan sarana)","Bintang 4-5 (pujian & apresiasi)"],"bawaan":"Bintang 1-2 (keluhan kritis)"},
 {"kunci":"isi_ulasan","label":"Teks Ulasan Pasien / Keluarga","jenis":"textarea","wajib":true,"contoh":"Dokternya ramah, tapi menunggu obat di farmasi sangat lama"},
 {"kunci":"unit","label":"Unit / Poli yang Disebut","jenis":"text","bawaan":"Layanan Rumah Sakit"}
]$kolom$::jsonb)

) as m(judul, deskripsi, kategori, ikon, urutan, bawaan, instruksi_sistem, pola_perintah, kolom)
where not exists (select 1 from modul_ai where modul_ai.judul = m.judul);


-- ============================================================
-- CEK — modul yang tersedia dan siapa yang berhak membukanya.
-- ============================================================
select judul, kategori, jsonb_array_length(kolom) as jumlah_isian
  from modul_ai order by urutan;

select p.nama, p.jabatan,
       case when p.peran = 'Admin' then 'berhak (Admin)'
            when exists (select 1 from akses_modul a
                          where a.pengguna_id = p.id and a.modul = 'humas')
                 then 'berhak (diberi izin)'
            else 'tidak berhak' end as akses_humas
  from pengguna p order by p.id;
