import { NextResponse } from "next/server";
import { bolehAkses } from "@/lib/akses";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Mengambil berkas dari satu versi tertentu. */
export async function GET(
  _permintaan: Request,
  { params }: RouteContext<"/publikasi/[id]/revisi/[revisiId]/berkas">,
) {
  const berhak = (await bolehAkses("publikasi")) || (await bolehAkses("humas"));
  if (!berhak) return new NextResponse("Tidak berhak.", { status: 403 });

  const { id, revisiId } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("publikasi_revisi")
    .select("berkas_jalur, berkas_nama, versi")
    .eq("id", Number(revisiId))
    .eq("publikasi_id", Number(id))
    .maybeSingle();

  if (!data?.berkas_jalur) {
    return new NextResponse("Versi ini tidak berupa berkas.", { status: 404 });
  }

  const { data: isi, error } = await createAdminClient()
    .storage.from("dokumen")
    .download(data.berkas_jalur);

  if (error || !isi) {
    return new NextResponse("Berkasnya tidak bisa dibaca.", { status: 500 });
  }

  return new NextResponse(new Uint8Array(await isi.arrayBuffer()), {
    headers: {
      "Content-Type": isi.type || "application/octet-stream",
      "Content-Disposition": `attachment; filename="v${data.versi}-${data.berkas_nama}"`,
    },
  });
}
