import { getDB } from '../db/connection.js';
import { validate, aggregateComputationSchema } from '../middleware/validation.js';
import { logAuditEvent } from '../audit/logger.js';
import { generateHash } from '../utils/security.js';

/**
 * Aggregate Computation Routes
 * 
 * RESPONSIBILITY: Aggregate statistics computation (ANALYST role)
 * 
 * MUST:
 * - Compute aggregates from stored data
 * - Return only aggregate statistics (NO raw data)
 * - Store computation hashes for audit
 * - Require ANALYST role
 * - Prevent reverse engineering of raw data
 * 
 * MUST NEVER:
 * - Return raw census data
 * - Allow reverse data flow from aggregates
 * - Expose individual submission details
 * - Allow other roles to compute aggregates
 * - Export or download raw data
 */

export async function aggregateRoutes(fastify) {
  // Compute aggregate statistics
  // ANALYST role only
  fastify.post('/aggregates/compute', {
    preHandler: [
      fastify.authenticate,
      fastify.requireRole('ANALYST'),
      validate(aggregateComputationSchema)
    ],
    schema: {
      description: 'Compute aggregate statistics (no raw data access)',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['geographicLevel', 'geographicCode'],
        properties: {
          geographicLevel: {
            type: 'string',
            enum: ['state', 'district', 'block', 'village']
          },
          geographicCode: { type: 'string' },
          casteCategory: {
            type: 'string',
            enum: ['SC', 'ST', 'OBC', 'GENERAL', 'OTHER', 'ALL']
          }
        }
      }
    }
  }, async (request, reply) => {
    const db = getDB();
    const { geographicLevel, geographicCode, casteCategory } = request.body;

    // Build query based on geographic level
    // Only aggregates are computed, NO raw data is returned
    let query;
    let queryParams;

    if (geographicLevel === 'state') {
      query = `
        SELECT 
          state_code as geographic_code,
          caste_category,
          SUM(household_count) as total_households,
          SUM(population_count) as total_population,
          COUNT(*) as submission_count
        FROM census_submissions
        WHERE state_code = $1
        ${casteCategory && casteCategory !== 'ALL' ? 'AND caste_category = $2' : ''}
        GROUP BY state_code, caste_category
      `;
      queryParams = casteCategory && casteCategory !== 'ALL' 
        ? [geographicCode, casteCategory]
        : [geographicCode];
    } else if (geographicLevel === 'district') {
      query = `
        SELECT 
          district_code as geographic_code,
          caste_category,
          SUM(household_count) as total_households,
          SUM(population_count) as total_population,
          COUNT(*) as submission_count
        FROM census_submissions
        WHERE district_code = $1
        ${casteCategory && casteCategory !== 'ALL' ? 'AND caste_category = $2' : ''}
        GROUP BY district_code, caste_category
      `;
      queryParams = casteCategory && casteCategory !== 'ALL'
        ? [geographicCode, casteCategory]
        : [geographicCode];
    } else if (geographicLevel === 'block') {
      query = `
        SELECT 
          block_code as geographic_code,
          caste_category,
          SUM(household_count) as total_households,
          SUM(population_count) as total_population,
          COUNT(*) as submission_count
        FROM census_submissions
        WHERE block_code = $1
        ${casteCategory && casteCategory !== 'ALL' ? 'AND caste_category = $2' : ''}
        GROUP BY block_code, caste_category
      `;
      queryParams = casteCategory && casteCategory !== 'ALL'
        ? [geographicCode, casteCategory]
        : [geographicCode];
    } else if (geographicLevel === 'village') {
      query = `
        SELECT 
          village_code as geographic_code,
          caste_category,
          SUM(household_count) as total_households,
          SUM(population_count) as total_population,
          COUNT(*) as submission_count
        FROM census_submissions
        WHERE village_code = $1
        ${casteCategory && casteCategory !== 'ALL' ? 'AND caste_category = $2' : ''}
        GROUP BY village_code, caste_category
      `;
      queryParams = casteCategory && casteCategory !== 'ALL'
        ? [geographicCode, casteCategory]
        : [geographicCode];
    } else {
      return reply.code(400).send({ error: 'Invalid geographic level' });
    }

    // Execute aggregate query (NO raw data returned)
    const result = await db.query(query, queryParams);

    if (result.rows.length === 0) {
      return reply.code(404).send({ 
        error: 'No data found for the specified geographic area' 
      });
    }

    // Compute hash for integrity verification
    const aggregateData = {
      geographicLevel,
      geographicCode,
      casteCategory: casteCategory || 'ALL',
      aggregates: result.rows,
      computedAt: new Date().toISOString()
    };
    const computationHash = generateHash(aggregateData);

    // Store computation for audit trail
    for (const row of result.rows) {
      await db.query(
        `INSERT INTO aggregate_computations (
          computation_type, geographic_level, geographic_code,
          caste_category, aggregate_value, computed_by, computation_hash
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          'POPULATION_AGGREGATE',
          geographicLevel,
          geographicCode,
          row.caste_category,
          row.total_population,
          request.user.id,
          computationHash
        ]
      );
    }

    // Log audit event
    await logAuditEvent(fastify, {
      userId: request.user.id,
      actionType: 'AGGREGATE_COMPUTED',
      resourceType: 'aggregate',
      resourceId: null,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
      requestMethod: request.method,
      requestPath: request.url,
      statusCode: 200,
      metadata: {
        geographicLevel,
        geographicCode,
        casteCategory: casteCategory || 'ALL',
        resultCount: result.rows.length
      }
    });

    // Return aggregates only (NO raw data, NO reverse engineering possible)
    return reply.send({
      geographicLevel,
      geographicCode,
      casteCategory: casteCategory || 'ALL',
      aggregates: result.rows.map(row => ({
        casteCategory: row.caste_category,
        totalHouseholds: parseInt(row.total_households),
        totalPopulation: parseInt(row.total_population),
        submissionCount: parseInt(row.submission_count)
      })),
      computationHash,
      computedAt: aggregateData.computedAt,
      note: 'These are aggregate statistics only. Raw data is not accessible.'
    });
  });

  // Get stored aggregate computations (read-only)
  fastify.get('/aggregates/:id', {
    preHandler: [
      fastify.authenticate,
      fastify.requireRole('ANALYST', 'AUDITOR')
    ],
    schema: {
      description: 'Retrieve stored aggregate computation (no raw data)',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      }
    }
  }, async (request, reply) => {
    const db = getDB();
    const { id } = request.params;

    const result = await db.query(
      `SELECT 
        id, computation_type, geographic_level, geographic_code,
        caste_category, aggregate_value, computed_at, computation_hash
      FROM aggregate_computations
      WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return reply.code(404).send({ error: 'Aggregate computation not found' });
    }

    const aggregate = result.rows[0];

    // Log audit event
    await logAuditEvent(fastify, {
      userId: request.user.id,
      actionType: 'AGGREGATE_ACCESSED',
      resourceType: 'aggregate',
      resourceId: id,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
      requestMethod: request.method,
      requestPath: request.url,
      statusCode: 200,
      metadata: {}
    });

    return reply.send({
      id: aggregate.id,
      computationType: aggregate.computation_type,
      geographicLevel: aggregate.geographic_level,
      geographicCode: aggregate.geographic_code,
      casteCategory: aggregate.caste_category,
      aggregateValue: aggregate.aggregate_value,
      computedAt: aggregate.computed_at,
      computationHash: aggregate.computation_hash
    });
  });
}

