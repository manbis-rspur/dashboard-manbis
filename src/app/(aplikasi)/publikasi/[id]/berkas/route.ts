import { NextResponse } from "next/server";
import { bolehAkses } from "@/lib/akses";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Mengambil berkas arsip.
 *
 * Berkasnya tersimpan di wadah tertutup, jadi tidak ada alamat
 * langsung yang bisa terbagikan tanpa sengaja. Izin diperiksa di
 * sini, lalu isinya diteruskan.
 */
export async function GET(
  _permintaan: Request,
  { params }: RouteContext<"/publikasi/[id]/berkas">,
) {
  const berhak =
    (await bolehAkses("publikasi")) || (await bolehAkses("humas"));

  if (!berhak) return new NextResponse("Tidak berhak.", { status: 403 });

  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("publikasi")
    .select("berkas_jalur, berkas_nama")
    .eq("id", Number(id))
    .maybeSingle();

  if (!data) return new NextResponse("Dokumen tidak ditemukan.", { status: 404 });

  const { data: isi, error } = await createAdminClient()
    .storage.from("dokumen")
    .download(data.berkas_jalur);

  if (error || !isi) {
    return new NextResponse("Berkasnya tidak bisa dibaca.", { status: 500 });
  }

  return new NextResponse(new Uint8Array(await isi.arrayBuffer()), {
    headers: {
      "Content-Type": isi.type || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${data.berkas_nama}"`,
    },
  });
}
