export type ApiResponse<T = unknown, TException = unknown> = {
  message?: string;
  data?: T;
  code: number;
  expextion?: TException;
};
