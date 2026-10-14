export interface SqlConnection {
  execAsync(sql: string): Promise<void>;
  runAsync(
    sql: string,
    ...params: (string | number | null)[]
  ): Promise<unknown>;
  getAllAsync<T>(
    sql: string,
    ...params: (string | number | null)[]
  ): Promise<T[]>;
}
export interface Database extends SqlConnection {
  transaction(task: (tx: SqlConnection) => Promise<void>): Promise<void>;
}
