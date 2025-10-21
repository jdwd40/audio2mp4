import { EventEmitter } from 'events';
import { Response } from 'express';

/**
 * Event types that can be emitted for a job
 */
export interface LogEvent {
  type: 'log';
  data: string;
}

export interface ProgressEvent {
  type: 'progress';
  data: {
    step: 'segment' | 'concat';
    index?: number;
    total?: number;
  };
}

export interface DoneEvent {
  type: 'done';
  data: {
    downloadUrl: string;
  };
}

export interface ErrorEvent {
  type: 'error';
  data: string;
}

export type JobEvent = LogEvent | ProgressEvent | DoneEvent | ErrorEvent;

/**
 * Manages Server-Sent Events connections for job progress
 */
class JobEventEmitter {
  private emitters = new Map<string, EventEmitter>();
  private connections = new Map<string, Set<Response>>();

  /**
   * Get or create an event emitter for a job
   */
  private getEmitter(jobId: string): EventEmitter {
    let emitter = this.emitters.get(jobId);
    if (!emitter) {
      emitter = new EventEmitter();
      this.emitters.set(jobId, emitter);
    }
    return emitter;
  }

  /**
   * Register an SSE connection for a job
   */
  registerConnection(jobId: string, res: Response): void {
    const emitter = this.getEmitter(jobId);
    
    // Add to connections set
    if (!this.connections.has(jobId)) {
      this.connections.set(jobId, new Set());
    }
    this.connections.get(jobId)!.add(res);

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Send initial comment to establish connection
    res.write(': connected\n\n');

    // Set up event listeners
    const onLog = (data: string) => this.sendEvent(res, 'log', data);
    const onProgress = (data: ProgressEvent['data']) => this.sendEvent(res, 'progress', JSON.stringify(data));
    const onDone = (data: DoneEvent['data']) => this.sendEvent(res, 'done', JSON.stringify(data));
    const onError = (data: string) => this.sendEvent(res, 'error', data);

    emitter.on('log', onLog);
    emitter.on('progress', onProgress);
    emitter.on('done', onDone);
    emitter.on('error', onError);

    // Clean up on disconnect
    res.on('close', () => {
      emitter.off('log', onLog);
      emitter.off('progress', onProgress);
      emitter.off('done', onDone);
      emitter.off('error', onError);

      // Remove from connections
      const connections = this.connections.get(jobId);
      if (connections) {
        connections.delete(res);
        if (connections.size === 0) {
          this.connections.delete(jobId);
        }
      }
    });
  }

  /**
   * Send an SSE event to a specific response
   */
  private sendEvent(res: Response, event: string, data: string): void {
    try {
      res.write(`event: ${event}\n`);
      res.write(`data: ${data}\n\n`);
    } catch (error) {
      // Connection might be closed
      console.error('Error sending SSE event:', error);
    }
  }

  /**
   * Emit a log event for a job
   */
  emitLog(jobId: string, message: string): void {
    const emitter = this.emitters.get(jobId);
    if (emitter) {
      emitter.emit('log', message);
    }
  }

  /**
   * Emit a progress event for a job
   */
  emitProgress(jobId: string, data: ProgressEvent['data']): void {
    const emitter = this.emitters.get(jobId);
    if (emitter) {
      emitter.emit('progress', data);
    }
  }

  /**
   * Emit a done event for a job
   */
  emitDone(jobId: string, downloadUrl: string): void {
    const emitter = this.emitters.get(jobId);
    if (emitter) {
      emitter.emit('done', { downloadUrl });
    }
  }

  /**
   * Emit an error event for a job
   */
  emitError(jobId: string, message: string): void {
    const emitter = this.emitters.get(jobId);
    if (emitter) {
      emitter.emit('error', message);
    }
  }

  /**
   * Clean up emitter for a job (call after job is done and cleanup period expires)
   */
  cleanup(jobId: string): void {
    // Close all connections
    const connections = this.connections.get(jobId);
    if (connections) {
      connections.forEach(res => {
        try {
          res.end();
        } catch (error) {
          // Ignore errors when closing
        }
      });
      this.connections.delete(jobId);
    }

    // Remove emitter
    const emitter = this.emitters.get(jobId);
    if (emitter) {
      emitter.removeAllListeners();
      this.emitters.delete(jobId);
    }
  }

  /**
   * Get number of active connections for a job
   */
  getConnectionCount(jobId: string): number {
    const connections = this.connections.get(jobId);
    return connections ? connections.size : 0;
  }
}

export const jobEventEmitter = new JobEventEmitter();

