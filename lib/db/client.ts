// 데이터베이스 클라이언트 및 연결 관리

import { Pool, PoolClient } from 'pg';
import type { DatabaseConfig } from '@/lib/types/trending';

/**
 * PostgreSQL 연결 풀
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

/**
 * 데이터베이스 클라이언트
 */
export const db = {
  /**
   * SQL 쿼리 실행
   */
  async query(text: string, params?: any[]): Promise<any[]> {
    const start = Date.now();
    
    try {
      const result = await pool.query(text, params);
      const duration = Date.now() - start;
      
      if (process.env.LOG_LEVEL === 'debug') {
        console.log('[DB Query]', {
          text: text.substring(0, 100) + '...',
          duration: `${duration}ms`,
          rows: result.rowCount,
        });
      }
      
      return result.rows;
    } catch (error) {
      console.error('[DB Error]', {
        text: text.substring(0, 100),
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  },

  /**
   * 단일 행 조회
   */
  async queryOne(text: string, params?: any[]): Promise<any | null> {
    const rows = await this.query(text, params);
    return rows.length > 0 ? rows[0] : null;
  },

  /**
   * 트랜잭션 실행
   */
  async transaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[DB Transaction Error]', error);
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * 배치 삽입 (대량 데이터 처리)
   */
  async batchInsert(
    table: string,
    columns: string[],
    values: any[][]
  ): Promise<void> {
    if (values.length === 0) return;

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      for (const row of values) {
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        const query = `
          INSERT INTO ${table} (${columns.join(', ')})
          VALUES (${placeholders})
        `;
        await client.query(query, row);
      }
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * 연결 풀 종료
   */
  async end(): Promise<void> {
    await pool.end();
  },
};

/**
 * 데이터베이스 연결 확인
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await pool.query('SELECT 1');
    console.log('[DB] Connection successful');
    return true;
  } catch (error) {
    console.error('[DB] Connection failed:', error);
    return false;
  }
}

/**
 * 데이터베이스 초기화 (테이블 생성)
 */
export async function initializeDatabase(): Promise<void> {
  const fs = require('fs');
  const path = require('path');
  
  try {
    const schemaPath = path.join(process.cwd(), 'config', 'database.sql');
    
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf8');
      await pool.query(schema);
      console.log('[DB] Database initialized successfully');
    } else {
      console.warn('[DB] Schema file not found, skipping initialization');
    }
  } catch (error) {
    console.error('[DB] Initialization failed:', error);
    throw error;
  }
}

/**
 * 데이터베이스 헬스체크 API 헬퍼
 */
export async function getDatabaseHealth(): Promise<{
  connected: boolean;
  latency?: number;
  error?: string;
}> {
  const start = Date.now();
  
  try {
    await pool.query('SELECT 1');
    return {
      connected: true,
      latency: Date.now() - start,
    };
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

