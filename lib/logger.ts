// Simple performance-friendly logger
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

// Configure based on environment
const CURRENT_LOG_LEVEL = process.env.NODE_ENV === 'production' 
  ? LOG_LEVELS.INFO 
  : LOG_LEVELS.DEBUG;

type LogData = Record<string, any>;

class Logger {
  private lastPerfMark: Record<string, number> = {};
  
  debug(message: string, data?: LogData) {
    if (CURRENT_LOG_LEVEL <= LOG_LEVELS.DEBUG) {
      console.log(`[DEBUG] ${message}`, data || '');
    }
  }
  
  info(message: string, data?: LogData) {
    if (CURRENT_LOG_LEVEL <= LOG_LEVELS.INFO) {
      console.log(`[INFO] ${message}`, data || '');
    }
  }
  
  warn(message: string, data?: LogData) {
    if (CURRENT_LOG_LEVEL <= LOG_LEVELS.WARN) {
      console.warn(`[WARN] ${message}`, data || '');
    }
  }
  
  error(message: string, error?: any) {
    if (CURRENT_LOG_LEVEL <= LOG_LEVELS.ERROR) {
      console.error(`[ERROR] ${message}`, error || '');
    }
  }
  
  // Performance tracking helpers
  startTimer(label: string) {
    this.lastPerfMark[label] = performance.now();
    this.debug(`Timer started: ${label}`);
  }
  
  endTimer(label: string) {
    if (this.lastPerfMark[label]) {
      const duration = performance.now() - this.lastPerfMark[label];
      this.debug(`Timer ${label}: ${duration.toFixed(2)}ms`);
      delete this.lastPerfMark[label];
      return duration;
    }
    return 0;
  }
}

export const logger = new Logger(); 