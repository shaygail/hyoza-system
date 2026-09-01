import { mkdir, writeFile, readFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/domain/activity";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

export interface StorageProvider {
  save(fileName: string, buffer: Buffer): Promise<string>;
  read(storagePath: string): Promise<Buffer>;
}

export const localStorage: StorageProvider = {
  async save(fileName, buffer) {
    await mkdir(UPLOAD_DIR, { recursive: true });
    const storagePath = `${Date.now()}-${fileName}`;
    await writeFile(path.join(UPLOAD_DIR, storagePath), buffer);
    return storagePath;
  },
  async read(storagePath) {
    return readFile(path.join(UPLOAD_DIR, storagePath));
  },
};

export async function addAttachment(
  ticketId: string,
  uploadedById: string,
  file: { name: string; type: string; size: number; buffer: Buffer },
  storage: StorageProvider = localStorage
) {
  const storagePath = await storage.save(file.name, file.buffer);

  const attachment = await prisma.ticketAttachment.create({
    data: {
      ticketId,
      uploadedById,
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      storagePath,
    },
    include: { uploadedBy: true },
  });

  await logActivity({
    ticketId,
    actorId: uploadedById,
    eventType: "attachment.uploaded",
    payload: { fileName: file.name },
    visibility: "internal",
  });

  return attachment;
}
