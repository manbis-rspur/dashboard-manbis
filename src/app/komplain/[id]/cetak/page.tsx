import { notFound } from "next/navigation";
import { bolehAkses } from "@/lib/akses";
import { createClient } from "@/lib/supabase/server";
import { bacaIdentitas } from "@/lib/identitas";
import { labelKategori, pecahKategori } from "@/lib/komplain-pilihan";
import { PicuCetak } from "./picu-cetak";
import { gayaCetak } from "./gaya";

const KATEGORI_KOTAK = ["Medis", "Keperawatan", "Administrasi", "Fasilitas"] as const;
const SUMBER_KOTAK = ["Pasien", "Keluarga Pasien", "Sejawat", "Paramedis"] as const;
const HASIL_KOTAK = ["Teratasi", "Belum teratasi", "Dilaporkan Komite Etik RS"] as const;
const KEPUASAN_KOTAK = ["Sangat Puas", "Puas", "Tidak Puas"] as const;
const KOMITE_KOTAK = [
  "Komite Medik",
  "Komite Keperawatan",
  "Komite Profesi Lain",
  "Komplain Kasus Etik",
  "Komplain Kasus Hukum",
  "Komplain Masalah Administrasi",
] as const;

const tanggalID = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
const jamID = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  hour: "2-digit",
  minute: "2-digit",
});

/** Kotak centang, digambar sebagai kotak sungguhan bukan huruf. */
function Kotak({ isi, label }: { isi: boolean; label: string }) {
  return (
    <span className="pilihan">
      <span className={isi ? "kotak terisi" : "kotak"} />
      {label}
    </span>
  );
}

function Isian({ label, nilai }: { label: string; nilai: string }) {
  return (
    <div className="isian">
      <span className="isian-label">{label}</span>
      <span className="isian-titik">:</span>
      <span className="isian-nilai">{nilai}</span>
    </div>
  );
}

function TandaTangan({ peran, nama }: { peran: string; nama: string }) {
  return (
    <div className="ttd">
      <p>{peran}</p>
      <p className="ttd-nama">({nama})</p>
      <p className="ttd-ket">nama dan ttd</p>
    </div>
  );
}

export default async function HalamanCetak({ params }: PageProps<"/komplain/[id]/cetak">) {
  if (!(await bolehAkses("komplain"))) notFound();

  const { id } = await params;
  const supabase = await createClient();

  const { data: k } = await supabase
    .from("komplain")
    .select("*")
    .eq("id", Number(id))
    .maybeSingle();

  if (!k) notFound();

  const identitas = await bacaIdentitas();

  const lapor = k.waktu_pelaporan ? new Date(k.waktu_pelaporan) : null;
  const tanggap = k.waktu_ditanggapi ? new Date(k.waktu_ditanggapi) : null;
  const komite = k.tgl_lapor_komite ? new Date(k.tgl_lapor_komite) : null;

  // Kategori bisa lebih dari satu, tersimpan dipisah koma. Yang ada
  // kotaknya dicentang; sisanya ditulis di baris Lain-Lain.
  const kategori = pecahKategori(k.kategori_masalah);
  const kategoriLainnya = kategori.filter(
    (n) => !(KATEGORI_KOTAK as readonly string[]).includes(n),
  );
  const sumberLain = !SUMBER_KOTAK.includes(k.sumber_pelaporan);
  const eskalasi = k.perlu_eskalasi === true;
  const isi = (nilai: string | null) => (nilai && nilai.trim() !== "" ? nilai : "");

  return (
    <>
      <style>{gayaCetak}</style>
      <PicuCetak />

      <div className="lembar">
        {identitas.kopUrl ? (
          // Kop resmi berupa gambar dipakai apa adanya — paling tepat,
          // karena tidak perlu disusun ulang dari potongan.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={identitas.kopUrl} alt="" className="kop-gambar" />
        ) : (
          <header className="kop">
            {identitas.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={identitas.logoUrl} alt="" className="kop-logo" />
            ) : (
              <div className="kop-logo" />
            )}
            {identitas.alamatKop && (
              <p className="kop-alamat">{identitas.alamatKop}</p>
            )}
          </header>
        )}

        <h1 className="judul">FORMULIR LAPORAN PENANGANAN KOMPLAIN</h1>

        <table className="formulir">
          <tbody>
            <tr>
              <th colSpan={2}>IDENTITAS PELAPOR</th>
              <th colSpan={2}>MASALAH KOMPLAIN</th>
            </tr>
            <tr>
              <td colSpan={2} className="sel-isian">
                <Isian label="Nama" nilai={isi(k.pelapor_nama)} />
                <Isian label="Alamat" nilai={isi(k.pelapor_alamat)} />
                <Isian label="No Hp" nilai={isi(k.pelapor_hp)} />
              </td>
              <td colSpan={2} className="sel-tengah">
                <div className="baris-pilihan">
                  {KATEGORI_KOTAK.map((n) => (
                    <Kotak key={n} isi={kategori.includes(n)} label={n} />
                  ))}
                </div>
                <div className="baris-pilihan">
                  <Kotak isi={kategoriLainnya.length > 0} label="Lain-Lain" />
                  <span className="garis-isi">
                    {kategoriLainnya.map(labelKategori).join(", ")}
                  </span>
                </div>
              </td>
            </tr>

            <tr>
              <th colSpan={2}>IDENTITAS PASIEN</th>
              <th colSpan={2}>SUMBER PELAPORAN KOMPLAIN</th>
            </tr>
            <tr>
              <td colSpan={2} className="sel-isian">
                <Isian label="Nama" nilai={isi(k.pasien_nama)} />
                <Isian
                  label="Tanggal Lahir"
                  nilai={k.pasien_tgl_lahir ? tanggalID.format(new Date(k.pasien_tgl_lahir)) : ""}
                />
                <Isian label="No RM" nilai={isi(k.pasien_no_rm)} />
                <Isian label="Alamat" nilai={isi(k.pasien_alamat)} />
                <Isian label="No Hp" nilai={isi(k.pasien_hp)} />
              </td>
              <td colSpan={2} className="sel-tengah">
                <div className="baris-pilihan">
                  {SUMBER_KOTAK.map((n) => (
                    <Kotak
                      key={n}
                      isi={k.sumber_pelaporan === n}
                      label={n === "Paramedis" ? "Para Medis" : n}
                    />
                  ))}
                </div>
                {sumberLain && (
                  <div className="baris-pilihan">
                    <Kotak isi label={k.sumber_pelaporan} />
                  </div>
                )}
              </td>
            </tr>

            <tr>
              <th colSpan={2}>PENERIMA LAPORAN</th>
              <th>WAKTU PELAPORAN</th>
              <th>WAKTU DITANGGAPI</th>
            </tr>
            <tr>
              <td colSpan={2} className="sel-isian">
                <Isian label="Nama" nilai={isi(k.penerima_nama)} />
                <Isian label="Unit Kerja" nilai={isi(k.penerima_unit)} />
                <Isian label="Jabatan" nilai={isi(k.penerima_jabatan)} />
              </td>
              <td className="sel-isian">
                <Isian label="Tanggal" nilai={lapor ? tanggalID.format(lapor) : ""} />
                <Isian label="Jam" nilai={lapor ? jamID.format(lapor) : ""} />
              </td>
              <td className="sel-isian">
                <Isian label="Tanggal" nilai={tanggap ? tanggalID.format(tanggap) : ""} />
                <Isian label="Jam" nilai={tanggap ? jamID.format(tanggap) : ""} />
              </td>
            </tr>

            <tr>
              <th colSpan={4}>MASALAH KOMPLAIN</th>
            </tr>
            <tr>
              <td colSpan={3} className="sel-uraian">
                {k.detail_masalah}
              </td>
              <td className="sel-ttd">
                <TandaTangan peran="Pelapor" nama={isi(k.pelapor_nama)} />
                <TandaTangan peran="Penerima Laporan" nama={isi(k.penerima_nama)} />
              </td>
            </tr>

            <tr>
              <th colSpan={4}>GRADING KOMPLAIN</th>
            </tr>
            <tr className="grading">
              <td className="hijau" colSpan={2}>
                <Kotak
                  isi={k.grading === "Hijau"}
                  label="Tidak menimbulkan kerugian baik berupa material maupun immaterial"
                />
              </td>
              <td className="kuning">
                <Kotak
                  isi={k.grading === "Kuning"}
                  label="Cenderung berhubungan dengan pemberitaan media berpotensi immaterial"
                />
              </td>
              <td className="merah">
                <Kotak
                  isi={k.grading === "Merah"}
                  label="Cenderung dengan polisi, pengadilan, kematian, mengancam sistem kelangsungan organisasi dan kerugian material"
                />
              </td>
            </tr>

            <tr>
              <th colSpan={4}>JAWABAN KOMPLAIN</th>
            </tr>
            <tr>
              <td colSpan={3} className="sel-uraian">
                {isi(k.jawaban)}
              </td>
              <td className="sel-ttd">
                <TandaTangan peran="Pelapor" nama={isi(k.pelapor_nama)} />
                <TandaTangan peran="Penerima Laporan" nama={isi(k.penerima_nama)} />
              </td>
            </tr>

            <tr>
              <th colSpan={2}>HASIL PENYELESAIAN KOMPLAIN</th>
              <th colSpan={2}>TINGKAT KEPUASAN PENANGANAN KOMPLAIN</th>
            </tr>
            <tr>
              <td colSpan={2} className="sel-tengah">
                <div className="baris-pilihan">
                  {HASIL_KOTAK.map((n) => (
                    <Kotak
                      key={n}
                      isi={k.hasil_penyelesaian === n}
                      label={n === "Dilaporkan Komite Etik RS" ? "Di laporkan Komite etik RS" : n}
                    />
                  ))}
                </div>
              </td>
              <td colSpan={2} className="sel-tengah">
                <div className="baris-pilihan">
                  {KEPUASAN_KOTAK.map((n) => (
                    <Kotak key={n} isi={k.kepuasan_penanganan === n} label={n} />
                  ))}
                </div>
              </td>
            </tr>

            <tr>
              <td colSpan={4} className="catatan">
                Bila hasil penyelesaian komplain belum teratasi maka perlu di
                laporkan ke komite etik Rumah Sakit Pertamedika Ummi Rosnati dan
                mengisi formulir lanjutan di bawah ini
              </td>
            </tr>

            <tr>
              <th colSpan={4}>
                TIM MANAJEMEN KOMPLAIN/KOMITE ETIK RUMAH SAKIT/DIREKSI
              </th>
            </tr>
            <tr>
              <td className="sel-eskalasi">
                <p className="sub-judul">Jenis Komplain</p>
                {KOMITE_KOTAK.map((n) => (
                  <div key={n} className="baris-komite">
                    <Kotak isi={eskalasi && k.jenis_komite === n} label={n} />
                  </div>
                ))}
              </td>
              <td className="sel-eskalasi">
                <p className="sub-judul">Tanggal Lapor</p>
                <Isian
                  label="Tanggal"
                  nilai={eskalasi && komite ? tanggalID.format(komite) : ""}
                />
                <Isian label="Jam" nilai="" />
              </td>
              <td className="sel-eskalasi tengah">
                <p className="sub-judul">Komplain Center</p>
                <p className="ttd-nama">(............................)</p>
                <p className="ttd-ket">nama dan ttd</p>
              </td>
              <td className="sel-eskalasi">
                <p className="sub-judul">Identitas Penerima Laporan</p>
                <Isian label="Nama" nilai={eskalasi ? isi(k.penerima_nama) : ""} />
                <Isian label="Unit Kerja" nilai={eskalasi ? isi(k.penerima_unit) : ""} />
                <Isian label="Jabatan" nilai={eskalasi ? isi(k.penerima_jabatan) : ""} />
              </td>
            </tr>
          </tbody>
        </table>

        <p className="jejak">
          {k.kode} · dicetak dari Dashboard Manajemen Bisnis RSPUR
        </p>
      </div>
    </>
  );
}
