import { BadRequestException } from '@nestjs/common';

/**
 * What a learner may hand in.
 *
 * Wider than the CV validator, because homework is not a document: most of it
 * is a photograph of a page. Narrow enough to exclude anything executable —
 * archives are absent on purpose, since a zip's contents cannot be checked
 * here and would arrive unexamined.
 *
 * Each entry pairs the declared type with the bytes that actually start such a
 * file. `mimetype` on a Multer upload is copied from the request header and
 * chosen by the uploader, as is the filename; the signature is the part they
 * cannot simply restate.
 */
const ACCEPTED: {
  mimetype: string;
  extensions: string[];
  /** Offset is non-zero only for formats that prefix a container header. */
  signatures: { bytes: number[]; offset?: number }[];
}[] = [
  {
    mimetype: 'application/pdf',
    extensions: ['.pdf'],
    signatures: [{ bytes: [0x25, 0x50, 0x44, 0x46, 0x2d] }], // %PDF-
  },
  {
    mimetype: 'image/jpeg',
    extensions: ['.jpg', '.jpeg'],
    signatures: [{ bytes: [0xff, 0xd8, 0xff] }],
  },
  {
    mimetype: 'image/png',
    extensions: ['.png'],
    signatures: [{ bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] }],
  },
  {
    mimetype: 'image/heic',
    extensions: ['.heic'],
    // HEIC is an ISO-BMFF container: 4 size bytes, then 'ftyp'.
    signatures: [{ bytes: [0x66, 0x74, 0x79, 0x70], offset: 4 }],
  },
];

/** 15MB. A phone photograph of a worksheet sits well under this. */
export const MAX_STUDENT_WORK_BYTES = 15 * 1024 * 1024;

/** Per submission. Enough for a multi-page answer, not enough to be a dumping ground. */
export const MAX_ATTACHMENTS_PER_SUBMISSION = 5;

export function assertStudentWorkUpload(
  file:
    | {
        originalname?: string;
        mimetype?: string;
        size?: number;
        buffer?: Buffer;
      }
    | undefined,
  maxBytes = MAX_STUDENT_WORK_BYTES,
): asserts file is {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
} {
  if (!file || !file.buffer) {
    throw new BadRequestException('A file is required');
  }

  if (file.size !== undefined && file.size > maxBytes) {
    throw new BadRequestException(
      `That file is larger than ${Math.floor(maxBytes / (1024 * 1024))}MB.`,
    );
  }

  const name = file.originalname ?? '';
  const match = ACCEPTED.find(
    (candidate) =>
      candidate.mimetype === file.mimetype &&
      candidate.extensions.some((ext) => name.toLowerCase().endsWith(ext)),
  );
  if (!match) {
    throw new BadRequestException(
      'Attach a PDF or a photo (JPG, PNG or HEIC).',
    );
  }

  // The claim the uploader cannot fake, checked last so the cheaper rejections
  // produce the more specific message.
  const signatureMatches = match.signatures.some(({ bytes, offset = 0 }) => {
    const head = file.buffer!.subarray(offset, offset + bytes.length);
    return head.length === bytes.length && bytes.every((b, i) => head[i] === b);
  });
  if (!signatureMatches) {
    throw new BadRequestException(
      `That file is not really a ${match.mimetype.split('/')[1].toUpperCase()}, whatever its name says.`,
    );
  }
}
