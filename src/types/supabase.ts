export interface SupabaseResult<T> {
  data: T | null;
  error: { message?: string; code?: string; details?: string } | null;
}

export interface SupabaseListResult<T> {
  data: T[] | null;
  error: { message?: string; code?: string; details?: string } | null;
}

export interface SupabaseQueryBuilder<T = any> extends PromiseLike<SupabaseListResult<T>> {
  select(columns?: string): SupabaseQueryBuilder<T>;
  insert(values: unknown): SupabaseQueryBuilder<T>;
  update(values: unknown): SupabaseQueryBuilder<T>;
  upsert(values: unknown): SupabaseQueryBuilder<T>;
  delete(): SupabaseQueryBuilder<T>;
  eq(column: string, value: unknown): SupabaseQueryBuilder<T>;
  neq(column: string, value: unknown): SupabaseQueryBuilder<T>;
  is(column: string, value: unknown): SupabaseQueryBuilder<T>;
  in(column: string, values: unknown[]): SupabaseQueryBuilder<T>;
  gte(column: string, value: unknown): SupabaseQueryBuilder<T>;
  lte(column: string, value: unknown): SupabaseQueryBuilder<T>;
  order(column: string, options?: { ascending?: boolean }): SupabaseQueryBuilder<T>;
  limit(limit: number): SupabaseQueryBuilder<T>;
  range(from: number, to: number): SupabaseQueryBuilder<T>;
  single(): Promise<SupabaseResult<T>>;
  maybeSingle(): Promise<SupabaseResult<T>>;
}

export interface SupabaseClientLike {
  from<T = any>(table: string): SupabaseQueryBuilder<T>;
  rpc<T = any>(name: string, params?: Record<string, unknown>): Promise<SupabaseResult<T>>;
  channel(name: string): any;
  removeChannel(channel: any): Promise<unknown> | unknown;
  storage?: any;
  auth?: any;
}
