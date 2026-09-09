import { createClient } from "@/lib/supabase/server";
import { getPenggunaAktif } from "@/lib/auth";
import type { NamaIkon } from "@/components/ikon";

/**
 * Kabar kegiatan unit — isi lonceng di pojok kanan atas.
 *
 * Tidak ada tabel notifikasi. Daftarnya dirangkai saat itu juga dari
 * tabel yang memang sudah mencatat kejadiannya. Menyalin ulang setiap
 * kejadian ke tabel tersendiri hanya menambah satu sumber kebenaran
 * yang bisa melenceng dari aslinya, dan tetap harus dibersihkan.
 *
 * Yang tidak berhak membuka sebuah modul tidak akan melihat kabarnya:
 * pertanyaannya dijawab database lewat RLS, sama seperti kalau
 * halamannya dibuka langsung. Jadi kabar komplain pasien tidak bocor
 * ke lonceng orang yang tidak berhak membacanya.
 */

export type Kabar = {
  kunci: string;
  ikon: NamaIkon;
  judul: string;
  rincian: string;
  waktu: string;
  tautan: string;
  /** Kejadian yang dilakukan sendiri tidak dihitung sebagai kabar baru. */
  olehSaya: boolean;
};

export type IsiLonceng = {
  daftar: Kabar[];
  baru: number;
};

/** Berapa banyak kabar terakhir yang ditampilkan. */
const BANYAK = 12;

function nama(nilai: unknown): string {
  // Supabase mengembalikan relasi bisa sebagai objek, bisa sebagai
  // larik satu isi, tergantung bentuk kuerinya.
  const isi = Array.isArray(nilai) ? nilai[0] : nilai;
  if (isi && typeof isi === "object" && "nama" in isi) {
    return String((isi as { nama: unknown }).nama ?? "");
  }
  return "";
}

function potong(teks: string | null | undefined, batas = 70): string {
  const bersih = (teks ?? "").replace(/\s+/g, " ").trim();
  if (bersih.length <= batas) return bersih;
  return `${bersih.slice(0, batas - 1)}…`;
}

export async function bacaLonceng(): Promise<IsiLonceng> {
  const pengguna = await getPenggunaAktif();
  if (!pengguna) return { daftar: [], baru: 0 };

  const supabase = await createClient();

  const [
    { data: pengguna_saya },
    { data: nomor },
    { data: komplain },
    { data: publikasi },
    { data: revisi },
    { data: obrolan },
  ] = await Promise.all([
    supabase
      .from("pengguna")
      .select("notifikasi_dilihat_pada")
      .eq("id", pengguna.id)
      .maybeSingle(),
    supabase
      .from("nomor")
      .select("id, nomor_lengkap, perihal, diambil_pada, diambil_oleh, pengguna(nama)")
      .order("diambil_pada", { ascending: false })
      .limit(BANYAK),
    supabase
      .from("komplain")
      .select("id, kode, pelapor_nama, kategori_masalah, dibuat_pada, dicatat_oleh")
      .order("dibuat_pada", { ascending: false })
      .limit(BANYAK),
    supabase
      .from("publikasi")
      .select(
        "id, judul, jenis, diunggah_pada, diunggah_oleh, status_tinjauan, catatan_tinjauan, ditinjau_pada, ditinjau_oleh, pengguna:diunggah_oleh(nama), peninjau:ditinjau_oleh(nama)",
      )
      .order("diunggah_pada", { ascending: false })
      .limit(BANYAK),
    supabase
      .from("publikasi_revisi")
      .select("id, publikasi_id, catatan, pada, oleh, pengguna(nama), publikasi(judul)")
      .order("pada", { ascending: false })
      .limit(BANYAK),
    supabase
      .from("obrolan")
      .select("id, pesan, dibuat_pada, pengguna_id, pengguna(nama)")
      .eq("dihapus", false)
      .order("dibuat_pada", { ascending: false })
      .limit(BANYAK),
  ]);

  const daftar: Kabar[] = [];

  for (const n of nomor ?? []) {
    daftar.push({
      kunci: `nomor-${n.id}`,
      ikon: "penomoran",
      judul: `Nomor ${n.nomor_lengkap} diambil`,
      rincian: `${potong(n.perihal)} — ${nama(n.pengguna) || "anggota unit"}`,
      waktu: n.diambil_pada,
      tautan: "/penomoran/buku-nomor",
      olehSaya: n.diambil_oleh === pengguna.id,
    });
  }

  for (const k of komplain ?? []) {
    daftar.push({
      kunci: `komplain-${k.id}`,
      ikon: "komplain",
      judul: `Komplain baru ${k.kode}`,
      rincian: `${potong(k.kategori_masalah, 40)} — pelapor ${potong(k.pelapor_nama, 30)}`,
      waktu: k.dibuat_pada,
      tautan: `/komplain/${k.id}`,
      olehSaya: k.dicatat_oleh === pengguna.id,
    });
  }

  for (const p of publikasi ?? []) {
    daftar.push({
      kunci: `publikasi-${p.id}`,
      ikon: "publikasi",
      judul: `Dokumen ${p.jenis} diunggah`,
      rincian: `${potong(p.judul)} — ${nama(p.pengguna) || "anggota unit"}`,
      waktu: p.diunggah_pada,
      tautan: `/publikasi/${p.id}`,
      olehSaya: p.diunggah_oleh === pengguna.id,
    });

    // Putusan Koordinator adalah kabar tersendiri, bukan sekadar
    // sifat dokumennya: yang mengunggah menunggu jawaban itu.
    if (p.ditinjau_pada && p.status_tinjauan !== "Menunggu") {
      daftar.push({
        kunci: `tinjauan-${p.id}-${p.ditinjau_pada}`,
        ikon: p.status_tinjauan === "Disetujui" ? "centang" : "peringatan",
        judul: `${potong(p.judul, 45)} — ${p.status_tinjauan}`,
        rincian: p.catatan_tinjauan
          ? potong(p.catatan_tinjauan)
          : `Ditinjau ${nama(p.peninjau) || "Koordinator"}`,
        waktu: p.ditinjau_pada,
        tautan: `/publikasi/${p.id}`,
        olehSaya: p.ditinjau_oleh === pengguna.id,
      });
    }
  }

  for (const r of revisi ?? []) {
    const induk = Array.isArray(r.publikasi) ? r.publikasi[0] : r.publikasi;
    daftar.push({
      kunci: `revisi-${r.id}`,
      ikon: "template",
      judul: "Perbaikan dokumen masuk",
      rincian: `${potong(
        (induk as { judul?: string } | null)?.judul ?? "Dokumen publikasi",
        45,
      )} — ${nama(r.pengguna) || "anggota unit"}`,
      waktu: r.pada,
      tautan: `/publikasi/${r.publikasi_id}`,
      olehSaya: r.oleh === pengguna.id,
    });
  }

  for (const o of obrolan ?? []) {
    daftar.push({
      kunci: `obrolan-${o.id}`,
      ikon: "obrolan",
      judul: `Pesan dari ${nama(o.pengguna) || "anggota unit"}`,
      rincian: potong(o.pesan),
      waktu: o.dibuat_pada,
      tautan: "/obrolan",
      olehSaya: o.pengguna_id === pengguna.id,
    });
  }

  daftar.sort((a, b) => b.waktu.localeCompare(a.waktu));
  const terbaru = daftar.slice(0, BANYAK);

  const batas = pengguna_saya?.notifikasi_dilihat_pada ?? null;
  const baru = terbaru.filter(
    (k) => !k.olehSaya && (batas === null || k.waktu > batas),
  ).length;

  return { daftar: terbaru, baru };
}
