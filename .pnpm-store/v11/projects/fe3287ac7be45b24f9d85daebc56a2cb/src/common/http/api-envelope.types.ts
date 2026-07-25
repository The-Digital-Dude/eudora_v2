export type ApiPaginationMeta = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

export type ApiEnvelopeMeta = {
  requestId: string;
  timestamp: string;
  version: 'v1';
  path: string;
  method: string;
  pagination?: ApiPaginationMeta;
};

export type ApiSuccessEnvelope<T> = {
  success: true;
  code: string;
  message: string;
  data: T;
  meta: ApiEnvelopeMeta;
};

export type ApiErrorDetail = {
  field?: string;
  code: string;
  message: string;
};

export type ApiErrorEnvelope = {
  success: false;
  code: string;
  message: string;
  errors?: ApiErrorDetail[];
  meta: ApiEnvelopeMeta;
};
