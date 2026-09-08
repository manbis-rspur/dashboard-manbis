import "server-only";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { createAdminClient } from "@/lib/supabase/admin";
import { susunIsiFormulir, type BarisKomplain } from "@/lib/komplain-isi";

/** Tempat template resmi disimpan di wadah 'dokumen'. */
export const JALUR_TEMPLATE = "komplain/template.docx";

export async function isiFormulirKomplain(k: BarisKomplain): Promise<Buffer> {
  const db = createAdminClient();
  const { data, error } = await db.storage.from("dokumen").download(JALUR_TEMPLATE);

  if (error || !data) {
    throw new Error(
      "Template formulir resmi belum diunggah. Buka Pengaturan → Template Dokumen.",
    );
  }

  const zip = new PizZip(Buffer.from(await data.arrayBuffer()));
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: "<<", end: ">>" },
    nullGetter: () => "",
  });

  doc.render(susunIsiFormulir(k));

  return doc.getZip().generate({ type: "nodebuffer", compression: "DEFLATE" });
}
