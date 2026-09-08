import { NextResponse } from "next/server";
import { bolehAkses } from "@/lib/akses";
import { createClient } from "@/lib/supabase/server";
import { isiFormulirKomplain } from "@/lib/komplain-dokumen";

/**
 * Mengunduh formulir resmi berisi data satu komplain.
 *
 * Izinnya diperiksa di sini juga, bukan hanya di halaman. Alamat
 * seperti ini bisa dibuka langsung, dan isinya data pasien —
 * jadi tidak boleh mengandalkan menu yang disembunyikan.
 */
export async function GET(
  _permintaan: Request,
  { params }: RouteContext<"/komplain/[id]/dokumen">,
) {
  if (!(await bolehAkses("komplain"))) {
    return new NextResponse("Tidak berhak membuka dokumen ini.", { status: 403 });
  }

  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("komplain")
    .select("*")
    .eq("id", Number(id))
    .maybeSingle();

  if (!data) return new NextResponse("Komplain tidak ditemukan.", { status: 404 });

  try {
    const berkas = await isiFormulirKomplain(data);

    return new NextResponse(new Uint8Array(berkas), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="Formulir-Komplain-${data.kode}.docx"`,
      },
    });
  } catch (galat) {
    const pesan = galat instanceof Error ? galat.message : "Dokumen gagal dibuat.";
    return new NextResponse(pesan, { status: 500 });
  }
}
