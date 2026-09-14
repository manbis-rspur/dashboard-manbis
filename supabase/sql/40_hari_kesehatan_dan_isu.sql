-- ============================================================
-- 40. HARI KESEHATAN DAN ISU YANG SEDANG RAMAI
--
-- Keluhannya: menentukan tema campaign itu bagian paling sulit.
-- Orang berhenti di kotak pertama karena belum tahu mau mengangkat
-- apa — padahal bahannya sebetulnya sudah ada, cuma tidak pernah
-- dikumpulkan di satu tempat.
--
-- Dua sumber, sengaja dipisah karena sifatnya berbeda:
--
--   (1) Hari kesehatan — berulang tiap tahun, tanggalnya tetap,
--       bisa direncanakan jauh hari. Inilah tulang punggung
--       kalender konten bulanan.
--
--   (2) Isu yang sedang ramai — mpox, kabut asap, demam berdarah
--       musim hujan. Tidak berulang, punya masa berlaku, dan yang
--       paling tahu justru orangnya sendiri, bukan program.
--
-- Tanggal yang berpindah tiap tahun (Hari Ginjal Sedunia dan Hari
-- Penglihatan Sedunia jatuh pada Kamis kedua) sengaja TIDAK diisi
-- di sini. Menaruhnya sebagai tanggal tetap berarti setiap tahun
-- ia salah, dan yang salah diam-diam lebih berbahaya daripada yang
-- tidak ada. Silakan ditambahkan sendiri tiap tahun lewat menu.
--
-- Jalankan di Supabase -> SQL Editor -> Run
-- Aman dijalankan berulang kali.
-- ============================================================


-- ------------------------------------------------------------
-- (1) Hari kesehatan.
--
-- Disimpan sebagai bulan dan tanggal, bukan tanggal penuh: harinya
-- berulang tiap tahun, dan menyimpan tahunnya berarti harus diisi
-- ulang setiap Januari.
-- ------------------------------------------------------------
create table if not exists hari_kesehatan (
    id      bigserial primary key,
    nama    text     not null,
    bulan   smallint not null,
    tanggal smallint not null,
    lingkup text     not null default 'Internasional',

    -- Poliklinik atau layanan yang paling nyambung. Inilah yang
    -- menyambungkan hari besar ke nama dokter yang benar.
    kaitan  text,

    -- Usulan sudut pandang kontennya. Bukan judul — judul itu
    -- pekerjaan terakhir, dan yang dibutuhkan di awal justru
    -- pijakan untuk mulai berpikir.
    sudut   text,

    aktif   boolean  not null default true,

    constraint hari_kesehatan_nama_ada check (btrim(nama) <> ''),
    constraint hari_kesehatan_bulan   check (bulan between 1 and 12),
    constraint hari_kesehatan_tanggal check (tanggal between 1 and 31),
    constraint hari_kesehatan_lingkup
        check (lingkup in ('Nasional', 'Internasional', 'RSPUR')),
    constraint hari_kesehatan_unik unique (nama, bulan, tanggal)
);

create index if not exists idx_hari_kesehatan on hari_kesehatan(bulan, tanggal);

alter table hari_kesehatan enable row level security;


-- ------------------------------------------------------------
-- (2) Isu yang sedang ramai.
--
-- Punya masa berlaku, karena yang ramai bulan ini tidak ramai
-- bulan depan. Isu kedaluwarsa yang tetap muncul membuat
-- usulannya tidak lagi dipercaya, dan sekali tidak dipercaya
-- orang berhenti membacanya sama sekali.
-- ------------------------------------------------------------
create table if not exists isu_ramai (
    id          bigserial primary key,
    judul       text not null,
    ringkasan   text,
    sudut       text,
    kaitan      text,
    sumber      text,

    mulai       date not null default current_date,
    sampai      date,

    aktif       boolean not null default true,
    dibuat_oleh bigint references pengguna(id),
    dibuat_pada timestamptz not null default now(),

    constraint isu_judul_ada check (btrim(judul) <> ''),
    constraint isu_sumber_aman check (sumber is null or sumber ~* '^https://'),
    constraint isu_masa_masuk_akal check (sampai is null or sampai >= mulai)
);

create index if not exists idx_isu_ramai on isu_ramai(aktif, mulai desc);

alter table isu_ramai enable row level security;


-- ------------------------------------------------------------
-- (3) Siapa boleh apa.
--
-- Dibaca siapa saja yang sudah masuk; yang mengubah hanya
-- pemegang izin 'humas'.
-- ------------------------------------------------------------
drop policy if exists hari_kesehatan_baca on hari_kesehatan;
create policy hari_kesehatan_baca on hari_kesehatan
    for select to authenticated using (true);

drop policy if exists hari_kesehatan_ubah on hari_kesehatan;
create policy hari_kesehatan_ubah on hari_kesehatan
    for all to authenticated
    using (punya_izin('humas')) with check (punya_izin('humas'));

drop policy if exists isu_ramai_baca on isu_ramai;
create policy isu_ramai_baca on isu_ramai
    for select to authenticated using (true);

drop policy if exists isu_ramai_ubah on isu_ramai;
create policy isu_ramai_ubah on isu_ramai
    for all to authenticated
    using (punya_izin('humas')) with check (punya_izin('humas'));


-- ------------------------------------------------------------
-- (4) Modul mana yang dibekali keduanya.
-- ------------------------------------------------------------
alter table modul_ai
    add column if not exists pakai_isu boolean not null default false;

update modul_ai set pakai_isu = true
 where judul ilike '%kalender konten%';


-- ------------------------------------------------------------
-- (5) Isi awal hari kesehatan.
--
-- Hanya yang tanggalnya tetap. Sudut pandangnya ditulis sebagai
-- pijakan, bukan sebagai judul jadi — silakan diubah lewat menu,
-- suntingan tidak akan tertimpa karena baris yang sudah ada
-- dilewati.
-- ------------------------------------------------------------
insert into hari_kesehatan (nama, bulan, tanggal, lingkup, kaitan, sudut) values
  ('Hari Gizi Nasional',                 1, 25, 'Nasional',      'Spesialis Anak, Gizi Klinik',        'Gizi seimbang keluarga; kenali tanda kurang gizi dan obesitas pada anak'),
  ('Hari Kanker Sedunia',                2,  4, 'Internasional', 'Spesialis Onkologi, Penyakit Dalam', 'Deteksi dini menyelamatkan; kenali gejala yang tidak boleh ditunda'),
  ('Hari Kanker Anak Sedunia',           2, 15, 'Internasional', 'Spesialis Anak',                     'Kenali gejala kanker pada anak yang sering dikira penyakit biasa'),
  ('Hari Obesitas Sedunia',              3,  4, 'Internasional', 'Spesialis Penyakit Dalam, Gizi',     'Berat badan berlebih bukan soal penampilan, tapi pintu banyak penyakit'),
  ('Hari Down Syndrome Sedunia',         3, 21, 'Internasional', 'Spesialis Anak',                     'Dukungan keluarga dan layanan tumbuh kembang yang tersedia'),
  ('Hari Tuberkulosis Sedunia',          3, 24, 'Internasional', 'Spesialis Paru',                     'Batuk lebih dari dua pekan bukan batuk biasa; TBC bisa sembuh bila tuntas'),
  ('Hari Peduli Autisme Sedunia',        4,  2, 'Internasional', 'Spesialis Anak',                     'Kenali tanda awal; makin dini didampingi makin baik hasilnya'),
  ('Hari Kesehatan Sedunia',             4,  7, 'Internasional', 'Semua poliklinik',                   'Perkenalkan layanan rumah sakit secara menyeluruh'),
  ('Hari Hemofilia Sedunia',             4, 17, 'Internasional', 'Spesialis Anak, Penyakit Dalam',     'Mengenali gangguan pembekuan darah dan penanganannya'),
  ('Pekan Imunisasi Dunia',              4, 24, 'Internasional', 'Spesialis Anak',                     'Imunisasi lengkap: jadwal, mitos yang keliru, dan layanan di sini'),
  ('Hari Malaria Sedunia',               4, 25, 'Internasional', 'Spesialis Penyakit Dalam',           'Waspada demam sepulang dari daerah endemis'),
  ('Hari Kebersihan Tangan Sedunia',     5,  5, 'Internasional', 'Semua poliklinik, PPI',              'Cuci tangan: langkah paling murah yang paling sering dilewatkan'),
  ('Hari Palang Merah Sedunia',          5,  8, 'Internasional', 'Unit Donor Darah',                   'Ajakan donor darah dan cerita penerimanya'),
  ('Hari Perawat Internasional',         5, 12, 'Internasional', 'Keperawatan',                        'Sorot perawat rumah sakit sendiri — wajah dan cerita mereka'),
  ('Hari Hipertensi Sedunia',            5, 17, 'Internasional', 'Spesialis Jantung, Penyakit Dalam',  'Tekanan darah tinggi jarang bergejala; ajak periksa rutin'),
  ('Hari Tanpa Tembakau Sedunia',        5, 31, 'Internasional', 'Spesialis Paru',                     'Berhenti merokok: apa yang berubah di tubuh setelah hari pertama'),
  ('Hari Donor Darah Sedunia',           6, 14, 'Internasional', 'Unit Donor Darah',                   'Siapa saja yang boleh dan tidak boleh mendonor'),
  ('Hari Anti Narkoba Internasional',    6, 26, 'Internasional', 'Spesialis Kedokteran Jiwa',          'Layanan pemulihan dan dukungan bagi keluarga'),
  ('Hari Keluarga Nasional',             6, 29, 'Nasional',      'Spesialis Kebidanan, Anak',          'Kesehatan keluarga dari merencanakan kehamilan sampai lansia'),
  ('Hari Anak Nasional',                 7, 23, 'Nasional',      'Spesialis Anak',                     'Tumbuh kembang anak dan layanan poli anak di sini'),
  ('Pekan ASI Sedunia',                  8,  1, 'Internasional', 'Spesialis Anak, Kebidanan',          'Menyusui: dukungan yang dibutuhkan ibu, bukan tuntutan'),
  ('Hari Remaja Internasional',          8, 12, 'Internasional', 'Spesialis Kedokteran Jiwa, Anak',    'Kesehatan jiwa remaja dan tempat bercerita yang aman'),
  ('Hari Pencegahan Bunuh Diri Sedunia', 9, 10, 'Internasional', 'Spesialis Kedokteran Jiwa',          'Cara mendengarkan orang terdekat yang sedang berat; layanan yang tersedia'),
  ('Hari Alzheimer Sedunia',             9, 21, 'Internasional', 'Spesialis Saraf',                    'Pikun yang wajar dan yang perlu diperiksa'),
  ('Hari Rabies Sedunia',                9, 28, 'Internasional', 'IGD, Spesialis Penyakit Dalam',      'Langkah pertama setelah digigit hewan; jangan menunggu'),
  ('Hari Jantung Sedunia',               9, 29, 'Internasional', 'Spesialis Jantung',                  'Kenali gejala serangan jantung dan pentingnya waktu'),
  ('Hari Lanjut Usia Internasional',    10,  1, 'Internasional', 'Spesialis Penyakit Dalam, Saraf',    'Layanan untuk lansia dan pemeriksaan berkala yang dianjurkan'),
  ('Hari Kesehatan Jiwa Sedunia',       10, 10, 'Internasional', 'Spesialis Kedokteran Jiwa',          'Kesehatan jiwa itu kesehatan; kapan waktunya mencari bantuan'),
  ('Hari Cuci Tangan Pakai Sabun',      10, 15, 'Internasional', 'Semua poliklinik, PPI',              'Enam langkah cuci tangan yang benar'),
  ('Hari Pangan Sedunia',               10, 16, 'Internasional', 'Gizi Klinik',                        'Makanan aman dan bergizi untuk keluarga berpenghasilan pas-pasan'),
  ('Hari Kanker Payudara Sedunia',      10, 19, 'Internasional', 'Spesialis Onkologi, Bedah',          'SADARI: cara memeriksa payudara sendiri di rumah'),
  ('Hari Osteoporosis Sedunia',         10, 20, 'Internasional', 'Spesialis Ortopedi',                 'Tulang keropos pada usia lanjut dan cara mencegahnya sejak muda'),
  ('Hari Stroke Sedunia',               10, 29, 'Internasional', 'Spesialis Saraf',                    'Kenali SeGeRa Ke RS; jam pertama menentukan'),
  ('Hari Kesehatan Nasional',           11, 12, 'Nasional',      'Semua poliklinik',                   'Peran rumah sakit di tengah masyarakat; sorot tenaga kesehatannya'),
  ('Hari Ayah Nasional',                11, 12, 'Nasional',      'Spesialis Anak, Urologi',            'Kesehatan ayah sering terlupakan; ajak periksa'),
  ('Hari Diabetes Sedunia',             11, 14, 'Internasional', 'Spesialis Penyakit Dalam',           'Gejala diabetes yang sering dianggap biasa; layanan pemeriksaan gula darah'),
  ('Pekan Kesadaran Antimikroba',       11, 18, 'Internasional', 'Spesialis Penyakit Dalam, Farmasi',  'Antibiotik bukan obat segala penyakit; bahaya memakainya sembarangan'),
  ('Hari Anak Sedunia',                 11, 20, 'Internasional', 'Spesialis Anak',                     'Hak anak atas kesehatan dan layanan ramah anak di rumah sakit'),
  ('Hari AIDS Sedunia',                 12,  1, 'Internasional', 'Spesialis Penyakit Dalam',           'Melawan stigma; pemeriksaan dan pengobatan yang tersedia'),
  ('Hari Disabilitas Internasional',    12,  3, 'Internasional', 'Rehabilitasi Medik',                 'Layanan dan fasilitas rumah sakit yang ramah disabilitas'),
  ('Hari Ibu',                          12, 22, 'Nasional',      'Spesialis Kebidanan Kandungan',      'Kesehatan ibu sebelum, selama, dan sesudah melahirkan')
on conflict (nama, bulan, tanggal) do nothing;


-- ============================================================
-- CEK
-- ============================================================
select bulan, count(*) as jumlah_hari_kesehatan
  from hari_kesehatan group by bulan order by bulan;
