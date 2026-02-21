/**
 * Type declarations for MindAR library
 * MindAR doesn't provide official TypeScript definitions
 */

declare module 'mind-ar' {
  export class MindARThree {
    constructor(config: {
      container: HTMLElement;
      imageTargetSrc: string;
    });
    
    renderer: import('three').WebGLRenderer;
    scene: import('three').Scene;
    camera: import('three').Camera;
    
    start(): Promise<void>;
    stop(): void;
    addAnchor(index: number): any;
  }
}

// Extend window for locally bundled MindAR
declare global {
  interface Window {
    MindARThree?: any;
  }
}

export {};
