import queryPerformanceMonitor from './queryPerformanceMonitor.js';

/**
 * Enhanced MongoDB Query Wrapper with Performance Monitoring
 * Provides optimized query methods with automatic performance tracking
 */
class OptimizedQuery {
  constructor(model) {
    this.model = model;
    this.modelName = model.modelName;
  }

  /**
   * Optimized findById with caching consideration
   */
  async findById(id, select = null, options = {}) {
    const query = { _id: id };
    return queryPerformanceMonitor.monitorQuery('findById', this.modelName, query, async () => {
      let mongoQuery = this.model.findById(id);
      if (select) mongoQuery = mongoQuery.select(select);
      return mongoQuery.lean(options.lean !== false).exec();
    });
  }

  /**
   * Optimized findOne with performance monitoring
   */
  async findOne(filter, select = null, options = {}) {
    return queryPerformanceMonitor.monitorQuery('findOne', this.modelName, filter, async () => {
      let mongoQuery = this.model.findOne(filter);
      if (select) mongoQuery = mongoQuery.select(select);
      if (options.populate) mongoQuery = mongoQuery.populate(options.populate);
      return mongoQuery.lean(options.lean !== false).exec();
    });
  }

  /**
   * Optimized find with performance monitoring and pagination
   */
  async find(filter = {}, select = null, options = {}) {
    return queryPerformanceMonitor.monitorQuery('find', this.modelName, filter, async () => {
      let mongoQuery = this.model.find(filter);
      
      if (select) mongoQuery = mongoQuery.select(select);
      if (options.populate) mongoQuery = mongoQuery.populate(options.populate);
      if (options.sort) mongoQuery = mongoQuery.sort(options.sort);
      if (options.skip) mongoQuery = mongoQuery.skip(options.skip);
      if (options.limit) mongoQuery = mongoQuery.limit(options.limit);
      
      return mongoQuery.lean(options.lean !== false).exec();
    });
  }

  /**
   * Optimized aggregate with performance monitoring
   */
  async aggregate(pipeline, options = {}) {
    return queryPerformanceMonitor.monitorQuery('aggregate', this.modelName, pipeline, async () => {
      return this.model.aggregate(pipeline, options).exec();
    });
  }

  /**
   * Optimized updateOne with performance monitoring
   */
  async updateOne(filter, update, options = {}) {
    return queryPerformanceMonitor.monitorQuery('updateOne', this.modelName, { filter, update }, async () => {
      return this.model.updateOne(filter, update, options).exec();
    });
  }

  /**
   * Optimized updateMany with performance monitoring
   */
  async updateMany(filter, update, options = {}) {
    return queryPerformanceMonitor.monitorQuery('updateMany', this.modelName, { filter, update }, async () => {
      return this.model.updateMany(filter, update, options).exec();
    });
  }

  /**
   * Optimized deleteOne with performance monitoring
   */
  async deleteOne(filter, options = {}) {
    return queryPerformanceMonitor.monitorQuery('deleteOne', this.modelName, filter, async () => {
      return this.model.deleteOne(filter, options).exec();
    });
  }

  /**
   * Optimized count with performance monitoring
   */
  async countDocuments(filter = {}, options = {}) {
    return queryPerformanceMonitor.monitorQuery('countDocuments', this.modelName, filter, async () => {
      return this.model.countDocuments(filter, options).exec();
    });
  }

  /**
   * Get query execution plan for analysis
   */
  async explain(query, method = 'find') {
    try {
      const executionStats = await this.model[method](query).explain('executionStats');
      console.log(`📊 Query Execution Plan for ${this.modelName}.${method}:`);
      console.log(`Documents Examined: ${executionStats.executionStats?.totalDocsExamined || 'N/A'}`);
      console.log(`Documents Returned: ${executionStats.executionStats?.totalDocsReturned || 'N/A'}`);
      console.log(`Execution Time: ${executionStats.executionStats?.executionTimeMillis || 'N/A'}ms`);
      console.log(`Index Used: ${executionStats.executionStats?.winningPlan?.inputStage?.indexName || 'Collection Scan'}`);
      return executionStats;
    } catch (error) {
      console.error(`Error getting query execution plan: ${error.message}`);
      return null;
    }
  }
}

/**
 * Factory function to create optimized query instances
 */
export function createOptimizedQuery(model) {
  return new OptimizedQuery(model);
}

/**
 * Utility function for complex message queries with optimization
 */
export class MessageQueryOptimizer {
  constructor(MessageModel) {
    this.Message = MessageModel;
    this.query = createOptimizedQuery(MessageModel);
  }

  /**
   * Optimized conversation messages query
   */
  async getConversationMessages(senderId, receiverId, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    
    // Use the optimized compound index
    const filter = {
      $or: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId }
      ]
    };

    return this.query.find(filter, null, {
      sort: { createdAt: -1 },
      skip,
      limit,
      populate: {
        path: "replyTo",
        populate: {
          path: "senderId",
          select: "fullName profilePic"
        }
      },
      lean: true
    });
  }

  /**
   * Optimized group messages query
   */
  async getGroupMessages(groupId, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    
    return this.query.find(
      { groupId },
      null,
      {
        sort: { createdAt: -1 },
        skip,
        limit,
        populate: [
          { path: 'senderId', select: 'fullName profilePic' },
          { 
            path: 'replyTo',
            populate: {
              path: 'senderId',
              select: 'fullName profilePic'
            }
          }
        ],
        lean: true
      }
    );
  }
}

export default OptimizedQuery;