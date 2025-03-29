const isDevelopment = process.env.NODE_ENV !== 'production';

export const logger = {
  info: (...args: any[]) => {
    if (isDevelopment) {
      console.log(new Date().toISOString(), ...args);
    }
  },
  error: (...args: any[]) => {
    console.error(new Date().toISOString(), ...args);
  },
  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn(new Date().toISOString(), ...args);
    }
  },
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.debug(new Date().toISOString(), ...args);
    }
  }
}; 