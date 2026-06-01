self.onmessage = async (e: MessageEvent<File>) => {
  const file = e.data;
  console.log(`[HASH WORKER] Task received. File Name: '${file.name}', Size: ${file.size} bytes, Type: '${file.type}'`);
  
  try {
    const startTime = performance.now();
    console.log("[HASH WORKER] Reading file bytes into ArrayBuffer stream...");
    const buffer = await file.arrayBuffer();
    console.log(`[HASH WORKER] File bytes loaded. Buffer size: ${buffer.byteLength} bytes. Executing SHA-256 subtle digest...`);
    
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    console.log("[HASH WORKER] Subtle digest calculation completed. Parsing binary hash to hex string representation...");
    
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    const duration = performance.now() - startTime;
    console.log(`[HASH WORKER] Hash successfully calculated in ${duration.toFixed(2)}ms. Calculated SHA-256 Hex: ${hashHex}`);
    
    self.postMessage({ hash: hashHex });
  } catch (err: any) {
    console.error("[HASH WORKER ERROR] Critical failure calculating SHA-256 hash inside background thread context!", {
      errorMessage: err.message,
      errorStack: err.stack,
      targetFile: file.name
    });
    self.postMessage({ error: 'Hash calculation failed' });
  }
};