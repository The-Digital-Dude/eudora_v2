import { BadRequestException } from '@nestjs/common';

/**
 * A CV is a document a stranger hands us, so nothing the client says about it
 * is taken on trust.
 *
 * `mimetype` on a Multer file is copied straight from the request's
 * Content-Type header — the uploader chooses it. So does the filename. Checking
 * either one alone means "application/pdf" on a shell script passes. The magic
 * bytes are the only part of the claim the sender cannot restate.
 */
export const PDF_MAGIC = Buffer.from('%PDF-');

/** 5MB. A CV that exceeds this is a scanned image, and we would rather be told. */
export const MAX_RESUME_BYTES = 5 * 1024 * 1024;

export function assertPdfUpload(
  file:
    | {
        originalname?: string;
        mimetype?: string;
        size?: number;
        buffer?: Buffer;
      }
    | undefined,
  maxBytes = MAX_RESUME_BYTES,
): asserts file is {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
} {
  if (!file || !file.buffer) {
    throw new BadRequestException('A PDF file is required');
  }

  if (file.size !== undefined && file.size > maxBytes) {
    throw new BadRequestException(
      `File is too large. The limit is ${Math.floor(maxBytes / (1024 * 1024))}MB.`,
    );
  }

  if (file.mimetype !== 'application/pdf') {
    throw new BadRequestException('Only PDF files are accepted');
  }

  if (!/\.pdf$/i.test(file.originalname ?? '')) {
    throw new BadRequestException('Only PDF files are accepted');
  }

  // The claim the uploader cannot fake. Checked last so the cheaper rejections
  // produce the more specific message.
  if (!file.buffer.subarray(0, PDF_MAGIC.length).equals(PDF_MAGIC)) {
    throw new BadRequestException(
      'That file is not a PDF, whatever its name says.',
    );
  }
}
