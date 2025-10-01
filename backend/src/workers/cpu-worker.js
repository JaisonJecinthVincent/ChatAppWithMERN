import { parentPort } from 'worker_threads';
import bcrypt from 'bcryptjs';
import zlib from 'zlib';
import { promisify } from 'util';

// Promisify compression functions
const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);
const deflate = promisify(zlib.deflate);
const inflate = promisify(zlib.inflate);

// Task handlers
const taskHandlers = {
  async hash_password({ password }) {
    try {
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(password, salt);
      return { success: true, data: hashedPassword };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async compare_password({ password, hashedPassword }) {
    try {
      const isMatch = await bcrypt.compare(password, hashedPassword);
      return { success: true, data: isMatch };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async process_image({ imageData, options = {} }) {
    try {
      // Simulate image processing (in real app, you'd use sharp, jimp, etc.)
      const { resize, quality = 80, format = 'jpeg' } = options;
      
      // For now, just simulate processing time
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // In a real implementation, you would:
      // 1. Decode the image
      // 2. Apply transformations (resize, compress, etc.)
      // 3. Re-encode in desired format
      
      const result = {
        originalSize: imageData.length,
        processedSize: Math.floor(imageData.length * (quality / 100)),
        format,
        processed: true
      };
      
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async compress_data({ data, options = {} }) {
    try {
      const { algorithm = 'gzip', level = 6 } = options;
      
      let compressed;
      let originalSize = Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data);
      
      switch (algorithm) {
        case 'gzip':
          compressed = await gzip(data, { level });
          break;
        case 'deflate':
          compressed = await deflate(data, { level });
          break;
        default:
          throw new Error(`Unsupported compression algorithm: ${algorithm}`);
      }
      
      const compressionRatio = (1 - compressed.length / originalSize) * 100;
      
      return {
        success: true,
        data: {
          compressed: compressed.toString('base64'),
          originalSize,
          compressedSize: compressed.length,
          compressionRatio: Math.round(compressionRatio * 100) / 100,
          algorithm
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async decompress_data({ data, algorithm = 'gzip' }) {
    try {
      const compressedBuffer = Buffer.from(data, 'base64');
      
      let decompressed;
      
      switch (algorithm) {
        case 'gzip':
          decompressed = await gunzip(compressedBuffer);
          break;
        case 'deflate':
          decompressed = await inflate(compressedBuffer);
          break;
        default:
          throw new Error(`Unsupported decompression algorithm: ${algorithm}`);
      }
      
      return {
        success: true,
        data: {
          decompressed: decompressed.toString(),
          size: decompressed.length
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async cpu_intensive_task({ iterations = 1000000 }) {
    try {
      // Simulate CPU-intensive work
      let result = 0;
      for (let i = 0; i < iterations; i++) {
        result += Math.sqrt(i) * Math.sin(i);
      }
      
      return {
        success: true,
        data: {
          result,
          iterations,
          completed: true
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};

// Message handler
if (parentPort) {
  parentPort.on('message', async (taskData) => {
    try {
      const { type, ...params } = taskData;
      
      if (!taskHandlers[type]) {
        parentPort.postMessage({
          success: false,
          error: `Unknown task type: ${type}`
        });
        return;
      }
      
      const result = await taskHandlers[type](params);
      parentPort.postMessage(result);
      
    } catch (error) {
      parentPort.postMessage({
        success: false,
        error: error.message
      });
    }
  });

  // Worker ready signal
  parentPort.postMessage({
    success: true,
    data: { status: 'ready', pid: process.pid }
  });
}