export interface ApiResponse<T> {
  data: T;
}
export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
}
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: Pagination;
}
