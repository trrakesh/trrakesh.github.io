function $parcel$export(e, n, v, s) {
  Object.defineProperty(e, n, {get: v, set: s, enumerable: true, configurable: true});
}

function $parcel$interopDefault(a) {
  return a && a.__esModule ? a.default : a;
}

	  var $parcel$global = globalThis;
    
var $parcel$modules = {};
var $parcel$inits = {};

var parcelRequire = $parcel$global["parcelRequire477f"];

if (parcelRequire == null) {
  parcelRequire = function(id) {
	if (id in $parcel$modules) {
	  return $parcel$modules[id].exports;
	}
	if (id in $parcel$inits) {
	  var init = $parcel$inits[id];
	  delete $parcel$inits[id];
	  var module = {id: id, exports: {}};
	  $parcel$modules[id] = module;
	  init.call(module.exports, module, module.exports);
	  return module.exports;
	}
	var err = new Error("Cannot find module '" + id + "'");
	err.code = 'MODULE_NOT_FOUND';
	throw err;
  };

  parcelRequire.register = function register(id, init) {
	$parcel$inits[id] = init;
  };

  $parcel$global["parcelRequire477f"] = parcelRequire;
}

var parcelRegister = parcelRequire.register;
parcelRegister("bLj8J", function(module, exports) {
module.exports = import("17fYX").then(()=>parcelRequire('iwKFf'));

});

parcelRegister("95Gl6", function(module, exports) {
module.exports = import("35K3k").then(()=>parcelRequire('2rgbf'));

});

parcelRegister("fMWMS", function(module, exports) {
module.exports = import("vZCF2").then(()=>parcelRequire('4uwlf'));

});

parcelRegister("igqRC", function(module, exports) {
module.exports = import("d4LkX").then(()=>parcelRequire('goOsG'));

});

parcelRegister("fJX1b", function(module, exports) {
module.exports = import("cJDqv").then(()=>parcelRequire('33Iaz'));

});

parcelRegister("8DCXm", function(module, exports) {
module.exports = import("3OCVy").then(()=>parcelRequire('ZyG7t'));

});

parcelRegister("4Rl8x", function(module, exports) {
module.exports = import("eXP7h").then(()=>parcelRequire('1Zjpz'));

});

parcelRegister("2L4I1", function(module, exports) {
module.exports = import("huGMm").then(()=>parcelRequire('kRp02'));

});

parcelRegister("aoS6S", function(module, exports) {
module.exports = import("fa8eB").then(()=>parcelRequire('cPKkO'));

});

parcelRegister("lFLAr", function(module, exports) {
module.exports = import("9N6hS").then(()=>parcelRequire('31SZA'));

});

parcelRegister("6Bwyb", function(module, exports) {
module.exports = import("gmXBg").then(()=>parcelRequire('3BUdr'));

});

parcelRegister("2ISsY", function(module, exports) {
module.exports = import("hHpLC").then(()=>parcelRequire('hMNzR'));

});

parcelRegister("6fpwM", function(module, exports) {

$parcel$export(module.exports, "ESP8266ROM", () => $48c7f21169d49005$export$b7173f2d596cb720);

var $3KHBw = parcelRequire("3KHBw");
class $48c7f21169d49005$export$b7173f2d596cb720 extends (0, $3KHBw.ROM) {
	constructor(){
		super(...arguments);
		this.CHIP_NAME = "ESP8266";
		this.CHIP_DETECT_MAGIC_VALUE = [
			0xfff0c101
		];
		this.EFUSE_RD_REG_BASE = 0x3ff00050;
		this.UART_CLKDIV_REG = 0x60000014;
		this.UART_CLKDIV_MASK = 0xfffff;
		this.XTAL_CLK_DIVIDER = 2;
		this.FLASH_WRITE_SIZE = 0x4000;
		// NOT IMPLEMENTED, SETTING EMPTY VALUE
		this.BOOTLOADER_FLASH_OFFSET = 0;
		this.UART_DATE_REG_ADDR = 0;
		this.FLASH_SIZES = {
			"512KB": 0x00,
			"256KB": 0x10,
			"1MB": 0x20,
			"2MB": 0x30,
			"4MB": 0x40,
			"2MB-c1": 0x50,
			"4MB-c1": 0x60,
			"8MB": 0x80,
			"16MB": 0x90
		};
		this.FLASH_FREQUENCY = {
			"80m": 0xf,
			"40m": 0x0,
			"26m": 0x1,
			"20m": 0x2
		};
		this.MEMORY_MAP = [
			[
				0x3ff00000,
				0x3ff00010,
				"DPORT"
			],
			[
				0x3ffe8000,
				0x40000000,
				"DRAM"
			],
			[
				0x40100000,
				0x40108000,
				"IRAM"
			],
			[
				0x40201010,
				0x402e1010,
				"IROM"
			]
		];
		this.SPI_REG_BASE = 0x60000200;
		this.SPI_USR_OFFS = 0x1c;
		this.SPI_USR1_OFFS = 0x20;
		this.SPI_USR2_OFFS = 0x24;
		this.SPI_MOSI_DLEN_OFFS = 0; // not in esp8266
		this.SPI_MISO_DLEN_OFFS = 0; // not in esp8266
		this.SPI_W0_OFFS = 0x40;
		this.getChipFeatures = async (loader)=>{
			const features = [
				"WiFi"
			];
			if (await this.getChipDescription(loader) == "ESP8285") features.push("Embedded Flash");
			return features;
		};
	}
	async readEfuse(loader, offset) {
		const addr = this.EFUSE_RD_REG_BASE + 4 * offset;
		loader.debug("Read efuse " + addr);
		return await loader.readReg(addr);
	}
	async getChipDescription(loader) {
		const efuse3 = await this.readEfuse(loader, 2);
		const efuse0 = await this.readEfuse(loader, 0);
		const is8285 = (efuse0 & 16 | efuse3 & 65536) != 0; // One or the other efuse bit is set for ESP8285
		return is8285 ? "ESP8285" : "ESP8266EX";
	}
	async getCrystalFreq(loader) {
		const uartDiv = await loader.readReg(this.UART_CLKDIV_REG) & this.UART_CLKDIV_MASK;
		const etsXtal = loader.transport.baudrate * uartDiv / 1000000 / this.XTAL_CLK_DIVIDER;
		let normXtal;
		if (etsXtal > 33) normXtal = 40;
		else normXtal = 26;
		if (Math.abs(normXtal - etsXtal) > 1) loader.info("WARNING: Detected crystal freq " + etsXtal + "MHz is quite different to normalized freq " + normXtal + "MHz. Unsupported crystal in use?");
		return normXtal;
	}
	_d2h(d) {
		const h = (+d).toString(16);
		return h.length === 1 ? "0" + h : h;
	}

}
