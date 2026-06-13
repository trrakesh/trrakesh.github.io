// Minimal stub to allow bundling the stub flasher for ESP32-S3
(function(global){
  function StubFlasher(){}
  StubFlasher.prototype.flash = async function(transport, bin){
    transport.write(new TextEncoder().encode('FLASH_START'));
    await new Promise(r=>setTimeout(r,100));
    transport.write(new TextEncoder().encode('FLASH_DONE'));
  };
  global.stubFlasher = new StubFlasher();
})(this);
