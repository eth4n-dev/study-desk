export function lectureFilesForSlot(files, slot) {
 return files.filter(file => file.kind === 'theory' && file.subject === slot.subject && file.lectureId === slot.id);
}

export async function validateLecturePdfs(files) {
 if (!files.length) return;
 for (const file of files) {
  if (!file.name?.toLowerCase().endsWith('.pdf')) throw new Error('Choose PDF files for this class.');
  const header = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  if (header.length < 5 || String.fromCharCode(...header) !== '%PDF-') throw new Error(`${file.name} is not a valid PDF.`);
 }
}
