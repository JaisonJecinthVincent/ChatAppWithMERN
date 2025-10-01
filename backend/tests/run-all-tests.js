#!/usr/bin/env node

import { spawn } from 'child_process';
import { performance } from 'perf_hooks';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class TestRunner {
  constructor() {
    this.results = {
      unit: { status: 'pending', duration: 0, details: null },
      integration: { status: 'pending', duration: 0, details: null },
      load: { status: 'pending', duration: 0, details: null },
      cluster: { status: 'pending', duration: 0, details: null }
    };
  }

  async runAllTests() {
    console.log('🧪 Starting Comprehensive Test Suite for Clustered Chat App');
    console.log('============================================================\n');

    const startTime = performance.now();

    try {
      // Run tests in sequence to avoid resource conflicts
      await this.runUnitTests();
      await this.runIntegrationTests();
      await this.runClusterTests();
      await this.runLoadTests();

    } catch (error) {
      console.error('❌ Test suite failed:', error);
    }

    const totalDuration = (performance.now() - startTime) / 1000;
    this.generateSummaryReport(totalDuration);
  }

  async runUnitTests() {
    console.log('🔬 Running Unit Tests...');
    const startTime = performance.now();

    try {
      const result = await this.runCommand('npm', ['test', '--', '--testPathPattern=unit'], {
        timeout: 60000
      });

      this.results.unit = {
        status: result.code === 0 ? 'passed' : 'failed',
        duration: (performance.now() - startTime) / 1000,
        details: {
          stdout: result.stdout,
          stderr: result.stderr,
          code: result.code
        }
      };

      if (result.code === 0) {
        console.log('✅ Unit tests passed\n');
      } else {
        console.log('❌ Unit tests failed\n');
        console.log('Error output:', result.stderr);
      }

    } catch (error) {
      this.results.unit = {
        status: 'error',
        duration: (performance.now() - startTime) / 1000,
        details: { error: error.message }
      };
      console.log('💥 Unit tests encountered an error:', error.message, '\n');
    }
  }

  async runIntegrationTests() {
    console.log('🔗 Running Integration Tests...');
    const startTime = performance.now();

    try {
      const result = await this.runCommand('npm', ['test', '--', '--testPathPattern=integration'], {
        timeout: 180000 // 3 minutes
      });

      this.results.integration = {
        status: result.code === 0 ? 'passed' : 'failed',
        duration: (performance.now() - startTime) / 1000,
        details: {
          stdout: result.stdout,
          stderr: result.stderr,
          code: result.code
        }
      };

      if (result.code === 0) {
        console.log('✅ Integration tests passed\n');
      } else {
        console.log('❌ Integration tests failed\n');
        console.log('Error output:', result.stderr);
      }

    } catch (error) {
      this.results.integration = {
        status: 'error',
        duration: (performance.now() - startTime) / 1000,
        details: { error: error.message }
      };
      console.log('💥 Integration tests encountered an error:', error.message, '\n');
    }
  }

  async runClusterTests() {
    console.log('🏗️  Running Cluster Tests...');
    const startTime = performance.now();

    try {
      const result = await this.runCommand('npm', ['run', 'test:cluster'], {
        timeout: 300000 // 5 minutes
      });

      this.results.cluster = {
        status: result.code === 0 ? 'passed' : 'failed',
        duration: (performance.now() - startTime) / 1000,
        details: {
          stdout: result.stdout,
          stderr: result.stderr,
          code: result.code
        }
      };

      if (result.code === 0) {
        console.log('✅ Cluster tests passed\n');
      } else {
        console.log('❌ Cluster tests failed\n');
        console.log('Error output:', result.stderr);
      }

    } catch (error) {
      this.results.cluster = {
        status: 'error',
        duration: (performance.now() - startTime) / 1000,
        details: { error: error.message }
      };
      console.log('💥 Cluster tests encountered an error:', error.message, '\n');
    }
  }

  async runLoadTests() {
    console.log('🚀 Running Load Tests...');
    const startTime = performance.now();

    try {
      // First start the cluster for load testing
      console.log('📦 Starting cluster for load testing...');
      const clusterProcess = spawn('node', ['cluster.js'], {
        env: { ...process.env, PORT: '5002', MAX_WORKERS: '4' },
        stdio: 'pipe'
      });

      // Wait for cluster to be ready
      await this.waitForServerReady('http://localhost:5002/health', 30000);
      console.log('✅ Cluster is ready for load testing');

      try {
        // Run Socket.IO load test
        console.log('🔌 Running Socket.IO Load Test...');
        const socketResult = await this.runCommand('node', [
          path.join(__dirname, 'load', 'socket-load-test.js'),
          '--url', 'http://localhost:5002',
          '--totalUsers', '200',
          '--concurrentUsers', '25',
          '--testDuration', '30000' // 30 seconds for quick test
        ], { timeout: 120000 });

        // Run Artillery load test if available
        console.log('🎯 Running Artillery Load Test...');
        const artilleryResult = await this.runCommand('npx', [
          'artillery', 'run',
          '--target', 'http://localhost:5002',
          path.join(__dirname, 'load', 'cluster-load-test.yml')
        ], { timeout: 180000 });

        this.results.load = {
          status: (socketResult.code === 0 && artilleryResult.code === 0) ? 'passed' : 'partial',
          duration: (performance.now() - startTime) / 1000,
          details: {
            socket: {
              stdout: socketResult.stdout,
              stderr: socketResult.stderr,
              code: socketResult.code
            },
            artillery: {
              stdout: artilleryResult.stdout,
              stderr: artilleryResult.stderr,
              code: artilleryResult.code
            }
          }
        };

        if (socketResult.code === 0 && artilleryResult.code === 0) {
          console.log('✅ Load tests completed successfully\n');
        } else {
          console.log('⚠️  Load tests completed with some issues\n');
        }

      } finally {
        // Always clean up the cluster process
        console.log('🛑 Stopping test cluster...');
        clusterProcess.kill('SIGTERM');
        await this.sleep(3000);
        if (!clusterProcess.killed) {
          clusterProcess.kill('SIGKILL');
        }
      }

    } catch (error) {
      this.results.load = {
        status: 'error',
        duration: (performance.now() - startTime) / 1000,
        details: { error: error.message }
      };
      console.log('💥 Load tests encountered an error:', error.message, '\n');
    }
  }

  async runCommand(command, args, options = {}) {
    return new Promise((resolve, reject) => {
      const process = spawn(command, args, {
        stdio: 'pipe',
        ...options
      });

      let stdout = '';
      let stderr = '';

      process.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        resolve({ code, stdout, stderr });
      });

      process.on('error', (error) => {
        reject(error);
      });

      // Handle timeout
      if (options.timeout) {
        setTimeout(() => {
          process.kill('SIGKILL');
          reject(new Error(`Command timeout after ${options.timeout}ms`));
        }, options.timeout);
      }
    });
  }

  async waitForServerReady(url, timeout = 30000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          return true;
        }
      } catch (error) {
        // Server not ready yet
      }
      
      await this.sleep(1000);
    }
    
    throw new Error(`Server not ready after ${timeout}ms`);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  generateSummaryReport(totalDuration) {
    console.log('📊 Test Suite Summary Report');
    console.log('============================\n');

    const tests = Object.entries(this.results);
    let passed = 0;
    let failed = 0;
    let errors = 0;

    tests.forEach(([testType, result]) => {
      const icon = result.status === 'passed' ? '✅' : 
                   result.status === 'failed' ? '❌' : 
                   result.status === 'partial' ? '⚠️' : '💥';
      
      console.log(`${icon} ${testType.toUpperCase().padEnd(12)} | ${result.status.padEnd(8)} | ${result.duration.toFixed(2)}s`);
      
      if (result.status === 'passed') passed++;
      else if (result.status === 'failed') failed++;
      else errors++;
    });

    console.log('\n' + '='.repeat(50));
    console.log(`Total Duration: ${totalDuration.toFixed(2)}s`);
    console.log(`Tests Passed: ${passed}`);
    console.log(`Tests Failed: ${failed}`);
    console.log(`Tests with Errors: ${errors}`);
    console.log(`Success Rate: ${((passed / tests.length) * 100).toFixed(1)}%`);

    // Performance assessment
    console.log('\n🎯 Overall Assessment:');
    if (passed === tests.length) {
      console.log('🎉 EXCELLENT: All tests passed! Your clustered chat app is ready for production.');
    } else if (passed >= tests.length * 0.75) {
      console.log('✔️  GOOD: Most tests passed. Review failed tests and address issues.');
    } else if (passed >= tests.length * 0.5) {
      console.log('⚠️  FAIR: Some tests passed. Significant issues need to be addressed.');
    } else {
      console.log('❌ POOR: Many tests failed. Major issues need immediate attention.');
    }

    // Recommendations
    console.log('\n📋 Recommendations:');
    
    if (this.results.unit.status !== 'passed') {
      console.log('• Fix unit test failures - these indicate core functionality issues');
    }
    
    if (this.results.integration.status !== 'passed') {
      console.log('• Address integration test issues - API endpoints may not be working correctly');
    }
    
    if (this.results.cluster.status !== 'passed') {
      console.log('• Resolve cluster functionality problems - clustering may not be working properly');
    }
    
    if (this.results.load.status !== 'passed') {
      console.log('• Optimize for better load handling - performance under stress needs improvement');
    }

    if (passed === tests.length) {
      console.log('• 🚀 Your application is ready for deployment!');
      console.log('• 📈 Consider implementing monitoring and alerting in production');
      console.log('• 🔒 Review security configurations before going live');
    }
  }
}

// Run tests if called directly
if (process.argv[1].endsWith('run-all-tests.js')) {
  const runner = new TestRunner();
  runner.runAllTests().catch(console.error);
}

export default TestRunner;