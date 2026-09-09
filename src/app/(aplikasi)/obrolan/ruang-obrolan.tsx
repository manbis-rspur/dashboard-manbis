"use client";

import { useEffect, useRef, useState } from "react";
import Avatar from "@/components/avatar";
import { createClient } from "@/lib/supabase/client";

export type Pesan = {
  id: number;
  pengguna_id: number;
  pesan: string;
  dihapus: boolean;
  dibuat_pada: string;
};

export type Anggota = {
  id: number;
  nama: string;
  jabatan: string;
  foto_url: string | null;
};

const jam = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit" });
const tanggal = new Intl.DateTimeFormat("id-ID", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

function hariDari(waktu: string) {
  return new Date(waktu).toDateString();
}

export function RuangObrolan({
  awal,
  anggota,
  sayaId,
}: {
  awal: Pesan[];
  anggota: Anggota[];
  sayaId: number;
}) {
  const [pesan, setPesan] = useState<Pesan[]>(awal);
  const [teks, setTeks] = useState("");
  const [galat, setGalat] = useState<string | null>(null);
  const [sibuk, setSibuk] = useState(false);
  const bawah = useRef<HTMLDivElement>(null);

  const orang = new Map(anggota.map((a) => [a.id, a]));

  // Pesan baru dari orang lain muncul sendiri, tanpa memuat ulang.
  useEffect(() => {
    const db = createClient();
    const saluran = db
      .channel("obrolan-unit")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "obrolan" },
        (muatan) => {
          const baru = muatan.new as Pesan;
          setPesan((lama) =>
            lama.some((p) => p.id === baru.id) ? lama : [...lama, baru],
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "obrolan" },
        (muatan) => {
          const ubah = muatan.new as Pesan;
          setPesan((lama) => lama.map((p) => (p.id === ubah.id ? ubah : p)));
        },
      )
      .subscribe();

    return () => {
      db.removeChannel(saluran);
    };
  }, []);

  useEffect(() => {
    bawah.current?.scrollIntoView({ behavior: "smooth" });
  }, [pesan.length]);

  async function kirim(e: React.FormEvent) {
    e.preventDefault();
    const isi = teks.trim();
    if (!isi) return;

    setSibuk(true);
    setGalat(null);

    const db = createClient();
    const { data, error } = await db
      .from("obrolan")
      .insert({ pengguna_id: sayaId, pesan: isi })
      .select("id, pengguna_id, pesan, dihapus, dibuat_pada")
      .single();

    if (error) {
      setGalat("Pesan gagal dikirim: " + error.message);
    } else {
      setTeks("");
      setPesan((lama) => (lama.some((p) => p.id === data.id) ? lama : [...lama, data]));
    }
    setSibuk(false);
  }

  async function hapus(id: number) {
    const db = createClient();
    const { error } = await db.from("obrolan").update({ dihapus: true }).eq("id", id);
    if (error) setGalat("Gagal menghapus: " + error.message);
  }

  // Penanda ganti hari dihitung sekali di sini, bukan sambil
  // menggambar daftar — menyimpan sisa perhitungan di tengah render
  // membuat hasilnya bisa berbeda antar penggambaran ulang.
  const daftar = pesan.map((p, i) => ({
    ...p,
    gantiHari: i === 0 || hariDari(p.dibuat_pada) !== hariDari(pesan[i - 1].dibuat_pada),
  }));

  return (
    <div className="flex h-[calc(100vh-13rem)] flex-col rounded-lg border border-garis bg-permukaan">
      <div className="flex-1 overflow-y-auto p-4">
        {pesan.length === 0 && (
          <p className="py-12 text-center text-sm text-tinta-3">
            Belum ada pesan. Tulis yang pertama.
          </p>
        )}

        <div className="flex flex-col gap-4">
          {daftar.map((p) => {
            const penulis = orang.get(p.pengguna_id);
            const saya = p.pengguna_id === sayaId;

            return (
              <div key={p.id} className="flex flex-col gap-4">
                {p.gantiHari && (
                  <p className="text-center text-xs text-tinta-3">
                    {tanggal.format(new Date(p.dibuat_pada))}
                  </p>
                )}

                <div className="group flex items-start gap-3">
                  <Avatar
                    nama={penulis?.nama ?? "?"}
                    foto={penulis?.foto_url}
                    ukuran={34}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-baseline gap-x-2">
                      <span className="text-sm font-medium">
                        {saya ? "Anda" : (penulis?.nama ?? "Anggota lain")}
                      </span>
                      <span className="text-xs text-tinta-3">
                        {jam.format(new Date(p.dibuat_pada))}
                      </span>
                      {saya && !p.dihapus && (
                        <button
                          type="button"
                          onClick={() => hapus(p.id)}
                          className="text-xs text-tinta-3 opacity-0 transition group-hover:opacity-100 hover:text-merah focus:opacity-100"
                        >
                          hapus
                        </button>
                      )}
                    </p>
                    {p.dihapus ? (
                      <p className="text-sm text-tinta-3 italic">Pesan ini dihapus.</p>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap break-words text-tinta-2">
                        {p.pesan}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div ref={bawah} />
      </div>

      <form onSubmit={kirim} className="flex flex-col gap-2 border-t border-garis p-3">
        {galat && <p className="text-sm text-merah">{galat}</p>}
        <div className="flex gap-2">
          <input
            value={teks}
            onChange={(e) => setTeks(e.target.value)}
            placeholder="Tulis pesan untuk anggota manbis…"
            className="flex-1 rounded-lg border border-garis bg-kertas px-3 py-2 outline-none focus:border-hijau focus:ring-2 focus:ring-hijau-muda"
          />
          <button
            type="submit"
            disabled={sibuk || !teks.trim()}
            className="rounded-lg bg-hijau px-5 py-2 font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            Kirim
          </button>
        </div>
      </form>
    </div>
  );
}
