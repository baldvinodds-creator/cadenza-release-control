import { createRequire } from "node:module"; const require = createRequire(import.meta.url);
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __commonJS = (cb, mod) => function __require2() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// infrastructure/release-custody/node_modules/postgres-array/index.js
var require_postgres_array = __commonJS({
  "infrastructure/release-custody/node_modules/postgres-array/index.js"(exports) {
    "use strict";
    exports.parse = function(source, transform) {
      return new ArrayParser(source, transform).parse();
    };
    var ArrayParser = class _ArrayParser {
      constructor(source, transform) {
        this.source = source;
        this.transform = transform || identity;
        this.position = 0;
        this.entries = [];
        this.recorded = [];
        this.dimension = 0;
      }
      isEof() {
        return this.position >= this.source.length;
      }
      nextCharacter() {
        var character = this.source[this.position++];
        if (character === "\\") {
          return {
            value: this.source[this.position++],
            escaped: true
          };
        }
        return {
          value: character,
          escaped: false
        };
      }
      record(character) {
        this.recorded.push(character);
      }
      newEntry(includeEmpty) {
        var entry;
        if (this.recorded.length > 0 || includeEmpty) {
          entry = this.recorded.join("");
          if (entry === "NULL" && !includeEmpty) {
            entry = null;
          }
          if (entry !== null) entry = this.transform(entry);
          this.entries.push(entry);
          this.recorded = [];
        }
      }
      consumeDimensions() {
        if (this.source[0] === "[") {
          while (!this.isEof()) {
            var char = this.nextCharacter();
            if (char.value === "=") break;
          }
        }
      }
      parse(nested) {
        var character, parser, quote;
        this.consumeDimensions();
        while (!this.isEof()) {
          character = this.nextCharacter();
          if (character.value === "{" && !quote) {
            this.dimension++;
            if (this.dimension > 1) {
              parser = new _ArrayParser(this.source.substr(this.position - 1), this.transform);
              this.entries.push(parser.parse(true));
              this.position += parser.position - 2;
            }
          } else if (character.value === "}" && !quote) {
            this.dimension--;
            if (!this.dimension) {
              this.newEntry();
              if (nested) return this.entries;
            }
          } else if (character.value === '"' && !character.escaped) {
            if (quote) this.newEntry(true);
            quote = !quote;
          } else if (character.value === "," && !quote) {
            this.newEntry();
          } else {
            this.record(character.value);
          }
        }
        if (this.dimension !== 0) {
          throw new Error("array dimension not balanced");
        }
        return this.entries;
      }
    };
    function identity(value) {
      return value;
    }
  }
});

// infrastructure/release-custody/node_modules/pg-types/lib/arrayParser.js
var require_arrayParser = __commonJS({
  "infrastructure/release-custody/node_modules/pg-types/lib/arrayParser.js"(exports, module) {
    var array = require_postgres_array();
    module.exports = {
      create: function(source, transform) {
        return {
          parse: function() {
            return array.parse(source, transform);
          }
        };
      }
    };
  }
});

// infrastructure/release-custody/node_modules/postgres-date/index.js
var require_postgres_date = __commonJS({
  "infrastructure/release-custody/node_modules/postgres-date/index.js"(exports, module) {
    "use strict";
    var DATE_TIME = /(\d{1,})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})(\.\d{1,})?.*?( BC)?$/;
    var DATE = /^(\d{1,})-(\d{2})-(\d{2})( BC)?$/;
    var TIME_ZONE = /([Z+-])(\d{2})?:?(\d{2})?:?(\d{2})?/;
    var INFINITY = /^-?infinity$/;
    module.exports = function parseDate(isoDate) {
      if (INFINITY.test(isoDate)) {
        return Number(isoDate.replace("i", "I"));
      }
      var matches = DATE_TIME.exec(isoDate);
      if (!matches) {
        return getDate(isoDate) || null;
      }
      var isBC = !!matches[8];
      var year = parseInt(matches[1], 10);
      if (isBC) {
        year = bcYearToNegativeYear(year);
      }
      var month = parseInt(matches[2], 10) - 1;
      var day = matches[3];
      var hour = parseInt(matches[4], 10);
      var minute = parseInt(matches[5], 10);
      var second = parseInt(matches[6], 10);
      var ms = matches[7];
      ms = ms ? 1e3 * parseFloat(ms) : 0;
      var date;
      var offset = timeZoneOffset(isoDate);
      if (offset != null) {
        date = new Date(Date.UTC(year, month, day, hour, minute, second, ms));
        if (is0To99(year)) {
          date.setUTCFullYear(year);
        }
        if (offset !== 0) {
          date.setTime(date.getTime() - offset);
        }
      } else {
        date = new Date(year, month, day, hour, minute, second, ms);
        if (is0To99(year)) {
          date.setFullYear(year);
        }
      }
      return date;
    };
    function getDate(isoDate) {
      var matches = DATE.exec(isoDate);
      if (!matches) {
        return;
      }
      var year = parseInt(matches[1], 10);
      var isBC = !!matches[4];
      if (isBC) {
        year = bcYearToNegativeYear(year);
      }
      var month = parseInt(matches[2], 10) - 1;
      var day = matches[3];
      var date = new Date(year, month, day);
      if (is0To99(year)) {
        date.setFullYear(year);
      }
      return date;
    }
    function timeZoneOffset(isoDate) {
      if (isoDate.endsWith("+00")) {
        return 0;
      }
      var zone = TIME_ZONE.exec(isoDate.split(" ")[1]);
      if (!zone) return;
      var type = zone[1];
      if (type === "Z") {
        return 0;
      }
      var sign = type === "-" ? -1 : 1;
      var offset = parseInt(zone[2], 10) * 3600 + parseInt(zone[3] || 0, 10) * 60 + parseInt(zone[4] || 0, 10);
      return offset * sign * 1e3;
    }
    function bcYearToNegativeYear(year) {
      return -(year - 1);
    }
    function is0To99(num) {
      return num >= 0 && num < 100;
    }
  }
});

// infrastructure/release-custody/node_modules/xtend/mutable.js
var require_mutable = __commonJS({
  "infrastructure/release-custody/node_modules/xtend/mutable.js"(exports, module) {
    module.exports = extend;
    var hasOwnProperty = Object.prototype.hasOwnProperty;
    function extend(target) {
      for (var i = 1; i < arguments.length; i++) {
        var source = arguments[i];
        for (var key in source) {
          if (hasOwnProperty.call(source, key)) {
            target[key] = source[key];
          }
        }
      }
      return target;
    }
  }
});

// infrastructure/release-custody/node_modules/postgres-interval/index.js
var require_postgres_interval = __commonJS({
  "infrastructure/release-custody/node_modules/postgres-interval/index.js"(exports, module) {
    "use strict";
    var extend = require_mutable();
    module.exports = PostgresInterval;
    function PostgresInterval(raw) {
      if (!(this instanceof PostgresInterval)) {
        return new PostgresInterval(raw);
      }
      extend(this, parse(raw));
    }
    var properties = ["seconds", "minutes", "hours", "days", "months", "years"];
    PostgresInterval.prototype.toPostgres = function() {
      var filtered = properties.filter(this.hasOwnProperty, this);
      if (this.milliseconds && filtered.indexOf("seconds") < 0) {
        filtered.push("seconds");
      }
      if (filtered.length === 0) return "0";
      return filtered.map(function(property) {
        var value = this[property] || 0;
        if (property === "seconds" && this.milliseconds) {
          value = (value + this.milliseconds / 1e3).toFixed(6).replace(/\.?0+$/, "");
        }
        return value + " " + property;
      }, this).join(" ");
    };
    var propertiesISOEquivalent = {
      years: "Y",
      months: "M",
      days: "D",
      hours: "H",
      minutes: "M",
      seconds: "S"
    };
    var dateProperties = ["years", "months", "days"];
    var timeProperties = ["hours", "minutes", "seconds"];
    PostgresInterval.prototype.toISOString = PostgresInterval.prototype.toISO = function() {
      var datePart = dateProperties.map(buildProperty, this).join("");
      var timePart = timeProperties.map(buildProperty, this).join("");
      return "P" + datePart + "T" + timePart;
      function buildProperty(property) {
        var value = this[property] || 0;
        if (property === "seconds" && this.milliseconds) {
          value = (value + this.milliseconds / 1e3).toFixed(6).replace(/0+$/, "");
        }
        return value + propertiesISOEquivalent[property];
      }
    };
    var NUMBER = "([+-]?\\d+)";
    var YEAR = NUMBER + "\\s+years?";
    var MONTH = NUMBER + "\\s+mons?";
    var DAY = NUMBER + "\\s+days?";
    var TIME = "([+-])?([\\d]*):(\\d\\d):(\\d\\d)\\.?(\\d{1,6})?";
    var INTERVAL = new RegExp([YEAR, MONTH, DAY, TIME].map(function(regexString) {
      return "(" + regexString + ")?";
    }).join("\\s*"));
    var positions = {
      years: 2,
      months: 4,
      days: 6,
      hours: 9,
      minutes: 10,
      seconds: 11,
      milliseconds: 12
    };
    var negatives = ["hours", "minutes", "seconds", "milliseconds"];
    function parseMilliseconds(fraction) {
      var microseconds = fraction + "000000".slice(fraction.length);
      return parseInt(microseconds, 10) / 1e3;
    }
    function parse(interval) {
      if (!interval) return {};
      var matches = INTERVAL.exec(interval);
      var isNegative = matches[8] === "-";
      return Object.keys(positions).reduce(function(parsed, property) {
        var position = positions[property];
        var value = matches[position];
        if (!value) return parsed;
        value = property === "milliseconds" ? parseMilliseconds(value) : parseInt(value, 10);
        if (!value) return parsed;
        if (isNegative && ~negatives.indexOf(property)) {
          value *= -1;
        }
        parsed[property] = value;
        return parsed;
      }, {});
    }
  }
});

// infrastructure/release-custody/node_modules/postgres-bytea/index.js
var require_postgres_bytea = __commonJS({
  "infrastructure/release-custody/node_modules/postgres-bytea/index.js"(exports, module) {
    "use strict";
    var bufferFrom = Buffer.from || Buffer;
    module.exports = function parseBytea(input) {
      if (/^\\x/.test(input)) {
        return bufferFrom(input.substr(2), "hex");
      }
      var output = "";
      var i = 0;
      while (i < input.length) {
        if (input[i] !== "\\") {
          output += input[i];
          ++i;
        } else {
          if (/[0-7]{3}/.test(input.substr(i + 1, 3))) {
            output += String.fromCharCode(parseInt(input.substr(i + 1, 3), 8));
            i += 4;
          } else {
            var backslashes = 1;
            while (i + backslashes < input.length && input[i + backslashes] === "\\") {
              backslashes++;
            }
            for (var k = 0; k < Math.floor(backslashes / 2); ++k) {
              output += "\\";
            }
            i += Math.floor(backslashes / 2) * 2;
          }
        }
      }
      return bufferFrom(output, "binary");
    };
  }
});

// infrastructure/release-custody/node_modules/pg-types/lib/textParsers.js
var require_textParsers = __commonJS({
  "infrastructure/release-custody/node_modules/pg-types/lib/textParsers.js"(exports, module) {
    var array = require_postgres_array();
    var arrayParser = require_arrayParser();
    var parseDate = require_postgres_date();
    var parseInterval = require_postgres_interval();
    var parseByteA = require_postgres_bytea();
    function allowNull(fn) {
      return function nullAllowed(value) {
        if (value === null) return value;
        return fn(value);
      };
    }
    function parseBool(value) {
      if (value === null) return value;
      return value === "TRUE" || value === "t" || value === "true" || value === "y" || value === "yes" || value === "on" || value === "1";
    }
    function parseBoolArray(value) {
      if (!value) return null;
      return array.parse(value, parseBool);
    }
    function parseBaseTenInt(string) {
      return parseInt(string, 10);
    }
    function parseIntegerArray(value) {
      if (!value) return null;
      return array.parse(value, allowNull(parseBaseTenInt));
    }
    function parseBigIntegerArray(value) {
      if (!value) return null;
      return array.parse(value, allowNull(function(entry) {
        return parseBigInteger(entry).trim();
      }));
    }
    var parsePointArray = function(value) {
      if (!value) {
        return null;
      }
      var p = arrayParser.create(value, function(entry) {
        if (entry !== null) {
          entry = parsePoint(entry);
        }
        return entry;
      });
      return p.parse();
    };
    var parseFloatArray = function(value) {
      if (!value) {
        return null;
      }
      var p = arrayParser.create(value, function(entry) {
        if (entry !== null) {
          entry = parseFloat(entry);
        }
        return entry;
      });
      return p.parse();
    };
    var parseStringArray = function(value) {
      if (!value) {
        return null;
      }
      var p = arrayParser.create(value);
      return p.parse();
    };
    var parseDateArray = function(value) {
      if (!value) {
        return null;
      }
      var p = arrayParser.create(value, function(entry) {
        if (entry !== null) {
          entry = parseDate(entry);
        }
        return entry;
      });
      return p.parse();
    };
    var parseIntervalArray = function(value) {
      if (!value) {
        return null;
      }
      var p = arrayParser.create(value, function(entry) {
        if (entry !== null) {
          entry = parseInterval(entry);
        }
        return entry;
      });
      return p.parse();
    };
    var parseByteAArray = function(value) {
      if (!value) {
        return null;
      }
      return array.parse(value, allowNull(parseByteA));
    };
    var parseInteger = function(value) {
      return parseInt(value, 10);
    };
    var parseBigInteger = function(value) {
      var valStr = String(value);
      if (/^\d+$/.test(valStr)) {
        return valStr;
      }
      return value;
    };
    var parseJsonArray = function(value) {
      if (!value) {
        return null;
      }
      return array.parse(value, allowNull(JSON.parse));
    };
    var parsePoint = function(value) {
      if (value[0] !== "(") {
        return null;
      }
      value = value.substring(1, value.length - 1).split(",");
      return {
        x: parseFloat(value[0]),
        y: parseFloat(value[1])
      };
    };
    var parseCircle = function(value) {
      if (value[0] !== "<" && value[1] !== "(") {
        return null;
      }
      var point = "(";
      var radius = "";
      var pointParsed = false;
      for (var i = 2; i < value.length - 1; i++) {
        if (!pointParsed) {
          point += value[i];
        }
        if (value[i] === ")") {
          pointParsed = true;
          continue;
        } else if (!pointParsed) {
          continue;
        }
        if (value[i] === ",") {
          continue;
        }
        radius += value[i];
      }
      var result = parsePoint(point);
      result.radius = parseFloat(radius);
      return result;
    };
    var init = function(register) {
      register(20, parseBigInteger);
      register(21, parseInteger);
      register(23, parseInteger);
      register(26, parseInteger);
      register(700, parseFloat);
      register(701, parseFloat);
      register(16, parseBool);
      register(1082, parseDate);
      register(1114, parseDate);
      register(1184, parseDate);
      register(600, parsePoint);
      register(651, parseStringArray);
      register(718, parseCircle);
      register(1e3, parseBoolArray);
      register(1001, parseByteAArray);
      register(1005, parseIntegerArray);
      register(1007, parseIntegerArray);
      register(1028, parseIntegerArray);
      register(1016, parseBigIntegerArray);
      register(1017, parsePointArray);
      register(1021, parseFloatArray);
      register(1022, parseFloatArray);
      register(1231, parseFloatArray);
      register(1014, parseStringArray);
      register(1015, parseStringArray);
      register(1008, parseStringArray);
      register(1009, parseStringArray);
      register(1040, parseStringArray);
      register(1041, parseStringArray);
      register(1115, parseDateArray);
      register(1182, parseDateArray);
      register(1185, parseDateArray);
      register(1186, parseInterval);
      register(1187, parseIntervalArray);
      register(17, parseByteA);
      register(114, JSON.parse.bind(JSON));
      register(3802, JSON.parse.bind(JSON));
      register(199, parseJsonArray);
      register(3807, parseJsonArray);
      register(3907, parseStringArray);
      register(2951, parseStringArray);
      register(791, parseStringArray);
      register(1183, parseStringArray);
      register(1270, parseStringArray);
    };
    module.exports = {
      init
    };
  }
});

// infrastructure/release-custody/node_modules/pg-int8/index.js
var require_pg_int8 = __commonJS({
  "infrastructure/release-custody/node_modules/pg-int8/index.js"(exports, module) {
    "use strict";
    var BASE = 1e6;
    function readInt8(buffer) {
      var high = buffer.readInt32BE(0);
      var low = buffer.readUInt32BE(4);
      var sign = "";
      if (high < 0) {
        high = ~high + (low === 0);
        low = ~low + 1 >>> 0;
        sign = "-";
      }
      var result = "";
      var carry;
      var t;
      var digits;
      var pad;
      var l;
      var i;
      {
        carry = high % BASE;
        high = high / BASE >>> 0;
        t = 4294967296 * carry + low;
        low = t / BASE >>> 0;
        digits = "" + (t - BASE * low);
        if (low === 0 && high === 0) {
          return sign + digits + result;
        }
        pad = "";
        l = 6 - digits.length;
        for (i = 0; i < l; i++) {
          pad += "0";
        }
        result = pad + digits + result;
      }
      {
        carry = high % BASE;
        high = high / BASE >>> 0;
        t = 4294967296 * carry + low;
        low = t / BASE >>> 0;
        digits = "" + (t - BASE * low);
        if (low === 0 && high === 0) {
          return sign + digits + result;
        }
        pad = "";
        l = 6 - digits.length;
        for (i = 0; i < l; i++) {
          pad += "0";
        }
        result = pad + digits + result;
      }
      {
        carry = high % BASE;
        high = high / BASE >>> 0;
        t = 4294967296 * carry + low;
        low = t / BASE >>> 0;
        digits = "" + (t - BASE * low);
        if (low === 0 && high === 0) {
          return sign + digits + result;
        }
        pad = "";
        l = 6 - digits.length;
        for (i = 0; i < l; i++) {
          pad += "0";
        }
        result = pad + digits + result;
      }
      {
        carry = high % BASE;
        t = 4294967296 * carry + low;
        digits = "" + t % BASE;
        return sign + digits + result;
      }
    }
    module.exports = readInt8;
  }
});

// infrastructure/release-custody/node_modules/pg-types/lib/binaryParsers.js
var require_binaryParsers = __commonJS({
  "infrastructure/release-custody/node_modules/pg-types/lib/binaryParsers.js"(exports, module) {
    var parseInt64 = require_pg_int8();
    var parseBits = function(data, bits, offset, invert, callback) {
      offset = offset || 0;
      invert = invert || false;
      callback = callback || function(lastValue, newValue, bits2) {
        return lastValue * Math.pow(2, bits2) + newValue;
      };
      var offsetBytes = offset >> 3;
      var inv = function(value) {
        if (invert) {
          return ~value & 255;
        }
        return value;
      };
      var mask = 255;
      var firstBits = 8 - offset % 8;
      if (bits < firstBits) {
        mask = 255 << 8 - bits & 255;
        firstBits = bits;
      }
      if (offset) {
        mask = mask >> offset % 8;
      }
      var result = 0;
      if (offset % 8 + bits >= 8) {
        result = callback(0, inv(data[offsetBytes]) & mask, firstBits);
      }
      var bytes = bits + offset >> 3;
      for (var i = offsetBytes + 1; i < bytes; i++) {
        result = callback(result, inv(data[i]), 8);
      }
      var lastBits = (bits + offset) % 8;
      if (lastBits > 0) {
        result = callback(result, inv(data[bytes]) >> 8 - lastBits, lastBits);
      }
      return result;
    };
    var parseFloatFromBits = function(data, precisionBits, exponentBits) {
      var bias = Math.pow(2, exponentBits - 1) - 1;
      var sign = parseBits(data, 1);
      var exponent = parseBits(data, exponentBits, 1);
      if (exponent === 0) {
        return 0;
      }
      var precisionBitsCounter = 1;
      var parsePrecisionBits = function(lastValue, newValue, bits) {
        if (lastValue === 0) {
          lastValue = 1;
        }
        for (var i = 1; i <= bits; i++) {
          precisionBitsCounter /= 2;
          if ((newValue & 1 << bits - i) > 0) {
            lastValue += precisionBitsCounter;
          }
        }
        return lastValue;
      };
      var mantissa = parseBits(data, precisionBits, exponentBits + 1, false, parsePrecisionBits);
      if (exponent == Math.pow(2, exponentBits + 1) - 1) {
        if (mantissa === 0) {
          return sign === 0 ? Infinity : -Infinity;
        }
        return NaN;
      }
      return (sign === 0 ? 1 : -1) * Math.pow(2, exponent - bias) * mantissa;
    };
    var parseInt16 = function(value) {
      if (parseBits(value, 1) == 1) {
        return -1 * (parseBits(value, 15, 1, true) + 1);
      }
      return parseBits(value, 15, 1);
    };
    var parseInt32 = function(value) {
      if (parseBits(value, 1) == 1) {
        return -1 * (parseBits(value, 31, 1, true) + 1);
      }
      return parseBits(value, 31, 1);
    };
    var parseFloat32 = function(value) {
      return parseFloatFromBits(value, 23, 8);
    };
    var parseFloat64 = function(value) {
      return parseFloatFromBits(value, 52, 11);
    };
    var parseNumeric = function(value) {
      var sign = parseBits(value, 16, 32);
      if (sign == 49152) {
        return NaN;
      }
      var weight = Math.pow(1e4, parseBits(value, 16, 16));
      var result = 0;
      var digits = [];
      var ndigits = parseBits(value, 16);
      for (var i = 0; i < ndigits; i++) {
        result += parseBits(value, 16, 64 + 16 * i) * weight;
        weight /= 1e4;
      }
      var scale = Math.pow(10, parseBits(value, 16, 48));
      return (sign === 0 ? 1 : -1) * Math.round(result * scale) / scale;
    };
    var parseDate = function(isUTC, value) {
      var sign = parseBits(value, 1);
      var rawValue = parseBits(value, 63, 1);
      var result = new Date((sign === 0 ? 1 : -1) * rawValue / 1e3 + 9466848e5);
      if (!isUTC) {
        result.setTime(result.getTime() + result.getTimezoneOffset() * 6e4);
      }
      result.usec = rawValue % 1e3;
      result.getMicroSeconds = function() {
        return this.usec;
      };
      result.setMicroSeconds = function(value2) {
        this.usec = value2;
      };
      result.getUTCMicroSeconds = function() {
        return this.usec;
      };
      return result;
    };
    var parseArray = function(value) {
      var dim = parseBits(value, 32);
      var flags = parseBits(value, 32, 32);
      var elementType = parseBits(value, 32, 64);
      var offset = 96;
      var dims = [];
      for (var i = 0; i < dim; i++) {
        dims[i] = parseBits(value, 32, offset);
        offset += 32;
        offset += 32;
      }
      var parseElement = function(elementType2) {
        var length = parseBits(value, 32, offset);
        offset += 32;
        if (length == 4294967295) {
          return null;
        }
        var result;
        if (elementType2 == 23 || elementType2 == 20) {
          result = parseBits(value, length * 8, offset);
          offset += length * 8;
          return result;
        } else if (elementType2 == 25) {
          result = value.toString(this.encoding, offset >> 3, (offset += length << 3) >> 3);
          return result;
        } else {
          console.log("ERROR: ElementType not implemented: " + elementType2);
        }
      };
      var parse = function(dimension, elementType2) {
        var array = [];
        var i2;
        if (dimension.length > 1) {
          var count = dimension.shift();
          for (i2 = 0; i2 < count; i2++) {
            array[i2] = parse(dimension, elementType2);
          }
          dimension.unshift(count);
        } else {
          for (i2 = 0; i2 < dimension[0]; i2++) {
            array[i2] = parseElement(elementType2);
          }
        }
        return array;
      };
      return parse(dims, elementType);
    };
    var parseText = function(value) {
      return value.toString("utf8");
    };
    var parseBool = function(value) {
      if (value === null) return null;
      return parseBits(value, 8) > 0;
    };
    var init = function(register) {
      register(20, parseInt64);
      register(21, parseInt16);
      register(23, parseInt32);
      register(26, parseInt32);
      register(1700, parseNumeric);
      register(700, parseFloat32);
      register(701, parseFloat64);
      register(16, parseBool);
      register(1114, parseDate.bind(null, false));
      register(1184, parseDate.bind(null, true));
      register(1e3, parseArray);
      register(1007, parseArray);
      register(1016, parseArray);
      register(1008, parseArray);
      register(1009, parseArray);
      register(25, parseText);
    };
    module.exports = {
      init
    };
  }
});

// infrastructure/release-custody/node_modules/pg-types/lib/builtins.js
var require_builtins = __commonJS({
  "infrastructure/release-custody/node_modules/pg-types/lib/builtins.js"(exports, module) {
    module.exports = {
      BOOL: 16,
      BYTEA: 17,
      CHAR: 18,
      INT8: 20,
      INT2: 21,
      INT4: 23,
      REGPROC: 24,
      TEXT: 25,
      OID: 26,
      TID: 27,
      XID: 28,
      CID: 29,
      JSON: 114,
      XML: 142,
      PG_NODE_TREE: 194,
      SMGR: 210,
      PATH: 602,
      POLYGON: 604,
      CIDR: 650,
      FLOAT4: 700,
      FLOAT8: 701,
      ABSTIME: 702,
      RELTIME: 703,
      TINTERVAL: 704,
      CIRCLE: 718,
      MACADDR8: 774,
      MONEY: 790,
      MACADDR: 829,
      INET: 869,
      ACLITEM: 1033,
      BPCHAR: 1042,
      VARCHAR: 1043,
      DATE: 1082,
      TIME: 1083,
      TIMESTAMP: 1114,
      TIMESTAMPTZ: 1184,
      INTERVAL: 1186,
      TIMETZ: 1266,
      BIT: 1560,
      VARBIT: 1562,
      NUMERIC: 1700,
      REFCURSOR: 1790,
      REGPROCEDURE: 2202,
      REGOPER: 2203,
      REGOPERATOR: 2204,
      REGCLASS: 2205,
      REGTYPE: 2206,
      UUID: 2950,
      TXID_SNAPSHOT: 2970,
      PG_LSN: 3220,
      PG_NDISTINCT: 3361,
      PG_DEPENDENCIES: 3402,
      TSVECTOR: 3614,
      TSQUERY: 3615,
      GTSVECTOR: 3642,
      REGCONFIG: 3734,
      REGDICTIONARY: 3769,
      JSONB: 3802,
      REGNAMESPACE: 4089,
      REGROLE: 4096
    };
  }
});

// infrastructure/release-custody/node_modules/pg-types/index.js
var require_pg_types = __commonJS({
  "infrastructure/release-custody/node_modules/pg-types/index.js"(exports) {
    var textParsers = require_textParsers();
    var binaryParsers = require_binaryParsers();
    var arrayParser = require_arrayParser();
    var builtinTypes = require_builtins();
    exports.getTypeParser = getTypeParser;
    exports.setTypeParser = setTypeParser;
    exports.arrayParser = arrayParser;
    exports.builtins = builtinTypes;
    var typeParsers = {
      text: {},
      binary: {}
    };
    function noParse(val) {
      return String(val);
    }
    function getTypeParser(oid3, format) {
      format = format || "text";
      if (!typeParsers[format]) {
        return noParse;
      }
      return typeParsers[format][oid3] || noParse;
    }
    function setTypeParser(oid3, format, parseFn) {
      if (typeof format == "function") {
        parseFn = format;
        format = "text";
      }
      typeParsers[format][oid3] = parseFn;
    }
    textParsers.init(function(oid3, converter) {
      typeParsers.text[oid3] = converter;
    });
    binaryParsers.init(function(oid3, converter) {
      typeParsers.binary[oid3] = converter;
    });
  }
});

// infrastructure/release-custody/node_modules/pg/lib/defaults.js
var require_defaults = __commonJS({
  "infrastructure/release-custody/node_modules/pg/lib/defaults.js"(exports, module) {
    "use strict";
    var user;
    try {
      user = process.platform === "win32" ? process.env.USERNAME : process.env.USER;
    } catch {
    }
    module.exports = {
      // database host. defaults to localhost
      host: "localhost",
      // database user's name
      user,
      // name of database to connect
      database: void 0,
      // database user's password
      password: null,
      // a Postgres connection string to be used instead of setting individual connection items
      // NOTE:  Setting this value will cause it to override any other value (such as database or user) defined
      // in the defaults object.
      connectionString: void 0,
      // database port
      port: 5432,
      // number of rows to return at a time from a prepared statement's
      // portal. 0 will return all rows at once
      rows: 0,
      // binary result mode
      binary: false,
      // Connection pool options - see https://github.com/brianc/node-pg-pool
      // number of connections to use in connection pool
      // 0 will disable connection pooling
      max: 10,
      // max milliseconds a client can go unused before it is removed
      // from the pool and destroyed
      idleTimeoutMillis: 3e4,
      client_encoding: "",
      ssl: false,
      // SSL negotiation style: 'postgres' (traditional SSLRequest) or 'direct'
      sslnegotiation: void 0,
      application_name: void 0,
      fallback_application_name: void 0,
      options: void 0,
      parseInputDatesAsUTC: false,
      // max milliseconds any query using this connection will execute for before timing out in error.
      // false=unlimited
      statement_timeout: false,
      // Abort any statement that waits longer than the specified duration in milliseconds while attempting to acquire a lock.
      // false=unlimited
      lock_timeout: false,
      // Terminate any session with an open transaction that has been idle for longer than the specified duration in milliseconds
      // false=unlimited
      idle_in_transaction_session_timeout: false,
      // max milliseconds to wait for query to complete (client side)
      query_timeout: false,
      connect_timeout: 0,
      keepalives: 1,
      keepalives_idle: 0
    };
    var pgTypes = require_pg_types();
    var parseBigInteger = pgTypes.getTypeParser(20, "text");
    var parseBigIntegerArray = pgTypes.getTypeParser(1016, "text");
    module.exports.__defineSetter__("parseInt8", function(val) {
      pgTypes.setTypeParser(20, "text", val ? pgTypes.getTypeParser(23, "text") : parseBigInteger);
      pgTypes.setTypeParser(1016, "text", val ? pgTypes.getTypeParser(1007, "text") : parseBigIntegerArray);
    });
  }
});

// infrastructure/release-custody/node_modules/pg/lib/utils.js
var require_utils = __commonJS({
  "infrastructure/release-custody/node_modules/pg/lib/utils.js"(exports, module) {
    "use strict";
    var defaults2 = require_defaults();
    var { isDate } = __require("util/types");
    function escapeElement(elementRepresentation) {
      const escaped = elementRepresentation.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      return '"' + escaped + '"';
    }
    function arrayString(val) {
      let result = "{";
      for (let i = 0; i < val.length; i++) {
        if (i > 0) {
          result += ",";
        }
        let item = val[i];
        if (item == null) {
          result += "NULL";
        } else if (Array.isArray(item)) {
          result += arrayString(item);
        } else if (ArrayBuffer.isView(item)) {
          if (!(item instanceof Buffer)) {
            item = Buffer.from(item.buffer, item.byteOffset, item.byteLength);
          }
          result += "\\\\x" + item.toString("hex");
        } else {
          result += escapeElement(prepareValue(item));
        }
      }
      result += "}";
      return result;
    }
    var prepareValue = function(val, seen) {
      if (val == null) {
        return null;
      }
      if (typeof val === "object") {
        if (val instanceof Buffer) {
          return val;
        }
        if (ArrayBuffer.isView(val)) {
          return Buffer.from(val.buffer, val.byteOffset, val.byteLength);
        }
        if (isDate(val)) {
          if (defaults2.parseInputDatesAsUTC) {
            return dateToStringUTC(val);
          } else {
            return dateToString(val);
          }
        }
        if (Array.isArray(val)) {
          return arrayString(val);
        }
        return prepareObject(val, seen);
      }
      return val.toString();
    };
    function prepareObject(val, seen) {
      if (val && typeof val.toPostgres === "function") {
        seen = seen || [];
        if (seen.indexOf(val) !== -1) {
          throw new Error('circular reference detected while preparing "' + val + '" for query');
        }
        seen.push(val);
        return prepareValue(val.toPostgres(prepareValue), seen);
      }
      return JSON.stringify(val);
    }
    function dateToString(date) {
      let offset = -date.getTimezoneOffset();
      let year = date.getFullYear();
      const isBCYear = year < 1;
      if (isBCYear) year = Math.abs(year) + 1;
      let ret = String(year).padStart(4, "0") + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0") + "T" + String(date.getHours()).padStart(2, "0") + ":" + String(date.getMinutes()).padStart(2, "0") + ":" + String(date.getSeconds()).padStart(2, "0") + "." + String(date.getMilliseconds()).padStart(3, "0");
      if (offset < 0) {
        ret += "-";
        offset *= -1;
      } else {
        ret += "+";
      }
      ret += String(Math.floor(offset / 60)).padStart(2, "0") + ":" + String(offset % 60).padStart(2, "0");
      if (isBCYear) ret += " BC";
      return ret;
    }
    function dateToStringUTC(date) {
      let year = date.getUTCFullYear();
      const isBCYear = year < 1;
      if (isBCYear) year = Math.abs(year) + 1;
      let ret = String(year).padStart(4, "0") + "-" + String(date.getUTCMonth() + 1).padStart(2, "0") + "-" + String(date.getUTCDate()).padStart(2, "0") + "T" + String(date.getUTCHours()).padStart(2, "0") + ":" + String(date.getUTCMinutes()).padStart(2, "0") + ":" + String(date.getUTCSeconds()).padStart(2, "0") + "." + String(date.getUTCMilliseconds()).padStart(3, "0");
      ret += "+00:00";
      if (isBCYear) ret += " BC";
      return ret;
    }
    function normalizeQueryConfig(config, values, callback) {
      config = typeof config === "string" ? { text: config } : config;
      if (values) {
        if (typeof values === "function") {
          config.callback = values;
        } else {
          config.values = values;
        }
      }
      if (callback) {
        config.callback = callback;
      }
      return config;
    }
    var escapeIdentifier2 = function(str) {
      return '"' + str.replace(/"/g, '""') + '"';
    };
    var escapeLiteral2 = function(str) {
      let hasBackslash = false;
      let escaped = "'";
      if (str == null) {
        return "''";
      }
      if (typeof str !== "string") {
        return "''";
      }
      for (let i = 0; i < str.length; i++) {
        const c = str[i];
        if (c === "'") {
          escaped += c + c;
        } else if (c === "\\") {
          escaped += c + c;
          hasBackslash = true;
        } else {
          escaped += c;
        }
      }
      escaped += "'";
      if (hasBackslash === true) {
        escaped = " E" + escaped;
      }
      return escaped;
    };
    module.exports = {
      prepareValue: function prepareValueWrapper(value) {
        return prepareValue(value);
      },
      normalizeQueryConfig,
      escapeIdentifier: escapeIdentifier2,
      escapeLiteral: escapeLiteral2
    };
  }
});

// infrastructure/release-custody/node_modules/pg/lib/crypto/utils.js
var require_utils2 = __commonJS({
  "infrastructure/release-custody/node_modules/pg/lib/crypto/utils.js"(exports, module) {
    var nodeCrypto = __require("crypto");
    module.exports = {
      postgresMd5PasswordHash,
      randomBytes,
      deriveKey,
      sha256: sha2562,
      hashByName,
      hmacSha256,
      md5
    };
    var webCrypto = nodeCrypto.webcrypto || globalThis.crypto;
    var subtleCrypto = webCrypto.subtle;
    var textEncoder = new TextEncoder();
    function randomBytes(length) {
      return webCrypto.getRandomValues(Buffer.alloc(length));
    }
    async function md5(string) {
      try {
        return nodeCrypto.createHash("md5").update(string, "utf-8").digest("hex");
      } catch (e) {
        const data = typeof string === "string" ? textEncoder.encode(string) : string;
        const hash2 = await subtleCrypto.digest("MD5", data);
        return Array.from(new Uint8Array(hash2)).map((b) => b.toString(16).padStart(2, "0")).join("");
      }
    }
    async function postgresMd5PasswordHash(user, password, salt) {
      const inner = await md5(password + user);
      const outer = await md5(Buffer.concat([Buffer.from(inner), salt]));
      return "md5" + outer;
    }
    async function sha2562(text) {
      return await subtleCrypto.digest("SHA-256", text);
    }
    async function hashByName(hashName, text) {
      return await subtleCrypto.digest(hashName, text);
    }
    async function hmacSha256(keyBuffer, msg) {
      const key = await subtleCrypto.importKey("raw", keyBuffer, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
      return await subtleCrypto.sign("HMAC", key, textEncoder.encode(msg));
    }
    async function deriveKey(password, salt, iterations) {
      const key = await subtleCrypto.importKey("raw", textEncoder.encode(password), "PBKDF2", false, ["deriveBits"]);
      const params = { name: "PBKDF2", hash: "SHA-256", salt, iterations };
      return await subtleCrypto.deriveBits(params, key, 32 * 8, ["deriveBits"]);
    }
  }
});

// infrastructure/release-custody/node_modules/pg/lib/crypto/cert-signatures.js
var require_cert_signatures = __commonJS({
  "infrastructure/release-custody/node_modules/pg/lib/crypto/cert-signatures.js"(exports, module) {
    function x509Error(msg, cert) {
      return new Error("SASL channel binding: " + msg + " when parsing public certificate " + cert.toString("base64"));
    }
    function readASN1Length(data, index) {
      let length = data[index++];
      if (length < 128) return { length, index };
      const lengthBytes = length & 127;
      if (lengthBytes > 4) throw x509Error("bad length", data);
      length = 0;
      for (let i = 0; i < lengthBytes; i++) {
        length = length << 8 | data[index++];
      }
      return { length, index };
    }
    function readASN1OID(data, index) {
      if (data[index++] !== 6) throw x509Error("non-OID data", data);
      const { length: OIDLength, index: indexAfterOIDLength } = readASN1Length(data, index);
      index = indexAfterOIDLength;
      const lastIndex = index + OIDLength;
      const byte1 = data[index++];
      let oid3 = (byte1 / 40 >> 0) + "." + byte1 % 40;
      while (index < lastIndex) {
        let value = 0;
        while (index < lastIndex) {
          const nextByte = data[index++];
          value = value << 7 | nextByte & 127;
          if (nextByte < 128) break;
        }
        oid3 += "." + value;
      }
      return { oid: oid3, index };
    }
    function expectASN1Seq(data, index) {
      if (data[index++] !== 48) throw x509Error("non-sequence data", data);
      return readASN1Length(data, index);
    }
    function signatureAlgorithmHashFromCertificate(data, index) {
      if (index === void 0) index = 0;
      index = expectASN1Seq(data, index).index;
      const { length: certInfoLength, index: indexAfterCertInfoLength } = expectASN1Seq(data, index);
      index = indexAfterCertInfoLength + certInfoLength;
      index = expectASN1Seq(data, index).index;
      const { oid: oid3, index: indexAfterOID } = readASN1OID(data, index);
      switch (oid3) {
        // RSA
        case "1.2.840.113549.1.1.4":
          return "MD5";
        case "1.2.840.113549.1.1.5":
          return "SHA-1";
        case "1.2.840.113549.1.1.11":
          return "SHA-256";
        case "1.2.840.113549.1.1.12":
          return "SHA-384";
        case "1.2.840.113549.1.1.13":
          return "SHA-512";
        case "1.2.840.113549.1.1.14":
          return "SHA-224";
        case "1.2.840.113549.1.1.15":
          return "SHA512-224";
        case "1.2.840.113549.1.1.16":
          return "SHA512-256";
        // ECDSA
        case "1.2.840.10045.4.1":
          return "SHA-1";
        case "1.2.840.10045.4.3.1":
          return "SHA-224";
        case "1.2.840.10045.4.3.2":
          return "SHA-256";
        case "1.2.840.10045.4.3.3":
          return "SHA-384";
        case "1.2.840.10045.4.3.4":
          return "SHA-512";
        // RSASSA-PSS: hash is indicated separately
        case "1.2.840.113549.1.1.10": {
          index = indexAfterOID;
          index = expectASN1Seq(data, index).index;
          if (data[index++] !== 160) throw x509Error("non-tag data", data);
          index = readASN1Length(data, index).index;
          index = expectASN1Seq(data, index).index;
          const { oid: hashOID } = readASN1OID(data, index);
          switch (hashOID) {
            // standalone hash OIDs
            case "1.2.840.113549.2.5":
              return "MD5";
            case "1.3.14.3.2.26":
              return "SHA-1";
            case "2.16.840.1.101.3.4.2.1":
              return "SHA-256";
            case "2.16.840.1.101.3.4.2.2":
              return "SHA-384";
            case "2.16.840.1.101.3.4.2.3":
              return "SHA-512";
          }
          throw x509Error("unknown hash OID " + hashOID, data);
        }
        // Ed25519 -- see https: return//github.com/openssl/openssl/issues/15477
        case "1.3.101.110":
        case "1.3.101.112":
          return "SHA-512";
        // Ed448 -- still not in pg 17.2 (if supported, digest would be SHAKE256 x 64 bytes)
        case "1.3.101.111":
        case "1.3.101.113":
          throw x509Error("Ed448 certificate channel binding is not currently supported by Postgres");
      }
      throw x509Error("unknown OID " + oid3, data);
    }
    module.exports = { signatureAlgorithmHashFromCertificate };
  }
});

// infrastructure/release-custody/node_modules/pg/lib/crypto/sasl.js
var require_sasl = __commonJS({
  "infrastructure/release-custody/node_modules/pg/lib/crypto/sasl.js"(exports, module) {
    "use strict";
    var crypto = require_utils2();
    var { signatureAlgorithmHashFromCertificate } = require_cert_signatures();
    function saslprep(password) {
      const nonAsciiSpace = /[\u00A0\u1680\u2000-\u200B\u202F\u205F\u3000]/g;
      const mappedToNothing = /[\u00AD\u034F\u1806\u180B\u180C\u180D\u200C\u200D\u2060\uFE00-\uFE0F\uFEFF]/g;
      return password.replace(nonAsciiSpace, " ").replace(mappedToNothing, "").normalize("NFKC");
    }
    var DEFAULT_MAX_SCRAM_ITERATIONS = 1e5;
    function startSession(mechanisms, stream, scramMaxIterations = DEFAULT_MAX_SCRAM_ITERATIONS) {
      const candidates = ["SCRAM-SHA-256"];
      if (stream) candidates.unshift("SCRAM-SHA-256-PLUS");
      const mechanism = candidates.find((candidate) => mechanisms.includes(candidate));
      if (!mechanism) {
        throw new Error("SASL: Only mechanism(s) " + candidates.join(" and ") + " are supported");
      }
      if (mechanism === "SCRAM-SHA-256-PLUS" && typeof stream.getPeerCertificate !== "function") {
        throw new Error("SASL: Mechanism SCRAM-SHA-256-PLUS requires a certificate");
      }
      const clientNonce = crypto.randomBytes(18).toString("base64");
      const gs2Header = mechanism === "SCRAM-SHA-256-PLUS" ? "p=tls-server-end-point" : stream ? "y" : "n";
      return {
        mechanism,
        clientNonce,
        response: gs2Header + ",,n=*,r=" + clientNonce,
        message: "SASLInitialResponse",
        scramMaxIterations
      };
    }
    async function continueSession(session, password, serverData, stream) {
      if (session.message !== "SASLInitialResponse") {
        throw new Error("SASL: Last message was not SASLInitialResponse");
      }
      if (typeof password !== "string") {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string");
      }
      if (password === "") {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a non-empty string");
      }
      if (typeof serverData !== "string") {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: serverData must be a string");
      }
      const sv = parseServerFirstMessage(serverData);
      if (!sv.nonce.startsWith(session.clientNonce)) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: server nonce does not start with client nonce");
      } else if (sv.nonce.length === session.clientNonce.length) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: server nonce is too short");
      }
      const scramMaxIterations = typeof session.scramMaxIterations === "number" ? session.scramMaxIterations : DEFAULT_MAX_SCRAM_ITERATIONS;
      if (scramMaxIterations !== 0 && sv.iteration > scramMaxIterations) {
        throw new Error(
          "SASL: SCRAM-SERVER-FIRST-MESSAGE: iteration count " + sv.iteration + " exceeds scramMaxIterations of " + scramMaxIterations
        );
      }
      const clientFirstMessageBare = "n=*,r=" + session.clientNonce;
      const serverFirstMessage = "r=" + sv.nonce + ",s=" + sv.salt + ",i=" + sv.iteration;
      let channelBinding = stream ? "eSws" : "biws";
      if (session.mechanism === "SCRAM-SHA-256-PLUS") {
        const peerCert = stream.getPeerCertificate().raw;
        let hashName = signatureAlgorithmHashFromCertificate(peerCert);
        if (hashName === "MD5" || hashName === "SHA-1") hashName = "SHA-256";
        const certHash = await crypto.hashByName(hashName, peerCert);
        const bindingData = Buffer.concat([Buffer.from("p=tls-server-end-point,,"), Buffer.from(certHash)]);
        channelBinding = bindingData.toString("base64");
      }
      const clientFinalMessageWithoutProof = "c=" + channelBinding + ",r=" + sv.nonce;
      const authMessage = clientFirstMessageBare + "," + serverFirstMessage + "," + clientFinalMessageWithoutProof;
      const saltBytes = Buffer.from(sv.salt, "base64");
      const saltedPassword = await crypto.deriveKey(saslprep(password), saltBytes, sv.iteration);
      const clientKey = await crypto.hmacSha256(saltedPassword, "Client Key");
      const storedKey = await crypto.sha256(clientKey);
      const clientSignature = await crypto.hmacSha256(storedKey, authMessage);
      const clientProof = xorBuffers(Buffer.from(clientKey), Buffer.from(clientSignature)).toString("base64");
      const serverKey = await crypto.hmacSha256(saltedPassword, "Server Key");
      const serverSignatureBytes = await crypto.hmacSha256(serverKey, authMessage);
      session.message = "SASLResponse";
      session.serverSignature = Buffer.from(serverSignatureBytes).toString("base64");
      session.response = clientFinalMessageWithoutProof + ",p=" + clientProof;
    }
    function finalizeSession(session, serverData) {
      if (session.message !== "SASLResponse") {
        throw new Error("SASL: Last message was not SASLResponse");
      }
      if (typeof serverData !== "string") {
        throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: serverData must be a string");
      }
      const { serverSignature } = parseServerFinalMessage(serverData);
      if (serverSignature !== session.serverSignature) {
        throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: server signature does not match");
      }
    }
    function isPrintableChars(text) {
      if (typeof text !== "string") {
        throw new TypeError("SASL: text must be a string");
      }
      return text.split("").map((_, i) => text.charCodeAt(i)).every((c) => c >= 33 && c <= 43 || c >= 45 && c <= 126);
    }
    function isBase64(text) {
      return /^(?:[a-zA-Z0-9+/]{4})*(?:[a-zA-Z0-9+/]{2}==|[a-zA-Z0-9+/]{3}=)?$/.test(text);
    }
    function parseAttributePairs(text) {
      if (typeof text !== "string") {
        throw new TypeError("SASL: attribute pairs text must be a string");
      }
      return new Map(
        text.split(",").map((attrValue) => {
          if (!/^.=/.test(attrValue)) {
            throw new Error("SASL: Invalid attribute pair entry");
          }
          const name = attrValue[0];
          const value = attrValue.substring(2);
          return [name, value];
        })
      );
    }
    function parseServerFirstMessage(data) {
      const attrPairs = parseAttributePairs(data);
      const nonce = attrPairs.get("r");
      if (!nonce) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: nonce missing");
      } else if (!isPrintableChars(nonce)) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: nonce must only contain printable characters");
      }
      const salt = attrPairs.get("s");
      if (!salt) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: salt missing");
      } else if (!isBase64(salt)) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: salt must be base64");
      }
      const iterationText = attrPairs.get("i");
      if (!iterationText) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: iteration missing");
      } else if (!/^[1-9][0-9]*$/.test(iterationText)) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: invalid iteration count");
      }
      const iteration = parseInt(iterationText, 10);
      return {
        nonce,
        salt,
        iteration
      };
    }
    function parseServerFinalMessage(serverData) {
      const attrPairs = parseAttributePairs(serverData);
      const error = attrPairs.get("e");
      const serverSignature = attrPairs.get("v");
      if (error) {
        throw new Error(`SASL: SCRAM-SERVER-FINAL-MESSAGE: server returned error: "${error}"`);
      }
      if (!serverSignature) {
        throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: server signature is missing");
      } else if (!isBase64(serverSignature)) {
        throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: server signature must be base64");
      }
      return {
        serverSignature
      };
    }
    function xorBuffers(a, b) {
      if (!Buffer.isBuffer(a)) {
        throw new TypeError("first argument must be a Buffer");
      }
      if (!Buffer.isBuffer(b)) {
        throw new TypeError("second argument must be a Buffer");
      }
      if (a.length !== b.length) {
        throw new Error("Buffer lengths must match");
      }
      if (a.length === 0) {
        throw new Error("Buffers cannot be empty");
      }
      return Buffer.from(a.map((_, i) => a[i] ^ b[i]));
    }
    module.exports = {
      startSession,
      continueSession,
      finalizeSession,
      DEFAULT_MAX_SCRAM_ITERATIONS
    };
  }
});

// infrastructure/release-custody/node_modules/pg/lib/type-overrides.js
var require_type_overrides = __commonJS({
  "infrastructure/release-custody/node_modules/pg/lib/type-overrides.js"(exports, module) {
    "use strict";
    var types2 = require_pg_types();
    function TypeOverrides2(userTypes) {
      this._types = userTypes || types2;
      this.text = {};
      this.binary = {};
    }
    TypeOverrides2.prototype.getOverrides = function(format) {
      switch (format) {
        case "text":
          return this.text;
        case "binary":
          return this.binary;
        default:
          return {};
      }
    };
    TypeOverrides2.prototype.setTypeParser = function(oid3, format, parseFn) {
      if (typeof format === "function") {
        parseFn = format;
        format = "text";
      }
      this.getOverrides(format)[oid3] = parseFn;
    };
    TypeOverrides2.prototype.getTypeParser = function(oid3, format) {
      format = format || "text";
      return this.getOverrides(format)[oid3] || this._types.getTypeParser(oid3, format);
    };
    module.exports = TypeOverrides2;
  }
});

// infrastructure/release-custody/node_modules/pg-connection-string/index.js
var require_pg_connection_string = __commonJS({
  "infrastructure/release-custody/node_modules/pg-connection-string/index.js"(exports, module) {
    "use strict";
    function parse(str, options = {}) {
      if (str.charAt(0) === "/") {
        const config2 = str.split(" ");
        return { host: config2[0], database: config2[1] };
      }
      const config = /* @__PURE__ */ Object.create(null);
      let result;
      let dummyHost = false;
      if (/ |%[^a-f0-9]|%[a-f0-9][^a-f0-9]/i.test(str)) {
        str = encodeURI(str).replace(/%25(\d\d)/g, "%$1");
      }
      try {
        try {
          result = new URL(str, "postgres://base");
        } catch (e) {
          result = new URL(str.replace("@/", "@___DUMMY___/"), "postgres://base");
          dummyHost = true;
        }
      } catch (err) {
        err.input && (err.input = "*****REDACTED*****");
        throw err;
      }
      for (const entry of result.searchParams.entries()) {
        config[entry[0]] = entry[1];
      }
      config.user = config.user || decodeURIComponent(result.username);
      config.password = config.password || decodeURIComponent(result.password);
      if (result.protocol == "socket:") {
        config.host = decodeURI(result.pathname);
        config.database = result.searchParams.get("db");
        config.client_encoding = result.searchParams.get("encoding");
        return config;
      }
      const hostname = dummyHost ? "" : result.hostname;
      if (!config.host) {
        config.host = decodeURIComponent(hostname);
      } else if (hostname && /^%2f/i.test(hostname)) {
        result.pathname = hostname + result.pathname;
      }
      if (!config.port) {
        config.port = result.port;
      }
      const pathname = result.pathname.slice(1) || null;
      config.database = pathname ? decodeURI(pathname) : null;
      if (config.ssl === "true" || config.ssl === "1") {
        config.ssl = true;
      }
      if (config.ssl === "0") {
        config.ssl = false;
      }
      if (config.sslcert || config.sslkey || config.sslrootcert || config.sslmode) {
        config.ssl = {};
      }
      if (config.sslnegotiation === "direct" && config.ssl === void 0) {
        config.ssl = true;
      }
      const fs = config.sslcert || config.sslkey || config.sslrootcert ? __require("fs") : null;
      if (config.sslcert) {
        config.ssl.cert = fs.readFileSync(config.sslcert).toString();
      }
      if (config.sslkey) {
        config.ssl.key = fs.readFileSync(config.sslkey).toString();
      }
      if (config.sslrootcert) {
        config.ssl.ca = fs.readFileSync(config.sslrootcert).toString();
      }
      if (options.useLibpqCompat && config.uselibpqcompat) {
        throw new Error("Both useLibpqCompat and uselibpqcompat are set. Please use only one of them.");
      }
      if (config.uselibpqcompat === "true" || options.useLibpqCompat) {
        switch (config.sslmode) {
          case "disable": {
            config.ssl = false;
            break;
          }
          case "prefer": {
            config.ssl.rejectUnauthorized = false;
            break;
          }
          case "require": {
            if (config.sslrootcert) {
              config.ssl.checkServerIdentity = function() {
              };
            } else {
              config.ssl.rejectUnauthorized = false;
            }
            break;
          }
          case "verify-ca": {
            if (!config.ssl.ca) {
              throw new Error(
                "SECURITY WARNING: Using sslmode=verify-ca requires specifying a CA with sslrootcert. If a public CA is used, verify-ca allows connections to a server that somebody else may have registered with the CA, making you vulnerable to Man-in-the-Middle attacks. Either specify a custom CA certificate with sslrootcert parameter or use sslmode=verify-full for proper security."
              );
            }
            config.ssl.checkServerIdentity = function() {
            };
            break;
          }
          case "verify-full": {
            break;
          }
        }
      } else {
        switch (config.sslmode) {
          case "disable": {
            config.ssl = false;
            break;
          }
          case "prefer":
          case "require":
          case "verify-ca":
          case "verify-full": {
            if (config.sslmode !== "verify-full") {
              deprecatedSslModeWarning(config.sslmode);
            }
            break;
          }
          case "no-verify": {
            config.ssl.rejectUnauthorized = false;
            break;
          }
        }
      }
      return config;
    }
    function toConnectionOptions(sslConfig) {
      const connectionOptions = Object.entries(sslConfig).reduce((c, [key, value]) => {
        if (value !== void 0 && value !== null) {
          c[key] = value;
        }
        return c;
      }, /* @__PURE__ */ Object.create(null));
      return connectionOptions;
    }
    function toClientConfig(config) {
      const poolConfig = Object.entries(config).reduce((c, [key, value]) => {
        if (key === "ssl") {
          const sslConfig = value;
          if (typeof sslConfig === "boolean") {
            c[key] = sslConfig;
          }
          if (typeof sslConfig === "object") {
            c[key] = toConnectionOptions(sslConfig);
          }
        } else if (value !== void 0 && value !== null) {
          if (key === "port") {
            if (value !== "") {
              const v = parseInt(value, 10);
              if (isNaN(v)) {
                throw new Error(`Invalid ${key}: ${value}`);
              }
              c[key] = v;
            }
          } else {
            c[key] = value;
          }
        }
        return c;
      }, /* @__PURE__ */ Object.create(null));
      return poolConfig;
    }
    function parseIntoClientConfig(str) {
      return toClientConfig(parse(str));
    }
    function deprecatedSslModeWarning(sslmode) {
      if (!deprecatedSslModeWarning.warned && typeof process !== "undefined" && process.emitWarning) {
        deprecatedSslModeWarning.warned = true;
        process.emitWarning(`SECURITY WARNING: The SSL modes 'prefer', 'require', and 'verify-ca' are treated as aliases for 'verify-full'.
In the next major version (pg-connection-string v3.0.0 and pg v9.0.0), these modes will adopt standard libpq semantics, which have weaker security guarantees.

To prepare for this change:
- If you want the current behavior, explicitly use 'sslmode=verify-full'
- If you want libpq compatibility now, use 'uselibpqcompat=true&sslmode=${sslmode}'

See https://www.postgresql.org/docs/current/libpq-ssl.html for libpq SSL mode definitions.`);
      }
    }
    module.exports = parse;
    parse.parse = parse;
    parse.toClientConfig = toClientConfig;
    parse.parseIntoClientConfig = parseIntoClientConfig;
  }
});

// infrastructure/release-custody/node_modules/pg/lib/connection-parameters.js
var require_connection_parameters = __commonJS({
  "infrastructure/release-custody/node_modules/pg/lib/connection-parameters.js"(exports, module) {
    "use strict";
    var dns = __require("dns");
    var defaults2 = require_defaults();
    var parse = require_pg_connection_string().parse;
    var val = function(key, config, envVar) {
      if (config[key]) {
        return config[key];
      }
      if (envVar === void 0) {
        envVar = process.env["PG" + key.toUpperCase()];
      } else if (envVar === false) {
      } else {
        envVar = process.env[envVar];
      }
      return envVar || defaults2[key];
    };
    var readSSLConfigFromEnvironment = function() {
      switch (process.env.PGSSLMODE) {
        case "disable":
          return false;
        case "prefer":
        case "require":
        case "verify-ca":
        case "verify-full":
          return true;
        case "no-verify":
          return { rejectUnauthorized: false };
      }
      return defaults2.ssl;
    };
    var quoteParamValue = function(value) {
      return "'" + ("" + value).replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'";
    };
    var add = function(params, config, paramName) {
      const value = config[paramName];
      if (value !== void 0 && value !== null) {
        params.push(paramName + "=" + quoteParamValue(value));
      }
    };
    var ConnectionParameters = class {
      constructor(config) {
        config = typeof config === "string" ? parse(config) : config || {};
        if (config.connectionString) {
          config = Object.assign({}, config, parse(config.connectionString));
        }
        this.user = val("user", config);
        this.database = val("database", config);
        if (this.database === void 0) {
          this.database = this.user;
        }
        this.port = parseInt(val("port", config), 10);
        this.host = val("host", config);
        Object.defineProperty(this, "password", {
          configurable: true,
          enumerable: false,
          writable: true,
          value: val("password", config)
        });
        this.binary = val("binary", config);
        this.options = val("options", config);
        this.ssl = typeof config.ssl === "undefined" ? readSSLConfigFromEnvironment() : config.ssl;
        if (typeof this.ssl === "string") {
          if (this.ssl === "true") {
            this.ssl = true;
          }
        }
        if (this.ssl === "no-verify") {
          this.ssl = { rejectUnauthorized: false };
        }
        if (this.ssl && this.ssl.key) {
          Object.defineProperty(this.ssl, "key", {
            enumerable: false
          });
        }
        this.sslnegotiation = val("sslnegotiation", config, "PGSSLNEGOTIATION");
        if (this.sslnegotiation !== void 0 && this.sslnegotiation !== "postgres" && this.sslnegotiation !== "direct") {
          throw new Error(
            `Invalid sslnegotiation value: "${this.sslnegotiation}". Valid values are "postgres" and "direct".`
          );
        }
        if (this.sslnegotiation === "direct" && !this.ssl) {
          throw new Error("sslnegotiation=direct requires SSL to be enabled");
        }
        this.client_encoding = val("client_encoding", config);
        this.replication = val("replication", config);
        this.isDomainSocket = !(this.host || "").indexOf("/");
        this.application_name = val("application_name", config, "PGAPPNAME");
        this.fallback_application_name = val("fallback_application_name", config, false);
        this.statement_timeout = val("statement_timeout", config, false);
        this.lock_timeout = val("lock_timeout", config, false);
        this.idle_in_transaction_session_timeout = val("idle_in_transaction_session_timeout", config, false);
        this.query_timeout = val("query_timeout", config, false);
        if (config.connectionTimeoutMillis === void 0) {
          this.connect_timeout = process.env.PGCONNECT_TIMEOUT || 0;
        } else {
          this.connect_timeout = Math.floor(config.connectionTimeoutMillis / 1e3);
        }
        if (config.keepAlive === false) {
          this.keepalives = 0;
        } else if (config.keepAlive === true) {
          this.keepalives = 1;
        }
        if (typeof config.keepAliveInitialDelayMillis === "number") {
          this.keepalives_idle = Math.floor(config.keepAliveInitialDelayMillis / 1e3);
        }
      }
      getLibpqConnectionString(cb) {
        const params = [];
        add(params, this, "user");
        add(params, this, "password");
        add(params, this, "port");
        add(params, this, "application_name");
        add(params, this, "fallback_application_name");
        add(params, this, "connect_timeout");
        add(params, this, "options");
        const ssl = typeof this.ssl === "object" ? this.ssl : this.ssl ? { sslmode: this.ssl } : {};
        add(params, ssl, "sslmode");
        add(params, ssl, "sslca");
        add(params, ssl, "sslkey");
        add(params, ssl, "sslcert");
        add(params, ssl, "sslrootcert");
        add(params, this, "sslnegotiation");
        if (this.database) {
          params.push("dbname=" + quoteParamValue(this.database));
        }
        if (this.replication) {
          params.push("replication=" + quoteParamValue(this.replication));
        }
        if (this.host) {
          params.push("host=" + quoteParamValue(this.host));
        }
        if (this.isDomainSocket) {
          return cb(null, params.join(" "));
        }
        if (this.client_encoding) {
          params.push("client_encoding=" + quoteParamValue(this.client_encoding));
        }
        dns.lookup(this.host, function(err, address) {
          if (err) return cb(err, null);
          params.push("hostaddr=" + quoteParamValue(address));
          return cb(null, params.join(" "));
        });
      }
    };
    module.exports = ConnectionParameters;
  }
});

// infrastructure/release-custody/node_modules/pg/lib/result.js
var require_result = __commonJS({
  "infrastructure/release-custody/node_modules/pg/lib/result.js"(exports, module) {
    "use strict";
    var types2 = require_pg_types();
    var matchRegexp = /^([A-Za-z]+)(?: (\d+))?(?: (\d+))?/;
    var Result2 = class {
      constructor(rowMode, types3) {
        this.command = null;
        this.rowCount = null;
        this.oid = null;
        this.rows = [];
        this.fields = [];
        this._parsers = void 0;
        this._types = types3;
        this.RowCtor = null;
        this.rowAsArray = rowMode === "array";
        if (this.rowAsArray) {
          this.parseRow = this._parseRowAsArray;
        }
        this._prebuiltEmptyResultObject = null;
      }
      // adds a command complete message
      addCommandComplete(msg) {
        let match;
        if (msg.text) {
          match = matchRegexp.exec(msg.text);
        } else {
          match = matchRegexp.exec(msg.command);
        }
        if (match) {
          this.command = match[1];
          if (match[3]) {
            this.oid = parseInt(match[2], 10);
            this.rowCount = parseInt(match[3], 10);
          } else if (match[2]) {
            this.rowCount = parseInt(match[2], 10);
          }
        }
      }
      _parseRowAsArray(rowData) {
        const row = new Array(rowData.length);
        for (let i = 0, len = rowData.length; i < len; i++) {
          const rawValue = rowData[i];
          if (rawValue !== null) {
            row[i] = this._parsers[i](rawValue);
          } else {
            row[i] = null;
          }
        }
        return row;
      }
      parseRow(rowData) {
        const row = { ...this._prebuiltEmptyResultObject };
        for (let i = 0, len = rowData.length; i < len; i++) {
          const rawValue = rowData[i];
          const field = this.fields[i].name;
          if (rawValue !== null) {
            const v = this.fields[i].format === "binary" ? Buffer.from(rawValue) : rawValue;
            row[field] = this._parsers[i](v);
          } else {
            row[field] = null;
          }
        }
        return row;
      }
      addRow(row) {
        this.rows.push(row);
      }
      addFields(fieldDescriptions) {
        this.fields = fieldDescriptions;
        if (this.fields.length) {
          this._parsers = new Array(fieldDescriptions.length);
        }
        const row = /* @__PURE__ */ Object.create(null);
        for (let i = 0; i < fieldDescriptions.length; i++) {
          const desc = fieldDescriptions[i];
          row[desc.name] = null;
          if (this._types) {
            this._parsers[i] = this._types.getTypeParser(desc.dataTypeID, desc.format || "text");
          } else {
            this._parsers[i] = types2.getTypeParser(desc.dataTypeID, desc.format || "text");
          }
        }
        this._prebuiltEmptyResultObject = { ...row };
      }
    };
    module.exports = Result2;
  }
});

// infrastructure/release-custody/node_modules/pg/lib/query.js
var require_query = __commonJS({
  "infrastructure/release-custody/node_modules/pg/lib/query.js"(exports, module) {
    "use strict";
    var { EventEmitter } = __require("events");
    var Result2 = require_result();
    var utils = require_utils();
    var Query2 = class extends EventEmitter {
      constructor(config, values, callback) {
        super();
        config = utils.normalizeQueryConfig(config, values, callback);
        this.text = config.text;
        this.values = config.values;
        this.rows = config.rows;
        this.types = config.types;
        this.name = config.name;
        this.queryMode = config.queryMode;
        this.binary = config.binary;
        this.portal = config.portal || "";
        this.callback = config.callback;
        this._rowMode = config.rowMode;
        if (process.domain && config.callback) {
          this.callback = process.domain.bind(config.callback);
        }
        this._result = new Result2(this._rowMode, this.types);
        this._results = this._result;
        this._canceledDueToError = false;
      }
      requiresPreparation() {
        if (this.queryMode === "extended") {
          return true;
        }
        if (this.name) {
          return true;
        }
        if (this.rows) {
          return true;
        }
        if (!this.text) {
          return false;
        }
        if (!this.values) {
          return false;
        }
        return this.values.length > 0;
      }
      _checkForMultirow() {
        if (this._result.command) {
          if (!Array.isArray(this._results)) {
            this._results = [this._result];
          }
          this._result = new Result2(this._rowMode, this._result._types);
          this._results.push(this._result);
        }
      }
      // associates row metadata from the supplied
      // message with this query object
      // metadata used when parsing row results
      handleRowDescription(msg) {
        this._checkForMultirow();
        this._result.addFields(msg.fields);
        this._accumulateRows = this.callback || !this.listeners("row").length;
      }
      handleDataRow(msg) {
        let row;
        if (this._canceledDueToError) {
          return;
        }
        try {
          row = this._result.parseRow(msg.fields);
        } catch (err) {
          this._canceledDueToError = err;
          return;
        }
        this.emit("row", row, this._result);
        if (this._accumulateRows) {
          this._result.addRow(row);
        }
      }
      handleCommandComplete(msg, connection) {
        this._checkForMultirow();
        this._result.addCommandComplete(msg);
        if (this.rows) {
          connection.sync();
        }
      }
      // if a named prepared statement is created with empty query text
      // the backend will send an emptyQuery message but *not* a command complete message
      // since we pipeline sync immediately after execute we don't need to do anything here
      // unless we have rows specified, in which case we did not pipeline the initial sync call
      handleEmptyQuery(connection) {
        if (this.rows) {
          connection.sync();
        }
      }
      handleError(err, connection) {
        if (this._canceledDueToError) {
          err = this._canceledDueToError;
          this._canceledDueToError = false;
        }
        if (this.callback) {
          return this.callback(err);
        }
        this.emit("error", err);
      }
      handleReadyForQuery(con) {
        if (this._canceledDueToError) {
          return this.handleError(this._canceledDueToError, con);
        }
        if (this.callback) {
          try {
            this.callback(null, this._results);
          } catch (err) {
            process.nextTick(() => {
              throw err;
            });
          }
        }
        this.emit("end", this._results);
      }
      submit(connection) {
        if (typeof this.text !== "string" && typeof this.name !== "string") {
          return new Error("A query must have either text or a name. Supplying neither is unsupported.");
        }
        const previous = connection.parsedStatements[this.name] || connection.submittedNamedStatements[this.name];
        if (this.text && previous && this.text !== previous) {
          return new Error(`Prepared statements must be unique - '${this.name}' was used for a different statement`);
        }
        if (this.values && !Array.isArray(this.values)) {
          return new Error("Query values must be an array");
        }
        if (this.requiresPreparation()) {
          connection.stream.cork && connection.stream.cork();
          try {
            this.prepare(connection);
          } finally {
            connection.stream.uncork && connection.stream.uncork();
          }
        } else {
          connection.query(this.text);
        }
        return null;
      }
      hasBeenParsed(connection) {
        return this.name && (connection.parsedStatements[this.name] || connection.submittedNamedStatements[this.name]);
      }
      handlePortalSuspended(connection) {
        this._getRows(connection, this.rows);
      }
      _getRows(connection, rows) {
        connection.execute({
          portal: this.portal,
          rows
        });
        if (!rows) {
          connection.sync();
        } else {
          connection.flush();
        }
      }
      // http://developer.postgresql.org/pgdocs/postgres/protocol-flow.html#PROTOCOL-FLOW-EXT-QUERY
      prepare(connection) {
        if (!this.hasBeenParsed(connection)) {
          connection.parse({
            text: this.text,
            name: this.name,
            types: this.types
          });
          if (this.name) {
            connection.submittedNamedStatements[this.name] = this.text;
          }
        }
        try {
          connection.bind({
            portal: this.portal,
            statement: this.name,
            values: this.values,
            binary: this.binary,
            valueMapper: utils.prepareValue
          });
        } catch (err) {
          connection.close({ type: "S", name: this.name });
          connection.sync();
          this.handleError(err, connection);
          return;
        }
        connection.describe({
          type: "P",
          name: this.portal || ""
        });
        this._getRows(connection, this.rows);
      }
      handleCopyInResponse(connection) {
        connection.sendCopyFail("No source stream defined");
      }
      handleCopyData(msg, connection) {
      }
    };
    module.exports = Query2;
  }
});

// infrastructure/release-custody/node_modules/pg-protocol/dist/messages.js
var require_messages = __commonJS({
  "infrastructure/release-custody/node_modules/pg-protocol/dist/messages.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.NoticeMessage = exports.DataRowMessage = exports.CommandCompleteMessage = exports.ReadyForQueryMessage = exports.NotificationResponseMessage = exports.BackendKeyDataMessage = exports.AuthenticationMD5Password = exports.ParameterStatusMessage = exports.ParameterDescriptionMessage = exports.RowDescriptionMessage = exports.Field = exports.CopyResponse = exports.CopyDataMessage = exports.DatabaseError = exports.copyDone = exports.emptyQuery = exports.replicationStart = exports.portalSuspended = exports.noData = exports.closeComplete = exports.bindComplete = exports.parseComplete = void 0;
    exports.parseComplete = {
      name: "parseComplete",
      length: 5
    };
    exports.bindComplete = {
      name: "bindComplete",
      length: 5
    };
    exports.closeComplete = {
      name: "closeComplete",
      length: 5
    };
    exports.noData = {
      name: "noData",
      length: 5
    };
    exports.portalSuspended = {
      name: "portalSuspended",
      length: 5
    };
    exports.replicationStart = {
      name: "replicationStart",
      length: 4
    };
    exports.emptyQuery = {
      name: "emptyQuery",
      length: 4
    };
    exports.copyDone = {
      name: "copyDone",
      length: 4
    };
    var DatabaseError2 = class extends Error {
      constructor(message, length, name) {
        super(message);
        this.length = length;
        this.name = name;
      }
    };
    exports.DatabaseError = DatabaseError2;
    var CopyDataMessage = class {
      constructor(length, chunk) {
        this.length = length;
        this.chunk = chunk;
        this.name = "copyData";
      }
    };
    exports.CopyDataMessage = CopyDataMessage;
    var CopyResponse = class {
      constructor(length, name, binary, columnCount) {
        this.length = length;
        this.name = name;
        this.binary = binary;
        this.columnTypes = new Array(columnCount);
      }
    };
    exports.CopyResponse = CopyResponse;
    var Field = class {
      constructor(name, tableID, columnID, dataTypeID, dataTypeSize, dataTypeModifier, format) {
        this.name = name;
        this.tableID = tableID;
        this.columnID = columnID;
        this.dataTypeID = dataTypeID;
        this.dataTypeSize = dataTypeSize;
        this.dataTypeModifier = dataTypeModifier;
        this.format = format;
      }
    };
    exports.Field = Field;
    var RowDescriptionMessage = class {
      constructor(length, fieldCount) {
        this.length = length;
        this.fieldCount = fieldCount;
        this.name = "rowDescription";
        this.fields = new Array(this.fieldCount);
      }
    };
    exports.RowDescriptionMessage = RowDescriptionMessage;
    var ParameterDescriptionMessage = class {
      constructor(length, parameterCount) {
        this.length = length;
        this.parameterCount = parameterCount;
        this.name = "parameterDescription";
        this.dataTypeIDs = new Array(this.parameterCount);
      }
    };
    exports.ParameterDescriptionMessage = ParameterDescriptionMessage;
    var ParameterStatusMessage = class {
      constructor(length, parameterName, parameterValue) {
        this.length = length;
        this.parameterName = parameterName;
        this.parameterValue = parameterValue;
        this.name = "parameterStatus";
      }
    };
    exports.ParameterStatusMessage = ParameterStatusMessage;
    var AuthenticationMD5Password = class {
      constructor(length, salt) {
        this.length = length;
        this.salt = salt;
        this.name = "authenticationMD5Password";
      }
    };
    exports.AuthenticationMD5Password = AuthenticationMD5Password;
    var BackendKeyDataMessage = class {
      constructor(length, processID, secretKey) {
        this.length = length;
        this.processID = processID;
        this.secretKey = secretKey;
        this.name = "backendKeyData";
      }
    };
    exports.BackendKeyDataMessage = BackendKeyDataMessage;
    var NotificationResponseMessage = class {
      constructor(length, processId, channel, payload) {
        this.length = length;
        this.processId = processId;
        this.channel = channel;
        this.payload = payload;
        this.name = "notification";
      }
    };
    exports.NotificationResponseMessage = NotificationResponseMessage;
    var ReadyForQueryMessage = class {
      constructor(length, status) {
        this.length = length;
        this.status = status;
        this.name = "readyForQuery";
      }
    };
    exports.ReadyForQueryMessage = ReadyForQueryMessage;
    var CommandCompleteMessage = class {
      constructor(length, text) {
        this.length = length;
        this.text = text;
        this.name = "commandComplete";
      }
    };
    exports.CommandCompleteMessage = CommandCompleteMessage;
    var DataRowMessage = class {
      constructor(length, fields2) {
        this.length = length;
        this.fields = fields2;
        this.name = "dataRow";
        this.fieldCount = fields2.length;
      }
    };
    exports.DataRowMessage = DataRowMessage;
    var NoticeMessage = class {
      constructor(length, message) {
        this.length = length;
        this.message = message;
        this.name = "notice";
      }
    };
    exports.NoticeMessage = NoticeMessage;
  }
});

// infrastructure/release-custody/node_modules/pg-protocol/dist/buffer-writer.js
var require_buffer_writer = __commonJS({
  "infrastructure/release-custody/node_modules/pg-protocol/dist/buffer-writer.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Writer = void 0;
    var Writer = class {
      constructor(size = 256) {
        this.size = size;
        this.offset = 5;
        this.headerPosition = 0;
        this.buffer = Buffer.allocUnsafe(size);
      }
      ensure(size) {
        const remaining = this.buffer.length - this.offset;
        if (remaining < size) {
          const oldBuffer = this.buffer;
          const newSize = oldBuffer.length + (oldBuffer.length >> 1) + size;
          this.buffer = Buffer.allocUnsafe(newSize);
          oldBuffer.copy(this.buffer);
        }
      }
      addInt32(num) {
        this.ensure(4);
        this.buffer[this.offset++] = num >>> 24 & 255;
        this.buffer[this.offset++] = num >>> 16 & 255;
        this.buffer[this.offset++] = num >>> 8 & 255;
        this.buffer[this.offset++] = num >>> 0 & 255;
        return this;
      }
      addInt16(num) {
        this.ensure(2);
        this.buffer[this.offset++] = num >>> 8 & 255;
        this.buffer[this.offset++] = num >>> 0 & 255;
        return this;
      }
      addCString(string) {
        if (!string) {
          this.ensure(1);
        } else {
          const len = Buffer.byteLength(string);
          this.ensure(len + 1);
          this.buffer.write(string, this.offset, "utf-8");
          this.offset += len;
        }
        this.buffer[this.offset++] = 0;
        return this;
      }
      addString(string = "") {
        const len = Buffer.byteLength(string);
        this.ensure(len);
        this.buffer.write(string, this.offset);
        this.offset += len;
        return this;
      }
      // Write an Int32 byte-length prefix immediately followed by the string's UTF-8
      // bytes. Postgres' Bind wire format prefixes every parameter with its length,
      // and doing it in one method computes Buffer.byteLength ONCE — the previous
      // `addInt32(Buffer.byteLength(s)).addString(s)` pairing scanned the string
      // three times (byteLength for the prefix, byteLength again inside addString,
      // then the encode), which is costly for large text parameters.
      addInt32PrefixedString(string) {
        const len = Buffer.byteLength(string);
        this.ensure(4 + len);
        const buffer = this.buffer;
        let offset = this.offset;
        buffer[offset++] = len >>> 24 & 255;
        buffer[offset++] = len >>> 16 & 255;
        buffer[offset++] = len >>> 8 & 255;
        buffer[offset++] = len >>> 0 & 255;
        buffer.write(string, offset, "utf-8");
        this.offset = offset + len;
        return this;
      }
      add(otherBuffer) {
        this.ensure(otherBuffer.length);
        otherBuffer.copy(this.buffer, this.offset);
        this.offset += otherBuffer.length;
        return this;
      }
      join(code) {
        if (code) {
          this.buffer[this.headerPosition] = code;
          const length = this.offset - (this.headerPosition + 1);
          this.buffer.writeInt32BE(length, this.headerPosition + 1);
        }
        return this.buffer.slice(code ? 0 : 5, this.offset);
      }
      flush(code) {
        const result = this.join(code);
        this.offset = 5;
        this.headerPosition = 0;
        this.buffer = Buffer.allocUnsafe(this.size);
        return result;
      }
      clear() {
        this.offset = 5;
        this.headerPosition = 0;
      }
    };
    exports.Writer = Writer;
  }
});

// infrastructure/release-custody/node_modules/pg-protocol/dist/serializer.js
var require_serializer = __commonJS({
  "infrastructure/release-custody/node_modules/pg-protocol/dist/serializer.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.serialize = void 0;
    var buffer_writer_1 = require_buffer_writer();
    var writer = new buffer_writer_1.Writer();
    var startup = (opts) => {
      writer.addInt16(3).addInt16(0);
      for (const key of Object.keys(opts)) {
        writer.addCString(key).addCString(opts[key]);
      }
      writer.addCString("client_encoding").addCString("UTF8");
      const bodyBuffer = writer.addCString("").flush();
      const length = bodyBuffer.length + 4;
      return new buffer_writer_1.Writer().addInt32(length).add(bodyBuffer).flush();
    };
    var requestSsl = () => {
      const response = Buffer.allocUnsafe(8);
      response.writeInt32BE(8, 0);
      response.writeInt32BE(80877103, 4);
      return response;
    };
    var password = (password2) => {
      return writer.addCString(password2).flush(
        112
        /* code.startup */
      );
    };
    var sendSASLInitialResponseMessage = function(mechanism, initialResponse) {
      writer.addCString(mechanism).addInt32PrefixedString(initialResponse);
      return writer.flush(
        112
        /* code.startup */
      );
    };
    var sendSCRAMClientFinalMessage = function(additionalData) {
      return writer.addString(additionalData).flush(
        112
        /* code.startup */
      );
    };
    var query = (text) => {
      return writer.addCString(text).flush(
        81
        /* code.query */
      );
    };
    var emptyArray = [];
    var parse = (query2) => {
      const name = query2.name || "";
      if (name.length > 63) {
        console.error("Warning! Postgres only supports 63 characters for query names.");
        console.error("You supplied %s (%s)", name, name.length);
        console.error("This can cause conflicts and silent errors executing queries");
      }
      const types2 = query2.types || emptyArray;
      const len = types2.length;
      const buffer = writer.addCString(name).addCString(query2.text).addInt16(len);
      for (let i = 0; i < len; i++) {
        buffer.addInt32(types2[i]);
      }
      return writer.flush(
        80
        /* code.parse */
      );
    };
    var paramWriter = new buffer_writer_1.Writer();
    var writeValues = function(values, valueMapper) {
      for (let i = 0; i < values.length; i++) {
        const mappedVal = valueMapper ? valueMapper(values[i], i) : values[i];
        if (mappedVal == null) {
          writer.addInt16(
            0
            /* ParamType.STRING */
          );
          paramWriter.addInt32(-1);
        } else if (mappedVal instanceof Buffer) {
          writer.addInt16(
            1
            /* ParamType.BINARY */
          );
          paramWriter.addInt32(mappedVal.length);
          paramWriter.add(mappedVal);
        } else {
          writer.addInt16(
            0
            /* ParamType.STRING */
          );
          paramWriter.addInt32PrefixedString(mappedVal);
        }
      }
    };
    var bind = (config = {}) => {
      const portal = config.portal || "";
      const statement = config.statement || "";
      const binary = config.binary || false;
      const values = config.values || emptyArray;
      const len = values.length;
      writer.addCString(portal).addCString(statement);
      writer.addInt16(len);
      try {
        writeValues(values, config.valueMapper);
      } catch (err) {
        writer.clear();
        paramWriter.clear();
        throw err;
      }
      writer.addInt16(len);
      writer.add(paramWriter.flush());
      writer.addInt16(1);
      writer.addInt16(
        binary ? 1 : 0
        /* ParamType.STRING */
      );
      return writer.flush(
        66
        /* code.bind */
      );
    };
    var emptyExecute = Buffer.from([69, 0, 0, 0, 9, 0, 0, 0, 0, 0]);
    var execute3 = (config) => {
      if (!config || !config.portal && !config.rows) {
        return emptyExecute;
      }
      const portal = config.portal || "";
      const rows = config.rows || 0;
      const portalLength = Buffer.byteLength(portal);
      const len = 4 + portalLength + 1 + 4;
      const buff = Buffer.allocUnsafe(1 + len);
      buff[0] = 69;
      buff.writeInt32BE(len, 1);
      buff.write(portal, 5, "utf-8");
      buff[portalLength + 5] = 0;
      buff.writeUInt32BE(rows, buff.length - 4);
      return buff;
    };
    var cancel = (processID, secretKey) => {
      const buffer = Buffer.allocUnsafe(16);
      buffer.writeInt32BE(16, 0);
      buffer.writeInt16BE(1234, 4);
      buffer.writeInt16BE(5678, 6);
      buffer.writeInt32BE(processID, 8);
      buffer.writeInt32BE(secretKey, 12);
      return buffer;
    };
    var cstringMessage = (code, string) => {
      const stringLen = Buffer.byteLength(string);
      const len = 4 + stringLen + 1;
      const buffer = Buffer.allocUnsafe(1 + len);
      buffer[0] = code;
      buffer.writeInt32BE(len, 1);
      buffer.write(string, 5, "utf-8");
      buffer[len] = 0;
      return buffer;
    };
    var emptyDescribePortal = writer.addCString("P").flush(
      68
      /* code.describe */
    );
    var emptyDescribeStatement = writer.addCString("S").flush(
      68
      /* code.describe */
    );
    var describe = (msg) => {
      return msg.name ? cstringMessage(68, `${msg.type}${msg.name || ""}`) : msg.type === "P" ? emptyDescribePortal : emptyDescribeStatement;
    };
    var close = (msg) => {
      const text = `${msg.type}${msg.name || ""}`;
      return cstringMessage(67, text);
    };
    var copyData = (chunk) => {
      return writer.add(chunk).flush(
        100
        /* code.copyFromChunk */
      );
    };
    var copyFail = (message) => {
      return cstringMessage(102, message);
    };
    var codeOnlyBuffer = (code) => Buffer.from([code, 0, 0, 0, 4]);
    var flushBuffer = codeOnlyBuffer(
      72
      /* code.flush */
    );
    var syncBuffer = codeOnlyBuffer(
      83
      /* code.sync */
    );
    var endBuffer = codeOnlyBuffer(
      88
      /* code.end */
    );
    var copyDoneBuffer = codeOnlyBuffer(
      99
      /* code.copyDone */
    );
    var serialize = {
      startup,
      password,
      requestSsl,
      sendSASLInitialResponseMessage,
      sendSCRAMClientFinalMessage,
      query,
      parse,
      bind,
      execute: execute3,
      describe,
      close,
      flush: () => flushBuffer,
      sync: () => syncBuffer,
      end: () => endBuffer,
      copyData,
      copyDone: () => copyDoneBuffer,
      copyFail,
      cancel
    };
    exports.serialize = serialize;
  }
});

// infrastructure/release-custody/node_modules/pg-protocol/dist/buffer-reader.js
var require_buffer_reader = __commonJS({
  "infrastructure/release-custody/node_modules/pg-protocol/dist/buffer-reader.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.BufferReader = void 0;
    var BufferReader = class {
      constructor(offset = 0) {
        this.offset = offset;
        this.buffer = Buffer.allocUnsafe(0);
        this.encoding = "utf-8";
      }
      setBuffer(offset, buffer) {
        this.offset = offset;
        this.buffer = buffer;
      }
      int16() {
        const result = this.buffer.readInt16BE(this.offset);
        this.offset += 2;
        return result;
      }
      byte() {
        const result = this.buffer[this.offset];
        this.offset++;
        return result;
      }
      int32() {
        const result = this.buffer.readInt32BE(this.offset);
        this.offset += 4;
        return result;
      }
      uint32() {
        const result = this.buffer.readUInt32BE(this.offset);
        this.offset += 4;
        return result;
      }
      string(length) {
        const result = this.buffer.toString(this.encoding, this.offset, this.offset + length);
        this.offset += length;
        return result;
      }
      cstring() {
        const start = this.offset;
        let end = start;
        while (this.buffer[end++]) {
        }
        this.offset = end;
        return this.buffer.toString(this.encoding, start, end - 1);
      }
      bytes(length) {
        const result = this.buffer.slice(this.offset, this.offset + length);
        this.offset += length;
        return result;
      }
    };
    exports.BufferReader = BufferReader;
  }
});

// infrastructure/release-custody/node_modules/pg-protocol/dist/parser.js
var require_parser = __commonJS({
  "infrastructure/release-custody/node_modules/pg-protocol/dist/parser.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Parser = void 0;
    var messages_1 = require_messages();
    var buffer_reader_1 = require_buffer_reader();
    var CODE_LENGTH = 1;
    var LEN_LENGTH = 4;
    var HEADER_LENGTH = CODE_LENGTH + LEN_LENGTH;
    var LATEINIT_LENGTH = -1;
    var emptyBuffer = Buffer.allocUnsafe(0);
    var Parser = class {
      constructor(opts) {
        this.buffer = emptyBuffer;
        this.bufferLength = 0;
        this.bufferOffset = 0;
        this.reader = new buffer_reader_1.BufferReader();
        if ((opts === null || opts === void 0 ? void 0 : opts.mode) === "binary") {
          throw new Error("Binary mode not supported yet");
        }
        this.mode = (opts === null || opts === void 0 ? void 0 : opts.mode) || "text";
      }
      parse(buffer, callback) {
        this.mergeBuffer(buffer);
        const bufferFullLength = this.bufferOffset + this.bufferLength;
        let offset = this.bufferOffset;
        while (offset + HEADER_LENGTH <= bufferFullLength) {
          const code = this.buffer[offset];
          const length = this.buffer.readUInt32BE(offset + CODE_LENGTH);
          const fullMessageLength = CODE_LENGTH + length;
          if (fullMessageLength + offset <= bufferFullLength) {
            const message = this.handlePacket(offset + HEADER_LENGTH, code, length, this.buffer);
            callback(message);
            offset += fullMessageLength;
          } else {
            break;
          }
        }
        if (offset === bufferFullLength) {
          this.buffer = emptyBuffer;
          this.bufferLength = 0;
          this.bufferOffset = 0;
        } else {
          this.bufferLength = bufferFullLength - offset;
          this.bufferOffset = offset;
        }
      }
      mergeBuffer(buffer) {
        if (this.bufferLength > 0) {
          const newLength = this.bufferLength + buffer.byteLength;
          const newFullLength = newLength + this.bufferOffset;
          if (newFullLength > this.buffer.byteLength) {
            let newBuffer;
            if (newLength <= this.buffer.byteLength && this.bufferOffset >= this.bufferLength) {
              newBuffer = this.buffer;
            } else {
              let newBufferLength = this.buffer.byteLength * 2;
              while (newLength >= newBufferLength) {
                newBufferLength *= 2;
              }
              newBuffer = Buffer.allocUnsafe(newBufferLength);
            }
            this.buffer.copy(newBuffer, 0, this.bufferOffset, this.bufferOffset + this.bufferLength);
            this.buffer = newBuffer;
            this.bufferOffset = 0;
          }
          buffer.copy(this.buffer, this.bufferOffset + this.bufferLength);
          this.bufferLength = newLength;
        } else {
          this.buffer = buffer;
          this.bufferOffset = 0;
          this.bufferLength = buffer.byteLength;
        }
      }
      handlePacket(offset, code, length, bytes) {
        const { reader } = this;
        reader.setBuffer(offset, bytes);
        let message;
        switch (code) {
          case 50:
            message = messages_1.bindComplete;
            break;
          case 49:
            message = messages_1.parseComplete;
            break;
          case 51:
            message = messages_1.closeComplete;
            break;
          case 110:
            message = messages_1.noData;
            break;
          case 115:
            message = messages_1.portalSuspended;
            break;
          case 99:
            message = messages_1.copyDone;
            break;
          case 87:
            message = messages_1.replicationStart;
            break;
          case 73:
            message = messages_1.emptyQuery;
            break;
          case 68:
            message = parseDataRowMessage(reader);
            break;
          case 67:
            message = parseCommandCompleteMessage(reader);
            break;
          case 90:
            message = parseReadyForQueryMessage(reader);
            break;
          case 65:
            message = parseNotificationMessage(reader);
            break;
          case 82:
            message = parseAuthenticationResponse(reader, length);
            break;
          case 83:
            message = parseParameterStatusMessage(reader);
            break;
          case 75:
            message = parseBackendKeyData(reader);
            break;
          case 69:
            message = parseErrorMessage(reader, "error");
            break;
          case 78:
            message = parseErrorMessage(reader, "notice");
            break;
          case 84:
            message = parseRowDescriptionMessage(reader);
            break;
          case 116:
            message = parseParameterDescriptionMessage(reader);
            break;
          case 71:
            message = parseCopyInMessage(reader);
            break;
          case 72:
            message = parseCopyOutMessage(reader);
            break;
          case 100:
            message = parseCopyData(reader, length);
            break;
          default:
            return new messages_1.DatabaseError("received invalid response: " + code.toString(16), length, "error");
        }
        reader.setBuffer(0, emptyBuffer);
        message.length = length;
        return message;
      }
    };
    exports.Parser = Parser;
    var parseReadyForQueryMessage = (reader) => {
      const status = reader.string(1);
      return new messages_1.ReadyForQueryMessage(LATEINIT_LENGTH, status);
    };
    var parseCommandCompleteMessage = (reader) => {
      const text = reader.cstring();
      return new messages_1.CommandCompleteMessage(LATEINIT_LENGTH, text);
    };
    var parseCopyData = (reader, length) => {
      const chunk = reader.bytes(length - 4);
      return new messages_1.CopyDataMessage(LATEINIT_LENGTH, chunk);
    };
    var parseCopyInMessage = (reader) => parseCopyMessage(reader, "copyInResponse");
    var parseCopyOutMessage = (reader) => parseCopyMessage(reader, "copyOutResponse");
    var parseCopyMessage = (reader, messageName) => {
      const isBinary = reader.byte() !== 0;
      const columnCount = reader.int16();
      const message = new messages_1.CopyResponse(LATEINIT_LENGTH, messageName, isBinary, columnCount);
      for (let i = 0; i < columnCount; i++) {
        message.columnTypes[i] = reader.int16();
      }
      return message;
    };
    var parseNotificationMessage = (reader) => {
      const processId = reader.int32();
      const channel = reader.cstring();
      const payload = reader.cstring();
      return new messages_1.NotificationResponseMessage(LATEINIT_LENGTH, processId, channel, payload);
    };
    var parseRowDescriptionMessage = (reader) => {
      const fieldCount = reader.int16();
      const message = new messages_1.RowDescriptionMessage(LATEINIT_LENGTH, fieldCount);
      for (let i = 0; i < fieldCount; i++) {
        message.fields[i] = parseField(reader);
      }
      return message;
    };
    var parseField = (reader) => {
      const name = reader.cstring();
      const tableID = reader.uint32();
      const columnID = reader.int16();
      const dataTypeID = reader.uint32();
      const dataTypeSize = reader.int16();
      const dataTypeModifier = reader.int32();
      const mode = reader.int16() === 0 ? "text" : "binary";
      return new messages_1.Field(name, tableID, columnID, dataTypeID, dataTypeSize, dataTypeModifier, mode);
    };
    var parseParameterDescriptionMessage = (reader) => {
      const parameterCount = reader.int16();
      const message = new messages_1.ParameterDescriptionMessage(LATEINIT_LENGTH, parameterCount);
      for (let i = 0; i < parameterCount; i++) {
        message.dataTypeIDs[i] = reader.uint32();
      }
      return message;
    };
    var parseDataRowMessage = (reader) => {
      const fieldCount = reader.int16();
      const fields2 = new Array(fieldCount);
      for (let i = 0; i < fieldCount; i++) {
        const len = reader.int32();
        fields2[i] = len === -1 ? null : reader.string(len);
      }
      return new messages_1.DataRowMessage(LATEINIT_LENGTH, fields2);
    };
    var parseParameterStatusMessage = (reader) => {
      const name = reader.cstring();
      const value = reader.cstring();
      return new messages_1.ParameterStatusMessage(LATEINIT_LENGTH, name, value);
    };
    var parseBackendKeyData = (reader) => {
      const processID = reader.int32();
      const secretKey = reader.int32();
      return new messages_1.BackendKeyDataMessage(LATEINIT_LENGTH, processID, secretKey);
    };
    var parseAuthenticationResponse = (reader, length) => {
      const code = reader.int32();
      const message = {
        name: "authenticationOk",
        length
      };
      switch (code) {
        case 0:
          break;
        case 3:
          if (message.length === 8) {
            message.name = "authenticationCleartextPassword";
          }
          break;
        case 5:
          if (message.length === 12) {
            message.name = "authenticationMD5Password";
            const salt = reader.bytes(4);
            return new messages_1.AuthenticationMD5Password(LATEINIT_LENGTH, salt);
          }
          break;
        case 10:
          {
            message.name = "authenticationSASL";
            message.mechanisms = [];
            let mechanism;
            do {
              mechanism = reader.cstring();
              if (mechanism) {
                message.mechanisms.push(mechanism);
              }
            } while (mechanism);
          }
          break;
        case 11:
          message.name = "authenticationSASLContinue";
          message.data = reader.string(length - 8);
          break;
        case 12:
          message.name = "authenticationSASLFinal";
          message.data = reader.string(length - 8);
          break;
        default:
          throw new Error("Unknown authenticationOk message type " + code);
      }
      return message;
    };
    var parseErrorMessage = (reader, name) => {
      const fields2 = {};
      let fieldType = reader.string(1);
      while (fieldType !== "\0") {
        fields2[fieldType] = reader.cstring();
        fieldType = reader.string(1);
      }
      const messageValue = fields2.M;
      const message = name === "notice" ? new messages_1.NoticeMessage(LATEINIT_LENGTH, messageValue) : new messages_1.DatabaseError(messageValue, LATEINIT_LENGTH, name);
      message.severity = fields2.S;
      message.code = fields2.C;
      message.detail = fields2.D;
      message.hint = fields2.H;
      message.position = fields2.P;
      message.internalPosition = fields2.p;
      message.internalQuery = fields2.q;
      message.where = fields2.W;
      message.schema = fields2.s;
      message.table = fields2.t;
      message.column = fields2.c;
      message.dataType = fields2.d;
      message.constraint = fields2.n;
      message.file = fields2.F;
      message.line = fields2.L;
      message.routine = fields2.R;
      return message;
    };
  }
});

// infrastructure/release-custody/node_modules/pg-protocol/dist/index.js
var require_dist = __commonJS({
  "infrastructure/release-custody/node_modules/pg-protocol/dist/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.DatabaseError = exports.serialize = void 0;
    exports.parse = parse;
    var messages_1 = require_messages();
    Object.defineProperty(exports, "DatabaseError", { enumerable: true, get: function() {
      return messages_1.DatabaseError;
    } });
    var serializer_1 = require_serializer();
    Object.defineProperty(exports, "serialize", { enumerable: true, get: function() {
      return serializer_1.serialize;
    } });
    var parser_1 = require_parser();
    function parse(stream, callback) {
      const parser = new parser_1.Parser();
      stream.on("data", (buffer) => parser.parse(buffer, callback));
      return new Promise((resolve) => stream.on("end", () => resolve()));
    }
  }
});

// infrastructure/release-custody/node_modules/pg-cloudflare/dist/empty.js
var require_empty = __commonJS({
  "infrastructure/release-custody/node_modules/pg-cloudflare/dist/empty.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = {};
  }
});

// infrastructure/release-custody/node_modules/pg/lib/stream.js
var require_stream = __commonJS({
  "infrastructure/release-custody/node_modules/pg/lib/stream.js"(exports, module) {
    var { getStream, getSecureStream } = getStreamFuncs();
    module.exports = {
      /**
       * Get a socket stream compatible with the current runtime environment.
       * @returns {Duplex}
       */
      getStream,
      /**
       * Get a TLS secured socket, compatible with the current environment,
       * using the socket and other settings given in `options`.
       * @returns {Duplex}
       */
      getSecureStream
    };
    function getNodejsStreamFuncs() {
      function getStream2(ssl) {
        const net = __require("net");
        return new net.Socket();
      }
      function getSecureStream2(options) {
        const tls = __require("tls");
        return tls.connect(options);
      }
      return {
        getStream: getStream2,
        getSecureStream: getSecureStream2
      };
    }
    function getCloudflareStreamFuncs() {
      function getStream2(ssl) {
        const { CloudflareSocket } = require_empty();
        return new CloudflareSocket(ssl);
      }
      function getSecureStream2(options) {
        options.socket.startTls(options);
        return options.socket;
      }
      return {
        getStream: getStream2,
        getSecureStream: getSecureStream2
      };
    }
    function isCloudflareRuntime() {
      if (typeof navigator === "object" && navigator !== null && typeof navigator.userAgent === "string") {
        return navigator.userAgent === "Cloudflare-Workers";
      }
      if (typeof Response === "function") {
        const resp = new Response(null, { cf: { thing: true } });
        if (typeof resp.cf === "object" && resp.cf !== null && resp.cf.thing) {
          return true;
        }
      }
      return false;
    }
    function getStreamFuncs() {
      if (isCloudflareRuntime()) {
        return getCloudflareStreamFuncs();
      }
      return getNodejsStreamFuncs();
    }
  }
});

// infrastructure/release-custody/node_modules/pg/lib/connection.js
var require_connection = __commonJS({
  "infrastructure/release-custody/node_modules/pg/lib/connection.js"(exports, module) {
    "use strict";
    var EventEmitter = __require("events").EventEmitter;
    var { parse, serialize } = require_dist();
    var stream = require_stream();
    var { getStream } = stream;
    var flushBuffer = serialize.flush();
    var syncBuffer = serialize.sync();
    var endBuffer = serialize.end();
    var Connection2 = class extends EventEmitter {
      constructor(config) {
        super();
        config = config || {};
        this.stream = config.stream || getStream(config.ssl);
        if (typeof this.stream === "function") {
          this.stream = this.stream(config);
        }
        this._keepAlive = config.keepAlive;
        this._keepAliveInitialDelayMillis = config.keepAliveInitialDelayMillis;
        this.parsedStatements = {};
        this.submittedNamedStatements = {};
        this.ssl = config.ssl || false;
        this.sslNegotiation = config.sslNegotiation || "postgres";
        this._ending = false;
        this._emitMessage = false;
        const self = this;
        this.on("newListener", function(eventName) {
          if (eventName === "message") {
            self._emitMessage = true;
          }
        });
      }
      connect(port, host) {
        const self = this;
        this._connecting = true;
        this.stream.setNoDelay(true);
        this.stream.connect(port, host);
        this.stream.once("connect", function() {
          if (self._keepAlive) {
            self.stream.setKeepAlive(true, self._keepAliveInitialDelayMillis);
          }
          self.emit("connect");
        });
        const reportStreamError = function(error) {
          if (self._ending && (error.code === "ECONNRESET" || error.code === "EPIPE")) {
            return;
          }
          self.emit("error", error);
        };
        this.stream.on("error", reportStreamError);
        this.stream.on("close", function() {
          self.emit("end");
        });
        if (!this.ssl) {
          return this.attachListeners(this.stream);
        }
        if (this.sslNegotiation === "direct") {
          return this.stream.once("connect", function() {
            self.upgradeToSSL(host, reportStreamError);
          });
        }
        this.stream.once("data", function(buffer) {
          const responseCode = buffer.toString("utf8");
          switch (responseCode) {
            case "S":
              break;
            case "N":
              self.stream.end();
              return self.emit("error", new Error("The server does not support SSL connections"));
            default:
              self.stream.end();
              return self.emit("error", new Error("There was an error establishing an SSL connection"));
          }
          self.upgradeToSSL(host, reportStreamError);
        });
      }
      upgradeToSSL(host, reportStreamError) {
        const self = this;
        const options = {
          socket: self.stream
        };
        if (self.ssl !== true) {
          Object.assign(options, self.ssl);
          if ("key" in self.ssl) {
            options.key = self.ssl.key;
          }
        }
        if (self.sslNegotiation === "direct") {
          options.ALPNProtocols = ["postgresql"];
        }
        const net = __require("net");
        if (net.isIP && net.isIP(host) === 0) {
          options.servername = host;
        }
        try {
          self.stream = stream.getSecureStream(options);
        } catch (err) {
          return self.emit("error", err);
        }
        self.attachListeners(self.stream);
        self.stream.on("error", reportStreamError);
        self.emit("sslconnect");
      }
      attachListeners(stream2) {
        parse(stream2, (msg) => {
          const eventName = msg.name === "error" ? "errorMessage" : msg.name;
          if (this._emitMessage) {
            this.emit("message", msg);
          }
          this.emit(eventName, msg);
        });
      }
      requestSsl() {
        this.stream.write(serialize.requestSsl());
      }
      startup(config) {
        this.stream.write(serialize.startup(config));
      }
      cancel(processID, secretKey) {
        this._send(serialize.cancel(processID, secretKey));
      }
      password(password) {
        this._send(serialize.password(password));
      }
      sendSASLInitialResponseMessage(mechanism, initialResponse) {
        this._send(serialize.sendSASLInitialResponseMessage(mechanism, initialResponse));
      }
      sendSCRAMClientFinalMessage(additionalData) {
        this._send(serialize.sendSCRAMClientFinalMessage(additionalData));
      }
      _send(buffer) {
        if (!this.stream.writable) {
          return false;
        }
        return this.stream.write(buffer);
      }
      query(text) {
        this._send(serialize.query(text));
      }
      // send parse message
      parse(query) {
        this._send(serialize.parse(query));
      }
      // send bind message
      bind(config) {
        this._send(serialize.bind(config));
      }
      // send execute message
      execute(config) {
        this._send(serialize.execute(config));
      }
      flush() {
        if (this.stream.writable) {
          this.stream.write(flushBuffer);
        }
      }
      sync() {
        this._ending = true;
        this._send(syncBuffer);
      }
      ref() {
        this.stream.ref();
      }
      unref() {
        this.stream.unref();
      }
      end() {
        this._ending = true;
        if (!this._connecting || !this.stream.writable) {
          this.stream.end();
          return;
        }
        return this.stream.write(endBuffer, () => {
          this.stream.end();
        });
      }
      close(msg) {
        this._send(serialize.close(msg));
      }
      describe(msg) {
        this._send(serialize.describe(msg));
      }
      sendCopyFromChunk(chunk) {
        this._send(serialize.copyData(chunk));
      }
      endCopyFrom() {
        this._send(serialize.copyDone());
      }
      sendCopyFail(msg) {
        this._send(serialize.copyFail(msg));
      }
    };
    module.exports = Connection2;
  }
});

// infrastructure/release-custody/node_modules/split2/index.js
var require_split2 = __commonJS({
  "infrastructure/release-custody/node_modules/split2/index.js"(exports, module) {
    "use strict";
    var { Transform } = __require("stream");
    var { StringDecoder } = __require("string_decoder");
    var kLast = /* @__PURE__ */ Symbol("last");
    var kDecoder = /* @__PURE__ */ Symbol("decoder");
    function transform(chunk, enc, cb) {
      let list;
      if (this.overflow) {
        const buf = this[kDecoder].write(chunk);
        list = buf.split(this.matcher);
        if (list.length === 1) return cb();
        list.shift();
        this.overflow = false;
      } else {
        this[kLast] += this[kDecoder].write(chunk);
        list = this[kLast].split(this.matcher);
      }
      this[kLast] = list.pop();
      for (let i = 0; i < list.length; i++) {
        try {
          push(this, this.mapper(list[i]));
        } catch (error) {
          return cb(error);
        }
      }
      this.overflow = this[kLast].length > this.maxLength;
      if (this.overflow && !this.skipOverflow) {
        cb(new Error("maximum buffer reached"));
        return;
      }
      cb();
    }
    function flush(cb) {
      this[kLast] += this[kDecoder].end();
      if (this[kLast]) {
        try {
          push(this, this.mapper(this[kLast]));
        } catch (error) {
          return cb(error);
        }
      }
      cb();
    }
    function push(self, val) {
      if (val !== void 0) {
        self.push(val);
      }
    }
    function noop(incoming) {
      return incoming;
    }
    function split(matcher, mapper, options) {
      matcher = matcher || /\r?\n/;
      mapper = mapper || noop;
      options = options || {};
      switch (arguments.length) {
        case 1:
          if (typeof matcher === "function") {
            mapper = matcher;
            matcher = /\r?\n/;
          } else if (typeof matcher === "object" && !(matcher instanceof RegExp) && !matcher[Symbol.split]) {
            options = matcher;
            matcher = /\r?\n/;
          }
          break;
        case 2:
          if (typeof matcher === "function") {
            options = mapper;
            mapper = matcher;
            matcher = /\r?\n/;
          } else if (typeof mapper === "object") {
            options = mapper;
            mapper = noop;
          }
      }
      options = Object.assign({}, options);
      options.autoDestroy = true;
      options.transform = transform;
      options.flush = flush;
      options.readableObjectMode = true;
      const stream = new Transform(options);
      stream[kLast] = "";
      stream[kDecoder] = new StringDecoder("utf8");
      stream.matcher = matcher;
      stream.mapper = mapper;
      stream.maxLength = options.maxLength;
      stream.skipOverflow = options.skipOverflow || false;
      stream.overflow = false;
      stream._destroy = function(err, cb) {
        this._writableState.errorEmitted = false;
        cb(err);
      };
      return stream;
    }
    module.exports = split;
  }
});

// infrastructure/release-custody/node_modules/pgpass/lib/helper.js
var require_helper = __commonJS({
  "infrastructure/release-custody/node_modules/pgpass/lib/helper.js"(exports, module) {
    "use strict";
    var path = __require("path");
    var Stream = __require("stream").Stream;
    var split = require_split2();
    var util = __require("util");
    var defaultPort = 5432;
    var isWin = process.platform === "win32";
    var warnStream = process.stderr;
    var S_IRWXG = 56;
    var S_IRWXO = 7;
    var S_IFMT = 61440;
    var S_IFREG = 32768;
    function isRegFile(mode) {
      return (mode & S_IFMT) == S_IFREG;
    }
    var fieldNames = ["host", "port", "database", "user", "password"];
    var nrOfFields = fieldNames.length;
    var passKey = fieldNames[nrOfFields - 1];
    function warn() {
      var isWritable = warnStream instanceof Stream && true === warnStream.writable;
      if (isWritable) {
        var args = Array.prototype.slice.call(arguments).concat("\n");
        warnStream.write(util.format.apply(util, args));
      }
    }
    Object.defineProperty(module.exports, "isWin", {
      get: function() {
        return isWin;
      },
      set: function(val) {
        isWin = val;
      }
    });
    module.exports.warnTo = function(stream) {
      var old = warnStream;
      warnStream = stream;
      return old;
    };
    module.exports.getFileName = function(rawEnv) {
      var env = rawEnv || process.env;
      var file = env.PGPASSFILE || (isWin ? path.join(env.APPDATA || "./", "postgresql", "pgpass.conf") : path.join(env.HOME || "./", ".pgpass"));
      return file;
    };
    module.exports.usePgPass = function(stats, fname) {
      if (Object.prototype.hasOwnProperty.call(process.env, "PGPASSWORD")) {
        return false;
      }
      if (isWin) {
        return true;
      }
      fname = fname || "<unkn>";
      if (!isRegFile(stats.mode)) {
        warn('WARNING: password file "%s" is not a plain file', fname);
        return false;
      }
      if (stats.mode & (S_IRWXG | S_IRWXO)) {
        warn('WARNING: password file "%s" has group or world access; permissions should be u=rw (0600) or less', fname);
        return false;
      }
      return true;
    };
    var matcher = module.exports.match = function(connInfo, entry) {
      return fieldNames.slice(0, -1).reduce(function(prev, field, idx) {
        if (idx == 1) {
          if (Number(connInfo[field] || defaultPort) === Number(entry[field])) {
            return prev && true;
          }
        }
        return prev && (entry[field] === "*" || entry[field] === connInfo[field]);
      }, true);
    };
    module.exports.getPassword = function(connInfo, stream, cb) {
      var pass;
      var lineStream = stream.pipe(split());
      function onLine(line) {
        var entry = parseLine(line);
        if (entry && isValidEntry(entry) && matcher(connInfo, entry)) {
          pass = entry[passKey];
          lineStream.end();
        }
      }
      var onEnd = function() {
        stream.destroy();
        cb(pass);
      };
      var onErr = function(err) {
        stream.destroy();
        warn("WARNING: error on reading file: %s", err);
        cb(void 0);
      };
      stream.on("error", onErr);
      lineStream.on("data", onLine).on("end", onEnd).on("error", onErr);
    };
    var parseLine = module.exports.parseLine = function(line) {
      if (line.length < 11 || line.match(/^\s+#/)) {
        return null;
      }
      var curChar = "";
      var prevChar = "";
      var fieldIdx = 0;
      var startIdx = 0;
      var endIdx = 0;
      var obj = {};
      var isLastField = false;
      var addToObj = function(idx, i0, i1) {
        var field = line.substring(i0, i1);
        if (!Object.hasOwnProperty.call(process.env, "PGPASS_NO_DEESCAPE")) {
          field = field.replace(/\\([:\\])/g, "$1");
        }
        obj[fieldNames[idx]] = field;
      };
      for (var i = 0; i < line.length - 1; i += 1) {
        curChar = line.charAt(i + 1);
        prevChar = line.charAt(i);
        isLastField = fieldIdx == nrOfFields - 1;
        if (isLastField) {
          addToObj(fieldIdx, startIdx);
          break;
        }
        if (i >= 0 && curChar == ":" && prevChar !== "\\") {
          addToObj(fieldIdx, startIdx, i + 1);
          startIdx = i + 2;
          fieldIdx += 1;
        }
      }
      obj = Object.keys(obj).length === nrOfFields ? obj : null;
      return obj;
    };
    var isValidEntry = module.exports.isValidEntry = function(entry) {
      var rules = {
        // host
        0: function(x) {
          return x.length > 0;
        },
        // port
        1: function(x) {
          if (x === "*") {
            return true;
          }
          x = Number(x);
          return isFinite(x) && x > 0 && x < 9007199254740992 && Math.floor(x) === x;
        },
        // database
        2: function(x) {
          return x.length > 0;
        },
        // username
        3: function(x) {
          return x.length > 0;
        },
        // password
        4: function(x) {
          return x.length > 0;
        }
      };
      for (var idx = 0; idx < fieldNames.length; idx += 1) {
        var rule = rules[idx];
        var value = entry[fieldNames[idx]] || "";
        var res = rule(value);
        if (!res) {
          return false;
        }
      }
      return true;
    };
  }
});

// infrastructure/release-custody/node_modules/pgpass/lib/index.js
var require_lib = __commonJS({
  "infrastructure/release-custody/node_modules/pgpass/lib/index.js"(exports, module) {
    "use strict";
    var path = __require("path");
    var fs = __require("fs");
    var helper = require_helper();
    module.exports = function(connInfo, cb) {
      var file = helper.getFileName();
      fs.stat(file, function(err, stat) {
        if (err || !helper.usePgPass(stat, file)) {
          return cb(void 0);
        }
        var st = fs.createReadStream(file);
        helper.getPassword(connInfo, st, cb);
      });
    };
    module.exports.warnTo = helper.warnTo;
  }
});

// infrastructure/release-custody/node_modules/pg/lib/client.js
var require_client = __commonJS({
  "infrastructure/release-custody/node_modules/pg/lib/client.js"(exports, module) {
    var EventEmitter = __require("events").EventEmitter;
    var utils = require_utils();
    var nodeUtils = __require("util");
    var sasl = require_sasl();
    var TypeOverrides2 = require_type_overrides();
    var ConnectionParameters = require_connection_parameters();
    var Query2 = require_query();
    var defaults2 = require_defaults();
    var Connection2 = require_connection();
    var crypto = require_utils2();
    var activeQueryDeprecationNotice = nodeUtils.deprecate(
      () => {
      },
      "Client.activeQuery is deprecated and will be removed in pg@9.0"
    );
    var queryQueueDeprecationNotice = nodeUtils.deprecate(
      () => {
      },
      "Client.queryQueue is deprecated and will be removed in pg@9.0."
    );
    var pgPassDeprecationNotice = nodeUtils.deprecate(
      () => {
      },
      "pgpass support is deprecated and will be removed in pg@9.0. You can provide an async function as the password property to the Client/Pool constructor that returns a password instead. Within this function you can call the pgpass module in your own code."
    );
    var byoPromiseDeprecationNotice = nodeUtils.deprecate(
      () => {
      },
      "Passing a custom Promise implementation to the Client/Pool constructor is deprecated and will be removed in pg@9.0."
    );
    var queryQueueLengthDeprecationNotice = nodeUtils.deprecate(
      () => {
      },
      "Calling client.query() when the client is already executing a query is deprecated and will be removed in pg@9.0. Use async/await or an external async flow control mechanism instead."
    );
    function coerceNumberOrDefault(value, defaultValue) {
      if (typeof value === "number") {
        return Number.isFinite(value) ? value : defaultValue;
      }
      if (typeof value === "string" && value.trim() !== "") {
        const n = Number(value);
        return Number.isFinite(n) ? n : defaultValue;
      }
      return defaultValue;
    }
    var Client2 = class extends EventEmitter {
      constructor(config) {
        super();
        this.connectionParameters = new ConnectionParameters(config);
        this.user = this.connectionParameters.user;
        this.database = this.connectionParameters.database;
        this.port = this.connectionParameters.port;
        this.host = this.connectionParameters.host;
        Object.defineProperty(this, "password", {
          configurable: true,
          enumerable: false,
          writable: true,
          value: this.connectionParameters.password
        });
        this.replication = this.connectionParameters.replication;
        const c = config || {};
        if (c.Promise) {
          byoPromiseDeprecationNotice();
        }
        this._Promise = c.Promise || global.Promise;
        this._types = new TypeOverrides2(c.types);
        this._ending = false;
        this._ended = false;
        this._connecting = false;
        this._connected = false;
        this._connectionError = false;
        this._queryable = true;
        this._activeQuery = null;
        this._txStatus = null;
        this.enableChannelBinding = Boolean(c.enableChannelBinding);
        this.scramMaxIterations = coerceNumberOrDefault(c.scramMaxIterations, sasl.DEFAULT_MAX_SCRAM_ITERATIONS);
        this.connection = c.connection || new Connection2({
          stream: c.stream,
          ssl: this.connectionParameters.ssl,
          sslNegotiation: this.connectionParameters.sslnegotiation,
          keepAlive: c.keepAlive || false,
          keepAliveInitialDelayMillis: c.keepAliveInitialDelayMillis || 0,
          encoding: this.connectionParameters.client_encoding || "utf8"
        });
        this._queryQueue = [];
        this._sentQueryQueue = [];
        this.pipeline = Boolean(c.pipeline);
        this.binary = c.binary || defaults2.binary;
        this.processID = null;
        this.secretKey = null;
        this.ssl = this.connectionParameters.ssl || false;
        this.sslNegotiation = this.connectionParameters.sslnegotiation || "postgres";
        if (this.ssl && this.ssl.key) {
          Object.defineProperty(this.ssl, "key", {
            enumerable: false
          });
        }
        this._connectionTimeoutMillis = c.connectionTimeoutMillis || 0;
      }
      get activeQuery() {
        activeQueryDeprecationNotice();
        return this._activeQuery;
      }
      set activeQuery(val) {
        activeQueryDeprecationNotice();
        this._activeQuery = val;
      }
      _getActiveQuery() {
        return this._activeQuery;
      }
      _errorAllQueries(err) {
        const enqueueError = (query) => {
          process.nextTick(() => {
            query.handleError(err, this.connection);
          });
        };
        const activeQuery = this._getActiveQuery();
        if (activeQuery) {
          enqueueError(activeQuery);
          this._activeQuery = null;
        }
        this._sentQueryQueue.forEach(enqueueError);
        this._sentQueryQueue.length = 0;
        this._queryQueue.forEach(enqueueError);
        this._queryQueue.length = 0;
      }
      _connect(callback) {
        const self = this;
        const con = this.connection;
        this._connectionCallback = callback;
        if (this._connecting || this._connected) {
          const err = new Error("Client has already been connected. You cannot reuse a client.");
          process.nextTick(() => {
            callback(err);
          });
          return;
        }
        this._connecting = true;
        if (this._connectionTimeoutMillis > 0) {
          this.connectionTimeoutHandle = setTimeout(() => {
            con._ending = true;
            con.stream.destroy(new Error("timeout expired"));
          }, this._connectionTimeoutMillis);
          if (this.connectionTimeoutHandle.unref) {
            this.connectionTimeoutHandle.unref();
          }
        }
        if (this.host && this.host.indexOf("/") === 0) {
          con.connect(this.host + "/.s.PGSQL." + this.port);
        } else {
          con.connect(this.port, this.host);
        }
        con.on("connect", function() {
          if (self.ssl) {
            if (self.sslNegotiation !== "direct") {
              con.requestSsl();
            }
          } else {
            con.startup(self.getStartupConf());
          }
        });
        con.on("sslconnect", function() {
          con.startup(self.getStartupConf());
        });
        this._attachListeners(con);
        con.once("end", () => {
          const error = this._ending ? new Error("Connection terminated") : new Error("Connection terminated unexpectedly");
          clearTimeout(this.connectionTimeoutHandle);
          this._errorAllQueries(error);
          this._ended = true;
          if (!this._ending) {
            if (this._connecting && !this._connectionError) {
              if (this._connectionCallback) {
                this._connectionCallback(error);
              } else {
                this._handleErrorEvent(error);
              }
            } else if (!this._connectionError) {
              this._handleErrorEvent(error);
            }
          }
          process.nextTick(() => {
            this.emit("end");
          });
        });
      }
      connect(callback) {
        if (callback) {
          this._connect(callback);
          return;
        }
        return new this._Promise((resolve, reject) => {
          this._connect((error) => {
            if (error) {
              reject(error);
            } else {
              resolve(this);
            }
          });
        });
      }
      _attachListeners(con) {
        con.on("authenticationCleartextPassword", this._handleAuthCleartextPassword.bind(this));
        con.on("authenticationMD5Password", this._handleAuthMD5Password.bind(this));
        con.on("authenticationSASL", this._handleAuthSASL.bind(this));
        con.on("authenticationSASLContinue", this._handleAuthSASLContinue.bind(this));
        con.on("authenticationSASLFinal", this._handleAuthSASLFinal.bind(this));
        con.on("backendKeyData", this._handleBackendKeyData.bind(this));
        con.on("error", this._handleErrorEvent.bind(this));
        con.on("errorMessage", this._handleErrorMessage.bind(this));
        con.on("readyForQuery", this._handleReadyForQuery.bind(this));
        con.on("notice", this._handleNotice.bind(this));
        con.on("rowDescription", this._handleRowDescription.bind(this));
        con.on("dataRow", this._handleDataRow.bind(this));
        con.on("portalSuspended", this._handlePortalSuspended.bind(this));
        con.on("emptyQuery", this._handleEmptyQuery.bind(this));
        con.on("commandComplete", this._handleCommandComplete.bind(this));
        con.on("parseComplete", this._handleParseComplete.bind(this));
        con.on("copyInResponse", this._handleCopyInResponse.bind(this));
        con.on("copyData", this._handleCopyData.bind(this));
        con.on("notification", this._handleNotification.bind(this));
      }
      _getPassword(cb) {
        const con = this.connection;
        if (typeof this.password === "function") {
          this._Promise.resolve().then(() => this.password(this.connectionParameters)).then((pass) => {
            if (pass !== void 0) {
              if (typeof pass !== "string") {
                con.emit("error", new TypeError("Password must be a string"));
                return;
              }
              this.connectionParameters.password = this.password = pass;
            } else {
              this.connectionParameters.password = this.password = null;
            }
            cb();
          }).catch((err) => {
            con.emit("error", err);
          });
        } else if (this.password !== null) {
          cb();
        } else {
          try {
            const pgPass = require_lib();
            pgPass(this.connectionParameters, (pass) => {
              if (void 0 !== pass) {
                pgPassDeprecationNotice();
                this.connectionParameters.password = this.password = pass;
              }
              cb();
            });
          } catch (e) {
            this.emit("error", e);
          }
        }
      }
      _handleAuthCleartextPassword(msg) {
        this._getPassword(() => {
          this.connection.password(this.password);
        });
      }
      _handleAuthMD5Password(msg) {
        this._getPassword(async () => {
          try {
            const hashedPassword = await crypto.postgresMd5PasswordHash(this.user, this.password, msg.salt);
            this.connection.password(hashedPassword);
          } catch (e) {
            this.emit("error", e);
          }
        });
      }
      _handleAuthSASL(msg) {
        this._getPassword(() => {
          try {
            this.saslSession = sasl.startSession(
              msg.mechanisms,
              this.enableChannelBinding && this.connection.stream,
              this.scramMaxIterations
            );
            this.connection.sendSASLInitialResponseMessage(this.saslSession.mechanism, this.saslSession.response);
          } catch (err) {
            this.connection.emit("error", err);
          }
        });
      }
      async _handleAuthSASLContinue(msg) {
        try {
          await sasl.continueSession(
            this.saslSession,
            this.password,
            msg.data,
            this.enableChannelBinding && this.connection.stream
          );
          this.connection.sendSCRAMClientFinalMessage(this.saslSession.response);
        } catch (err) {
          this.connection.emit("error", err);
        }
      }
      _handleAuthSASLFinal(msg) {
        try {
          sasl.finalizeSession(this.saslSession, msg.data);
          this.saslSession = null;
        } catch (err) {
          this.connection.emit("error", err);
        }
      }
      _handleBackendKeyData(msg) {
        this.processID = msg.processID;
        this.secretKey = msg.secretKey;
      }
      _handleReadyForQuery(msg) {
        if (this._connecting) {
          this._connecting = false;
          this._connected = true;
          clearTimeout(this.connectionTimeoutHandle);
          if (this._connectionCallback) {
            this._connectionCallback(null, this);
            this._connectionCallback = null;
          }
          this.emit("connect");
        }
        const activeQuery = this._getActiveQuery();
        this._activeQuery = null;
        this._txStatus = msg?.status ?? null;
        this.readyForQuery = true;
        if (activeQuery) {
          activeQuery.handleReadyForQuery(this.connection);
        }
        this._pulseQueryQueue();
      }
      // if we receive an error event or error message
      // during the connection process we handle it here
      _handleErrorWhileConnecting(err) {
        if (this._connectionError) {
          return;
        }
        this._connectionError = true;
        clearTimeout(this.connectionTimeoutHandle);
        if (this._connectionCallback) {
          return this._connectionCallback(err);
        }
        this.emit("error", err);
      }
      // if we're connected and we receive an error event from the connection
      // this means the socket is dead - do a hard abort of all queries and emit
      // the socket error on the client as well
      _handleErrorEvent(err) {
        if (this._connecting) {
          return this._handleErrorWhileConnecting(err);
        }
        this._queryable = false;
        this._errorAllQueries(err);
        this.emit("error", err);
      }
      // handle error messages from the postgres backend
      _handleErrorMessage(msg) {
        if (this._connecting) {
          return this._handleErrorWhileConnecting(msg);
        }
        const activeQuery = this._getActiveQuery();
        if (!activeQuery) {
          this._handleErrorEvent(msg);
          return;
        }
        this._activeQuery = null;
        if (activeQuery.name) {
          delete this.connection.submittedNamedStatements[activeQuery.name];
        }
        activeQuery.handleError(msg, this.connection);
      }
      _handleRowDescription(msg) {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected rowDescription message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        activeQuery.handleRowDescription(msg);
      }
      _handleDataRow(msg) {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected dataRow message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        activeQuery.handleDataRow(msg);
      }
      _handlePortalSuspended(msg) {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected portalSuspended message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        activeQuery.handlePortalSuspended(this.connection);
      }
      _handleEmptyQuery(msg) {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected emptyQuery message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        activeQuery.handleEmptyQuery(this.connection);
      }
      _handleCommandComplete(msg) {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected commandComplete message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        activeQuery.handleCommandComplete(msg, this.connection);
      }
      _handleParseComplete() {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected parseComplete message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        if (activeQuery.name) {
          this.connection.parsedStatements[activeQuery.name] = activeQuery.text;
          delete this.connection.submittedNamedStatements[activeQuery.name];
        }
      }
      _handleCopyInResponse(msg) {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected copyInResponse message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        activeQuery.handleCopyInResponse(this.connection);
      }
      _handleCopyData(msg) {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected copyData message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        activeQuery.handleCopyData(msg, this.connection);
      }
      _handleNotification(msg) {
        this.emit("notification", msg);
      }
      _handleNotice(msg) {
        this.emit("notice", msg);
      }
      getStartupConf() {
        const params = this.connectionParameters;
        const data = {
          user: params.user,
          database: params.database
        };
        const appName = params.application_name || params.fallback_application_name;
        if (appName) {
          data.application_name = appName;
        }
        if (params.replication) {
          data.replication = "" + params.replication;
        }
        if (params.statement_timeout) {
          data.statement_timeout = String(parseInt(params.statement_timeout, 10));
        }
        if (params.lock_timeout) {
          data.lock_timeout = String(parseInt(params.lock_timeout, 10));
        }
        if (params.idle_in_transaction_session_timeout) {
          data.idle_in_transaction_session_timeout = String(parseInt(params.idle_in_transaction_session_timeout, 10));
        }
        if (params.options) {
          data.options = params.options;
        }
        return data;
      }
      cancel(client, query) {
        if (client.activeQuery === query) {
          const con = this.connection;
          if (this.host && this.host.indexOf("/") === 0) {
            con.connect(this.host + "/.s.PGSQL." + this.port);
          } else {
            con.connect(this.port, this.host);
          }
          con.on("connect", function() {
            con.cancel(client.processID, client.secretKey);
          });
        } else if (client._queryQueue.indexOf(query) !== -1) {
          client._queryQueue.splice(client._queryQueue.indexOf(query), 1);
        } else if (client._sentQueryQueue.indexOf(query) !== -1) {
          query.callback = () => {
          };
        }
      }
      setTypeParser(oid3, format, parseFn) {
        return this._types.setTypeParser(oid3, format, parseFn);
      }
      getTypeParser(oid3, format) {
        return this._types.getTypeParser(oid3, format);
      }
      // escapeIdentifier and escapeLiteral moved to utility functions & exported
      // on PG
      // re-exported here for backwards compatibility
      escapeIdentifier(str) {
        return utils.escapeIdentifier(str);
      }
      escapeLiteral(str) {
        return utils.escapeLiteral(str);
      }
      _pulseQueryQueue() {
        if (this.pipeline) {
          this._pulsePipelinedQueryQueue();
          return;
        }
        if (this.readyForQuery === true) {
          this._activeQuery = this._queryQueue.shift();
          const activeQuery = this._getActiveQuery();
          if (activeQuery) {
            this.readyForQuery = false;
            this.hasExecuted = true;
            const queryError = activeQuery.submit(this.connection);
            if (queryError) {
              process.nextTick(() => {
                activeQuery.handleError(queryError, this.connection);
                this.readyForQuery = true;
                this._pulseQueryQueue();
              });
            }
          } else if (this.hasExecuted) {
            this._activeQuery = null;
            this.emit("drain");
          }
        }
      }
      _pulsePipelinedQueryQueue() {
        if (!this._connected || !this._queryable) {
          return;
        }
        while (this._queryQueue.length > 0) {
          const query = this._queryQueue.shift();
          this.hasExecuted = true;
          const queryError = query.submit(this.connection);
          if (queryError) {
            process.nextTick(() => {
              query.handleError(queryError, this.connection);
            });
            continue;
          }
          this._sentQueryQueue.push(query);
        }
        if (this.readyForQuery && !this._activeQuery && this._sentQueryQueue.length > 0) {
          this._activeQuery = this._sentQueryQueue.shift();
          this.readyForQuery = false;
        }
        if (!this._activeQuery && this._sentQueryQueue.length === 0 && this._queryQueue.length === 0 && this.hasExecuted) {
          this.emit("drain");
        }
      }
      query(config, values, callback) {
        let query;
        let result;
        if (config == null) {
          throw new TypeError("Client was passed a null or undefined query");
        }
        if (typeof config.submit === "function") {
          result = query = config;
          if (!query.callback) {
            if (typeof values === "function") {
              query.callback = values;
            } else if (callback) {
              query.callback = callback;
            }
          }
        } else {
          query = new Query2(config, values, callback);
          if (!query.callback) {
            result = new this._Promise((resolve, reject) => {
              query.callback = (err, res) => err ? reject(err) : resolve(res);
            }).catch((err) => {
              Error.captureStackTrace(err);
              throw err;
            });
          } else if (typeof query.callback !== "function") {
            throw new TypeError("callback is not a function");
          }
        }
        const readTimeout = config.query_timeout || this.connectionParameters.query_timeout;
        if (readTimeout) {
          const queryCallback = query.callback || (() => {
          });
          const readTimeoutTimer = setTimeout(() => {
            const error = new Error("Query read timeout");
            process.nextTick(() => {
              query.handleError(error, this.connection);
            });
            queryCallback(error);
            query.callback = () => {
            };
            const index = this._queryQueue.indexOf(query);
            if (index > -1) {
              this._queryQueue.splice(index, 1);
            } else if (this.pipeline) {
              this.connection.stream.destroy();
              return;
            }
            this._pulseQueryQueue();
          }, readTimeout);
          query.callback = (err, res) => {
            clearTimeout(readTimeoutTimer);
            queryCallback(err, res);
          };
        }
        if (this.binary && !query.binary) {
          query.binary = true;
        }
        if (query._result && !query._result._types) {
          query._result._types = this._types;
        }
        if (!this._queryable) {
          process.nextTick(() => {
            query.handleError(new Error("Client has encountered a connection error and is not queryable"), this.connection);
          });
          return result;
        }
        if (this._ending) {
          process.nextTick(() => {
            query.handleError(new Error("Client was closed and is not queryable"), this.connection);
          });
          return result;
        }
        if (this._queryQueue.length > 0 && !this.pipeline) {
          queryQueueLengthDeprecationNotice();
        }
        this._queryQueue.push(query);
        this._pulseQueryQueue();
        return result;
      }
      ref() {
        this.connection.ref();
      }
      unref() {
        this.connection.unref();
      }
      getTransactionStatus() {
        return this._txStatus;
      }
      end(cb) {
        this._ending = true;
        if (!this.connection._connecting || this._ended) {
          if (cb) {
            cb();
            return;
          } else {
            return this._Promise.resolve();
          }
        }
        if (!this._queryable) {
          this.connection.stream.destroy();
        } else if (this.pipeline && (this._getActiveQuery() || this._sentQueryQueue.length > 0 || this._queryQueue.length > 0)) {
          this.once("drain", () => this.connection.end());
        } else if (this._getActiveQuery()) {
          this.connection.stream.destroy();
        } else {
          this.connection.end();
        }
        if (cb) {
          this.connection.once("end", cb);
        } else {
          return new this._Promise((resolve) => {
            this.connection.once("end", resolve);
          });
        }
      }
      get queryQueue() {
        queryQueueDeprecationNotice();
        return this._queryQueue;
      }
    };
    Client2.Query = Query2;
    module.exports = Client2;
  }
});

// infrastructure/release-custody/node_modules/pg-pool/index.js
var require_pg_pool = __commonJS({
  "infrastructure/release-custody/node_modules/pg-pool/index.js"(exports, module) {
    "use strict";
    var EventEmitter = __require("events").EventEmitter;
    var NOOP = function() {
    };
    var removeWhere = (list, predicate) => {
      const i = list.findIndex(predicate);
      return i === -1 ? void 0 : list.splice(i, 1)[0];
    };
    var IdleItem = class {
      constructor(client, idleListener, timeoutId) {
        this.client = client;
        this.idleListener = idleListener;
        this.timeoutId = timeoutId;
      }
    };
    var PendingItem = class {
      constructor(callback) {
        this.callback = callback;
      }
    };
    function throwOnDoubleRelease() {
      throw new Error("Release called on client which has already been released to the pool.");
    }
    function promisify3(Promise2, callback) {
      if (callback) {
        return { callback, result: void 0 };
      }
      let rej;
      let res;
      const cb = function(err, client) {
        err ? rej(err) : res(client);
      };
      const result = new Promise2(function(resolve, reject) {
        res = resolve;
        rej = reject;
      }).catch((err) => {
        Error.captureStackTrace(err);
        throw err;
      });
      return { callback: cb, result };
    }
    function makeIdleListener(pool, client) {
      return function idleListener(err) {
        err.client = client;
        client.removeListener("error", idleListener);
        client.on("error", () => {
          pool.log("additional client error after disconnection due to error", err);
        });
        pool._remove(client);
        pool.emit("error", err, client);
      };
    }
    var Pool2 = class extends EventEmitter {
      constructor(options, Client2) {
        super();
        this.options = Object.assign({}, options);
        if (options != null && "password" in options) {
          Object.defineProperty(this.options, "password", {
            configurable: true,
            enumerable: false,
            writable: true,
            value: options.password
          });
        }
        if (options != null && options.ssl && options.ssl.key) {
          Object.defineProperty(this.options.ssl, "key", {
            enumerable: false
          });
        }
        this.options.max = this.options.max || this.options.poolSize || 10;
        this.options.min = this.options.min || 0;
        this.options.maxUses = this.options.maxUses || Infinity;
        this.options.allowExitOnIdle = this.options.allowExitOnIdle || false;
        this.options.maxLifetimeSeconds = this.options.maxLifetimeSeconds || 0;
        this.log = this.options.log || function() {
        };
        this.Client = this.options.Client || Client2 || require_lib2().Client;
        this.Promise = this.options.Promise || global.Promise;
        if (typeof this.options.idleTimeoutMillis === "undefined") {
          this.options.idleTimeoutMillis = 1e4;
        }
        this._clients = [];
        this._idle = [];
        this._expired = /* @__PURE__ */ new WeakSet();
        this._pendingQueue = [];
        this._endCallback = void 0;
        this.ending = false;
        this.ended = false;
      }
      _promiseTry(f) {
        const Promise2 = this.Promise;
        if (typeof Promise2.try === "function") {
          return Promise2.try(f);
        }
        return new Promise2((resolve) => resolve(f()));
      }
      _isFull() {
        return this._clients.length >= this.options.max;
      }
      _isAboveMin() {
        return this._clients.length > this.options.min;
      }
      _pulseQueue() {
        this.log("pulse queue");
        if (this.ended) {
          this.log("pulse queue ended");
          return;
        }
        if (this.ending) {
          this.log("pulse queue on ending");
          if (this._idle.length) {
            this._idle.slice().map((item) => {
              this._remove(item.client);
            });
          }
          if (!this._clients.length) {
            this.ended = true;
            this._endCallback();
          }
          return;
        }
        if (!this._pendingQueue.length) {
          this.log("no queued requests");
          return;
        }
        if (!this._idle.length && this._isFull()) {
          return;
        }
        const pendingItem = this._pendingQueue.shift();
        if (this._idle.length) {
          const idleItem = this._idle.pop();
          clearTimeout(idleItem.timeoutId);
          const client = idleItem.client;
          client.ref && client.ref();
          const idleListener = idleItem.idleListener;
          return this._acquireClient(client, pendingItem, idleListener, false);
        }
        if (!this._isFull()) {
          return this.newClient(pendingItem);
        }
        throw new Error("unexpected condition");
      }
      _remove(client, callback) {
        const removed = removeWhere(this._idle, (item) => item.client === client);
        if (removed !== void 0) {
          clearTimeout(removed.timeoutId);
        }
        this._clients = this._clients.filter((c) => c !== client);
        const context = this;
        client.end(() => {
          context.emit("remove", client);
          if (typeof callback === "function") {
            callback();
          }
        });
      }
      connect(cb) {
        if (this.ending) {
          const err = new Error("Cannot use a pool after calling end on the pool");
          return cb ? cb(err) : this.Promise.reject(err);
        }
        const response = promisify3(this.Promise, cb);
        const result = response.result;
        if (this._isFull() || this._idle.length) {
          if (this._idle.length) {
            process.nextTick(() => this._pulseQueue());
          }
          if (!this.options.connectionTimeoutMillis) {
            this._pendingQueue.push(new PendingItem(response.callback));
            return result;
          }
          const queueCallback = (err, res, done) => {
            clearTimeout(tid);
            response.callback(err, res, done);
          };
          const pendingItem = new PendingItem(queueCallback);
          const tid = setTimeout(() => {
            removeWhere(this._pendingQueue, (i) => i.callback === queueCallback);
            pendingItem.timedOut = true;
            response.callback(new Error("timeout exceeded when trying to connect"));
          }, this.options.connectionTimeoutMillis);
          if (tid.unref) {
            tid.unref();
          }
          this._pendingQueue.push(pendingItem);
          return result;
        }
        this.newClient(new PendingItem(response.callback));
        return result;
      }
      newClient(pendingItem) {
        const client = new this.Client(this.options);
        this._clients.push(client);
        const idleListener = makeIdleListener(this, client);
        this.log("checking client timeout");
        let tid;
        let timeoutHit = false;
        if (this.options.connectionTimeoutMillis) {
          tid = setTimeout(() => {
            if (client.connection) {
              this.log("ending client due to timeout");
              timeoutHit = true;
              client.connection.stream.destroy();
            } else if (!client.isConnected()) {
              this.log("ending client due to timeout");
              timeoutHit = true;
              client.end();
            }
          }, this.options.connectionTimeoutMillis);
        }
        this.log("connecting new client");
        client.connect((err) => {
          if (tid) {
            clearTimeout(tid);
          }
          client.on("error", idleListener);
          if (err) {
            this.log("client failed to connect", err);
            this._clients = this._clients.filter((c) => c !== client);
            if (timeoutHit) {
              err = new Error("Connection terminated due to connection timeout", { cause: err });
            }
            this._pulseQueue();
            if (!pendingItem.timedOut) {
              pendingItem.callback(err, void 0, NOOP);
            }
          } else {
            this.log("new client connected");
            if (this.options.onConnect) {
              this._promiseTry(() => this.options.onConnect(client)).then(
                () => {
                  this._afterConnect(client, pendingItem, idleListener);
                },
                (hookErr) => {
                  this._clients = this._clients.filter((c) => c !== client);
                  client.end(() => {
                    this._pulseQueue();
                    if (!pendingItem.timedOut) {
                      pendingItem.callback(hookErr, void 0, NOOP);
                    }
                  });
                }
              );
              return;
            }
            return this._afterConnect(client, pendingItem, idleListener);
          }
        });
      }
      _afterConnect(client, pendingItem, idleListener) {
        if (this.options.maxLifetimeSeconds !== 0) {
          const maxLifetimeTimeout = setTimeout(() => {
            this.log("ending client due to expired lifetime");
            this._expired.add(client);
            const idleIndex = this._idle.findIndex((idleItem) => idleItem.client === client);
            if (idleIndex !== -1) {
              this._acquireClient(
                client,
                new PendingItem((err, client2, clientRelease) => clientRelease()),
                idleListener,
                false
              );
            }
          }, this.options.maxLifetimeSeconds * 1e3);
          maxLifetimeTimeout.unref();
          client.once("end", () => clearTimeout(maxLifetimeTimeout));
        }
        return this._acquireClient(client, pendingItem, idleListener, true);
      }
      // acquire a client for a pending work item
      _acquireClient(client, pendingItem, idleListener, isNew) {
        if (isNew) {
          this.emit("connect", client);
        }
        this.emit("acquire", client);
        client.release = this._releaseOnce(client, idleListener);
        client.removeListener("error", idleListener);
        if (!pendingItem.timedOut) {
          if (isNew && this.options.verify) {
            this.options.verify(client, (err) => {
              if (err) {
                client.release(err);
                return pendingItem.callback(err, void 0, NOOP);
              }
              pendingItem.callback(void 0, client, client.release);
            });
          } else {
            pendingItem.callback(void 0, client, client.release);
          }
        } else {
          if (isNew && this.options.verify) {
            this.options.verify(client, client.release);
          } else {
            client.release();
          }
        }
      }
      // returns a function that wraps _release and throws if called more than once
      _releaseOnce(client, idleListener) {
        let released = false;
        return (err) => {
          if (released) {
            throwOnDoubleRelease();
          }
          released = true;
          this._release(client, idleListener, err);
        };
      }
      // release a client back to the poll, include an error
      // to remove it from the pool
      _release(client, idleListener, err) {
        client.on("error", idleListener);
        client._poolUseCount = (client._poolUseCount || 0) + 1;
        this.emit("release", err, client);
        if (err || this.ending || !client._queryable || client._ending || client._poolUseCount >= this.options.maxUses) {
          if (client._poolUseCount >= this.options.maxUses) {
            this.log("remove expended client");
          }
          return this._remove(client, this._pulseQueue.bind(this));
        }
        const isExpired = this._expired.has(client);
        if (isExpired) {
          this.log("remove expired client");
          this._expired.delete(client);
          return this._remove(client, this._pulseQueue.bind(this));
        }
        let tid;
        if (this.options.idleTimeoutMillis && this._isAboveMin()) {
          tid = setTimeout(() => {
            if (this._isAboveMin()) {
              this.log("remove idle client");
              this._remove(client, this._pulseQueue.bind(this));
            }
          }, this.options.idleTimeoutMillis);
          if (this.options.allowExitOnIdle) {
            tid.unref();
          }
        }
        if (this.options.allowExitOnIdle) {
          client.unref();
        }
        this._idle.push(new IdleItem(client, idleListener, tid));
        this._pulseQueue();
      }
      query(text, values, cb) {
        if (typeof text === "function") {
          const response2 = promisify3(this.Promise, text);
          setImmediate(function() {
            return response2.callback(new Error("Passing a function as the first parameter to pool.query is not supported"));
          });
          return response2.result;
        }
        if (typeof values === "function") {
          cb = values;
          values = void 0;
        }
        const response = promisify3(this.Promise, cb);
        cb = response.callback;
        this.connect((err, client) => {
          if (err) {
            return cb(err);
          }
          let clientReleased = false;
          const onError = (err2) => {
            if (clientReleased) {
              return;
            }
            clientReleased = true;
            client.release(err2);
            cb(err2);
          };
          client.once("error", onError);
          this.log("dispatching query");
          try {
            client.query(text, values, (err2, res) => {
              this.log("query dispatched");
              client.removeListener("error", onError);
              if (clientReleased) {
                return;
              }
              clientReleased = true;
              client.release(err2);
              if (err2) {
                return cb(err2);
              }
              return cb(void 0, res);
            });
          } catch (err2) {
            client.release(err2);
            return cb(err2);
          }
        });
        return response.result;
      }
      end(cb) {
        this.log("ending");
        if (this.ending) {
          const err = new Error("Called end on pool more than once");
          return cb ? cb(err) : this.Promise.reject(err);
        }
        this.ending = true;
        const promised = promisify3(this.Promise, cb);
        this._endCallback = promised.callback;
        this._pulseQueue();
        return promised.result;
      }
      get waitingCount() {
        return this._pendingQueue.length;
      }
      get idleCount() {
        return this._idle.length;
      }
      get expiredCount() {
        return this._clients.reduce((acc, client) => acc + (this._expired.has(client) ? 1 : 0), 0);
      }
      get totalCount() {
        return this._clients.length;
      }
    };
    module.exports = Pool2;
  }
});

// infrastructure/release-custody/node_modules/pg/lib/native/query.js
var require_query2 = __commonJS({
  "infrastructure/release-custody/node_modules/pg/lib/native/query.js"(exports, module) {
    "use strict";
    var EventEmitter = __require("events").EventEmitter;
    var util = __require("util");
    var utils = require_utils();
    var NativeQuery = module.exports = function(config, values, callback) {
      EventEmitter.call(this);
      config = utils.normalizeQueryConfig(config, values, callback);
      this.text = config.text;
      this.values = config.values;
      this.name = config.name;
      this.queryMode = config.queryMode;
      this.callback = config.callback;
      this.state = "new";
      this._arrayMode = config.rowMode === "array";
      this._emitRowEvents = false;
      this.on(
        "newListener",
        function(event) {
          if (event === "row") this._emitRowEvents = true;
        }.bind(this)
      );
    };
    util.inherits(NativeQuery, EventEmitter);
    var errorFieldMap = {
      sqlState: "code",
      statementPosition: "position",
      messagePrimary: "message",
      context: "where",
      schemaName: "schema",
      tableName: "table",
      columnName: "column",
      dataTypeName: "dataType",
      constraintName: "constraint",
      sourceFile: "file",
      sourceLine: "line",
      sourceFunction: "routine"
    };
    NativeQuery.prototype.handleError = function(err) {
      const fields2 = this.native && this.native.pq.resultErrorFields();
      if (fields2) {
        for (const key in fields2) {
          const normalizedFieldName = errorFieldMap[key] || key;
          err[normalizedFieldName] = fields2[key];
        }
      }
      if (this.callback) {
        this.callback(err);
      } else {
        this.emit("error", err);
      }
      this.state = "error";
    };
    NativeQuery.prototype.then = function(onSuccess, onFailure) {
      return this._getPromise().then(onSuccess, onFailure);
    };
    NativeQuery.prototype.catch = function(callback) {
      return this._getPromise().catch(callback);
    };
    NativeQuery.prototype._getPromise = function() {
      if (this._promise) return this._promise;
      this._promise = new Promise(
        function(resolve, reject) {
          this._once("end", resolve);
          this._once("error", reject);
        }.bind(this)
      );
      return this._promise;
    };
    NativeQuery.prototype.submit = function(client) {
      this.state = "running";
      const self = this;
      this.native = client.native;
      client.native.arrayMode = this._arrayMode;
      let after = function(err, rows, results) {
        client.native.arrayMode = false;
        setImmediate(function() {
          self.emit("_done");
        });
        if (err) {
          return self.handleError(err);
        }
        if (self._emitRowEvents) {
          if (results.length > 1) {
            rows.forEach((rowOfRows, i) => {
              rowOfRows.forEach((row) => {
                self.emit("row", row, results[i]);
              });
            });
          } else {
            rows.forEach(function(row) {
              self.emit("row", row, results);
            });
          }
        }
        self.state = "end";
        self.emit("end", results);
        if (self.callback) {
          self.callback(null, results);
        }
      };
      if (process.domain) {
        after = process.domain.bind(after);
      }
      if (this.name) {
        if (this.name.length > 63) {
          console.error("Warning! Postgres only supports 63 characters for query names.");
          console.error("You supplied %s (%s)", this.name, this.name.length);
          console.error("This can cause conflicts and silent errors executing queries");
        }
        const values = (this.values || []).map(utils.prepareValue);
        if (client.namedQueries[this.name]) {
          if (this.text && client.namedQueries[this.name] !== this.text) {
            const err = new Error(`Prepared statements must be unique - '${this.name}' was used for a different statement`);
            return after(err);
          }
          return client.native.execute(this.name, values, after);
        }
        return client.native.prepare(this.name, this.text, values.length, function(err) {
          if (err) return after(err);
          client.namedQueries[self.name] = self.text;
          return self.native.execute(self.name, values, after);
        });
      } else if (this.values) {
        if (!Array.isArray(this.values)) {
          const err = new Error("Query values must be an array");
          return after(err);
        }
        const vals = this.values.map(utils.prepareValue);
        client.native.query(this.text, vals, after);
      } else if (this.queryMode === "extended") {
        client.native.query(this.text, [], after);
      } else {
        client.native.query(this.text, after);
      }
    };
  }
});

// infrastructure/release-custody/node_modules/pg/lib/native/client.js
var require_client2 = __commonJS({
  "infrastructure/release-custody/node_modules/pg/lib/native/client.js"(exports, module) {
    var nodeUtils = __require("util");
    var Native;
    try {
      Native = __require("pg-native");
    } catch (e) {
      throw e;
    }
    var TypeOverrides2 = require_type_overrides();
    var EventEmitter = __require("events").EventEmitter;
    var util = __require("util");
    var ConnectionParameters = require_connection_parameters();
    var NativeQuery = require_query2();
    var queryQueueLengthDeprecationNotice = nodeUtils.deprecate(
      () => {
      },
      "Calling client.query() when the client is already executing a query is deprecated and will be removed in pg@9.0. Use async/await or an external async flow control mechanism instead."
    );
    var Client2 = module.exports = function(config) {
      EventEmitter.call(this);
      config = config || {};
      this._Promise = config.Promise || global.Promise;
      this._types = new TypeOverrides2(config.types);
      this.native = new Native({
        types: this._types
      });
      this._queryQueue = [];
      this._ending = false;
      this._connecting = false;
      this._connected = false;
      this._queryable = true;
      this.pipeline = Boolean(config.pipeline);
      this._pipelineInFlight = false;
      const cp2 = this.connectionParameters = new ConnectionParameters(config);
      if (config.nativeConnectionString) cp2.nativeConnectionString = config.nativeConnectionString;
      this.user = cp2.user;
      Object.defineProperty(this, "password", {
        configurable: true,
        enumerable: false,
        writable: true,
        value: cp2.password
      });
      this.database = cp2.database;
      this.host = cp2.host;
      this.port = cp2.port;
      this.namedQueries = {};
    };
    Client2.Query = NativeQuery;
    util.inherits(Client2, EventEmitter);
    Client2.prototype._errorAllQueries = function(err) {
      const enqueueError = (query) => {
        process.nextTick(() => {
          query.native = this.native;
          query.handleError(err);
        });
      };
      if (this._hasActiveQuery()) {
        enqueueError(this._activeQuery);
        this._activeQuery = null;
      }
      this._queryQueue.forEach(enqueueError);
      this._queryQueue.length = 0;
    };
    Client2.prototype._connect = function(cb) {
      const self = this;
      if (this._connecting) {
        process.nextTick(() => cb(new Error("Client has already been connected. You cannot reuse a client.")));
        return;
      }
      this._connecting = true;
      this.connectionParameters.getLibpqConnectionString(function(err, conString) {
        if (self.connectionParameters.nativeConnectionString) conString = self.connectionParameters.nativeConnectionString;
        if (err) return cb(err);
        self.native.connect(conString, function(err2) {
          if (err2) {
            self.native.end();
            return cb(err2);
          }
          self._connected = true;
          self.native.on("error", function(err3) {
            self._queryable = false;
            self._errorAllQueries(err3);
            self.emit("error", err3);
          });
          self.native.on("notification", function(msg) {
            self.emit("notification", {
              channel: msg.relname,
              payload: msg.extra
            });
          });
          self.emit("connect");
          self._pulseQueryQueue(true);
          cb(null, this);
        });
      });
    };
    Client2.prototype.connect = function(callback) {
      if (callback) {
        this._connect(callback);
        return;
      }
      return new this._Promise((resolve, reject) => {
        this._connect((error) => {
          if (error) {
            reject(error);
          } else {
            resolve(this);
          }
        });
      });
    };
    Client2.prototype.query = function(config, values, callback) {
      let query;
      let result;
      let readTimeout;
      let readTimeoutTimer;
      let queryCallback;
      if (config === null || config === void 0) {
        throw new TypeError("Client was passed a null or undefined query");
      } else if (typeof config.submit === "function") {
        readTimeout = config.query_timeout || this.connectionParameters.query_timeout;
        result = query = config;
        if (typeof values === "function") {
          config.callback = values;
        }
      } else {
        readTimeout = config.query_timeout || this.connectionParameters.query_timeout;
        query = new NativeQuery(config, values, callback);
        if (!query.callback) {
          let resolveOut, rejectOut;
          result = new this._Promise((resolve, reject) => {
            resolveOut = resolve;
            rejectOut = reject;
          }).catch((err) => {
            Error.captureStackTrace(err);
            throw err;
          });
          query.callback = (err, res) => err ? rejectOut(err) : resolveOut(res);
        }
      }
      if (readTimeout) {
        queryCallback = query.callback || (() => {
        });
        readTimeoutTimer = setTimeout(() => {
          const error = new Error("Query read timeout");
          process.nextTick(() => {
            query.handleError(error, this.connection);
          });
          queryCallback(error);
          query.callback = () => {
          };
          const index = this._queryQueue.indexOf(query);
          if (index > -1) {
            this._queryQueue.splice(index, 1);
          }
          this._pulseQueryQueue();
        }, readTimeout);
        query.callback = (err, res) => {
          clearTimeout(readTimeoutTimer);
          queryCallback(err, res);
        };
      }
      if (!this._queryable) {
        query.native = this.native;
        process.nextTick(() => {
          query.handleError(new Error("Client has encountered a connection error and is not queryable"));
        });
        return result;
      }
      if (this._ending) {
        query.native = this.native;
        process.nextTick(() => {
          query.handleError(new Error("Client was closed and is not queryable"));
        });
        return result;
      }
      if (this._queryQueue.length > 0 && !this.pipeline) {
        queryQueueLengthDeprecationNotice();
      }
      this._queryQueue.push(query);
      this._pulseQueryQueue();
      return result;
    };
    Client2.prototype.end = function(cb) {
      const self = this;
      this._ending = true;
      if (this._connecting && !this._connected) {
        this.once("connect", () => {
          this.end(() => {
          });
        });
      }
      let result;
      if (!cb) {
        result = new this._Promise(function(resolve, reject) {
          cb = (err) => err ? reject(err) : resolve();
        });
      }
      const doEnd = function() {
        self.native.end(function() {
          self._connected = false;
          self._errorAllQueries(new Error("Connection terminated"));
          process.nextTick(() => {
            self.emit("end");
            if (cb) cb();
          });
        });
      };
      if (this.pipeline && (this._pipelineInFlight || this._queryQueue.length > 0)) {
        this.once("drain", doEnd);
      } else {
        doEnd();
      }
      return result;
    };
    Client2.prototype._hasActiveQuery = function() {
      return this._activeQuery && this._activeQuery.state !== "error" && this._activeQuery.state !== "end";
    };
    Client2.prototype._pulseQueryQueue = function(initialConnection) {
      if (!this._connected) {
        return;
      }
      if (this.pipeline && !initialConnection) {
        return this._pulsePipelinedQueryQueue();
      }
      if (this._hasActiveQuery()) {
        return;
      }
      const query = this._queryQueue.shift();
      if (!query) {
        if (!initialConnection) {
          this.emit("drain");
        }
        return;
      }
      this._activeQuery = query;
      query.submit(this);
      const self = this;
      query.once("_done", function() {
        self._pulseQueryQueue();
      });
    };
    Client2.prototype._pulsePipelinedQueryQueue = function() {
      if (!this._connected || this._pipelineInFlight) {
        return;
      }
      if (this._queryQueue.length === 0) {
        if (this.hasExecuted) {
          this.emit("drain");
        }
        return;
      }
      this._pipelineInFlight = true;
      const self = this;
      const queries = [];
      const nativeQueries = [];
      const utils = require_utils();
      while (this._queryQueue.length > 0) {
        const query = this._queryQueue.shift();
        this.hasExecuted = true;
        nativeQueries.push(query);
        const values = query.values ? query.values.map(utils.prepareValue) : null;
        const pipelineEntry = { text: query.text, name: query.name };
        if (values) {
          pipelineEntry.values = values;
        }
        if (query.name && this.namedQueries[query.name]) {
          pipelineEntry._alreadyPrepared = true;
        }
        queries.push(pipelineEntry);
      }
      this.native.pipeline(queries, function(err, results) {
        self._pipelineInFlight = false;
        if (err) {
          for (let i = 0; i < nativeQueries.length; i++) {
            const q = nativeQueries[i];
            q.native = self.native;
            q.handleError(err);
          }
          self._pulsePipelinedQueryQueue();
          return;
        }
        for (let i = 0; i < nativeQueries.length; i++) {
          const q = nativeQueries[i];
          const r = results[i];
          q.native = self.native;
          if (r.err) {
            q.handleError(r.err);
          } else {
            if (q.name) {
              self.namedQueries[q.name] = q.text;
            }
            q.state = "end";
            q.emit("end", r.result);
            if (q.callback) {
              q.callback(null, r.result);
            }
          }
          setImmediate(function() {
            q.emit("_done");
          });
        }
        self._pulsePipelinedQueryQueue();
      });
    };
    Client2.prototype.cancel = function(query) {
      if (this._activeQuery === query) {
        this.native.cancel(function() {
        });
      } else if (this._queryQueue.indexOf(query) !== -1) {
        this._queryQueue.splice(this._queryQueue.indexOf(query), 1);
      }
    };
    Client2.prototype.ref = function() {
    };
    Client2.prototype.unref = function() {
    };
    Client2.prototype.setTypeParser = function(oid3, format, parseFn) {
      return this._types.setTypeParser(oid3, format, parseFn);
    };
    Client2.prototype.getTypeParser = function(oid3, format) {
      return this._types.getTypeParser(oid3, format);
    };
    Client2.prototype.isConnected = function() {
      return this._connected;
    };
    Client2.prototype.getTransactionStatus = function() {
      return this.native.getTransactionStatus();
    };
  }
});

// infrastructure/release-custody/node_modules/pg/lib/native/index.js
var require_native = __commonJS({
  "infrastructure/release-custody/node_modules/pg/lib/native/index.js"(exports, module) {
    "use strict";
    module.exports = require_client2();
  }
});

// infrastructure/release-custody/node_modules/pg/lib/index.js
var require_lib2 = __commonJS({
  "infrastructure/release-custody/node_modules/pg/lib/index.js"(exports, module) {
    "use strict";
    var Client2 = require_client();
    var defaults2 = require_defaults();
    var Connection2 = require_connection();
    var Result2 = require_result();
    var utils = require_utils();
    var Pool2 = require_pg_pool();
    var TypeOverrides2 = require_type_overrides();
    var { DatabaseError: DatabaseError2 } = require_dist();
    var { escapeIdentifier: escapeIdentifier2, escapeLiteral: escapeLiteral2 } = require_utils();
    var poolFactory = (Client3) => {
      return class BoundPool extends Pool2 {
        constructor(options) {
          super(options, Client3);
        }
      };
    };
    var PG = function(clientConstructor2) {
      this.defaults = defaults2;
      this.Client = clientConstructor2;
      this.Query = this.Client.Query;
      this.Pool = poolFactory(this.Client);
      this._pools = [];
      this.Connection = Connection2;
      this.types = require_pg_types();
      this.DatabaseError = DatabaseError2;
      this.TypeOverrides = TypeOverrides2;
      this.escapeIdentifier = escapeIdentifier2;
      this.escapeLiteral = escapeLiteral2;
      this.Result = Result2;
      this.utils = utils;
    };
    var clientConstructor = Client2;
    var forceNative = false;
    try {
      forceNative = !!process.env.NODE_PG_FORCE_NATIVE;
    } catch {
    }
    if (forceNative) {
      clientConstructor = require_native();
    }
    module.exports = new PG(clientConstructor);
    Object.defineProperty(module.exports, "native", {
      configurable: true,
      enumerable: false,
      get() {
        let native = null;
        try {
          native = new PG(require_native());
        } catch (err) {
          if (err.code !== "MODULE_NOT_FOUND") {
            throw err;
          }
        }
        Object.defineProperty(module.exports, "native", {
          value: native
        });
        return native;
      }
    });
  }
});

// infrastructure/release-custody/owner-gate/core.mjs
import { createHash } from "node:crypto";

// scripts/lib/release-custody-revocations.mjs
var RETIRED_RELEASE_SIGNERS = Object.freeze([
  "4c35b68005859dfaf5fe4d6d490210bfa4932448caf5513481dc0f53ff480e15",
  "4d27c948719d3a9c439a86f0728ce441374e148bb7ee2c1373546ecf2e004775"
]);

// infrastructure/release-custody/owner-gate/core.mjs
var digest = (value) => createHash("sha256").update(value).digest("hex");
var requireThat = (condition, message) => {
  if (!condition) throw new Error(message);
};
var hex = (value, size) => typeof value === "string" && new RegExp(`^[a-f0-9]{${size}}$`).test(value);
var fields = ["version", "mode", "repository", "releaseSha", "projectId", "teamId", "environment", "baselineSha", "baselineDeploymentId", "ledgerSha256", "manifestSha256", "ciRunId", "policyVersion", "issuedAt", "expiresAt", "nonce"];
function parseBundle(raw, policy, now) {
  requireThat(typeof raw === "string" && Buffer.byteLength(raw) <= 16384, "Invalid bundle size");
  const bundle = JSON.parse(raw);
  const wireFields = bundle?.version === 2 ? [...fields, "artifactSha256"] : fields;
  requireThat(bundle && Object.keys(bundle).sort().join(",") === [...wireFields].sort().join(","), "Unexpected bundle fields");
  requireThat(JSON.stringify(Object.fromEntries(wireFields.map((key) => [key, bundle[key]]))) === raw, "Noncanonical bundle");
  requireThat([1, 2].includes(bundle.version) && bundle.mode === (policy.governanceModel === "AUTOMATED_OWNER_POLICY" ? "AUTOMATED_MIGRATION_FREE" : "OWNER_APPROVED_MIGRATION_FREE"), "Unsupported authorization mode");
  if (bundle.version === 2) requireThat(hex(bundle.artifactSha256, 64), "Exact prebuilt artifact digest required");
  for (const key of ["repository", "projectId", "teamId", "environment", "policyVersion"]) {
    requireThat(bundle[key] === policy[key], `Wrong ${key}`);
  }
  requireThat(bundle.environment === "production", "Production target required");
  requireThat(hex(bundle.releaseSha, 40) && hex(bundle.baselineSha, 40), "Exact source SHA required");
  requireThat(hex(bundle.ledgerSha256, 64) && hex(bundle.manifestSha256, 64), "Migration digests required");
  requireThat(typeof bundle.baselineDeploymentId === "string" && /^dpl_[a-zA-Z0-9]+$/.test(bundle.baselineDeploymentId), "Baseline deployment required");
  requireThat(Number.isSafeInteger(bundle.ciRunId) && bundle.ciRunId > 0, "CI run required");
  requireThat(hex(bundle.nonce, 64), "Release nonce required");
  const issued = Date.parse(bundle.issuedAt), expires = Date.parse(bundle.expiresAt);
  requireThat(Number.isFinite(issued) && Number.isFinite(expires) && new Date(issued).toISOString() === bundle.issuedAt && new Date(expires).toISOString() === bundle.expiresAt, "Canonical timestamps required");
  requireThat(issued <= now && now < expires && expires - issued > 0 && expires - issued <= 15 * 6e4, "Approval expired or invalid window");
  return Object.freeze(bundle);
}
function assertReleaseTechnicalChecks(bundle, evidence, policy, now) {
  requireThat(evidence && Number.isFinite(evidence.observedAt) && evidence.observedAt <= now && now - evidence.observedAt <= 3e4, "Fresh independent evidence required");
  for (const field of ["releaseSha", "projectId", "teamId", "environment", "baselineSha", "baselineDeploymentId", "ledgerSha256", "manifestSha256", "ciRunId"]) {
    requireThat(evidence[field] === bundle[field], `Technical evidence mismatch: ${field}`);
  }
  requireThat(evidence.mainSha === bundle.releaseSha, "Candidate is not current intended main");
  requireThat(evidence.ciConclusion === "success" && evidence.ciEvent === "push" && evidence.ciBranch === "main", "Exact-main CI must pass");
  requireThat(evidence.workflowSha256 === policy.workflowSha256, "Unreviewed CI workflow");
  requireThat(Array.isArray(evidence.checks) && policy.requiredChecks.every((name) => evidence.checks.filter((check) => check.name === name).length === 1 && evidence.checks.find((check) => check.name === name).conclusion === "success"), "Required tests must pass");
  requireThat(evidence.pendingMigrations === 0 && evidence.failedMigrations === 0 && evidence.schemaMatches === true && evidence.runtimePermissionsValid === true, "Migration/runtime integrity failed");
  requireThat(evidence.health === "healthy" && evidence.recoveryEvidenceValid === true, "Health or recovery evidence failed");
}

// infrastructure/release-custody/owner-gate/github-approval.mjs
var requireThat2 = (value, message) => {
  if (!value) throw new Error(message);
};
function createGithubReleaseRunReader({ policy: sourcePolicy, readJson, now = Date.now }) {
  const policy = structuredClone(sourcePolicy);
  requireThat2(/^[\w.-]+\/[\w.-]+$/.test(policy.controlRepository) && policy.controlRepository !== policy.repository, "Separate control repository required");
  requireThat2(/^[a-f0-9]{40}$/.test(policy.gateSha), "Reviewed gate SHA required");
  requireThat2(Number.isSafeInteger(policy.ownerId) && policy.ownerId > 0 && Number.isSafeInteger(policy.operatorId) && policy.operatorId > 0 && policy.operatorId !== policy.ownerId, "Distinct owner and automation identities required");
  requireThat2(Number.isSafeInteger(policy.environmentId) && policy.environmentId > 0 && /^[\w-]+$/.test(policy.approvalEnvironment), "Pinned approval environment required");
  requireThat2(policy.workflowPath === ".github/workflows/owner-release.yml", "Pinned control workflow required");
  const automated = policy.governanceModel === "AUTOMATED_OWNER_POLICY";
  const root = `/repos/${policy.controlRepository}`;
  return async ({ runId, rawBundle, expectedBundleSha256 }) => {
    requireThat2(Number.isSafeInteger(runId) && runId > 0, "Exact run required");
    const bundle = parseBundle(rawBundle, policy, now());
    requireThat2(!automated || bundle.version === 2, "Automated release requires exact artifact binding");
    requireThat2(digest(rawBundle) === expectedBundleSha256, "Modified bundle");
    const [run, environment, reviews] = await Promise.all([
      readJson(`${root}/actions/runs/${runId}`),
      readJson(`${root}/environments/${policy.approvalEnvironment}`),
      automated ? Promise.resolve([]) : readJson(`${root}/actions/runs/${runId}/approvals`)
    ]);
    const checkRun = (value) => {
      requireThat2(value?.id === runId && value.run_attempt === 1, "Rerun/replay forbidden");
      requireThat2(value.repository?.full_name === policy.controlRepository && value.head_repository?.full_name === policy.controlRepository && value.head_sha === policy.gateSha && value.head_branch === "main" && value.path === policy.workflowPath, "Wrong control source");
      requireThat2(value.event === "workflow_dispatch" && value.status === "in_progress" && value.conclusion === null, "Invalid release execution");
      const actorAllowed = value.actor?.id === policy.operatorId && value.actor.type === "Bot" || automated && value.actor?.id === policy.ownerId && value.actor.type === "User";
      requireThat2(actorAllowed && value.triggering_actor?.id === value.actor.id && value.triggering_actor?.type === value.actor.type, "Unapproved execution identity");
      const created = Date.parse(value.created_at);
      requireThat2(Number.isFinite(created) && created + 1e3 > Date.parse(bundle.issuedAt) && created < Date.parse(bundle.expiresAt) && created <= now() + 5e3, "Run approval window invalid");
      requireThat2(value.display_title === `Release ${bundle.releaseSha} / ${expectedBundleSha256}`, "Approval display is not bound to bundle");
    };
    checkRun(run);
    requireThat2(environment?.id === policy.environmentId && environment.name === policy.approvalEnvironment && environment.can_admins_bypass === false, "Environment bypass/policy mismatch");
    requireThat2(environment.deployment_branch_policy?.protected_branches === true && environment.deployment_branch_policy.custom_branch_policies === false, "Protected control branch required");
    const rules = environment.protection_rules?.filter((rule) => rule.type === "required_reviewers");
    if (automated) {
      requireThat2(rules?.length === 0, "Automated environment policy differs from enrollment");
    } else {
      requireThat2(rules?.length === 1 && rules[0].prevent_self_review === true && rules[0].reviewers?.length === 1 && rules[0].reviewers[0].type === "User" && rules[0].reviewers[0].reviewer?.id === policy.ownerId, "Sole owner review required");
      requireThat2(Array.isArray(reviews) && reviews.length === 1, "Exactly one owner decision required");
      const review = reviews[0];
      requireThat2(review.state === "approved" && review.user?.id === policy.ownerId && review.user.type === "User" && review.environments?.length === 1 && review.environments[0].id === policy.environmentId && review.environments[0].name === policy.approvalEnvironment, "Owner approval absent or wrong target");
    }
    checkRun(await readJson(`${root}/actions/runs/${runId}`));
    parseBundle(rawBundle, policy, now());
    return Object.freeze({ ...automated ? { authorizationKind: "AUTOMATED_OWNER_POLICY", policyVersion: policy.policyVersion, humanReleaseReview: false } : {}, provider: "github", controlRepository: policy.controlRepository, gateSha: policy.gateSha, runId, runAttempt: 1, ownerId: policy.ownerId, environmentId: policy.environmentId, releaseSha: bundle.releaseSha, bundleSha256: expectedBundleSha256, expiresAt: bundle.expiresAt, consumptionKey: `${policy.controlRepository}:${runId}:1` });
  };
}

// infrastructure/release-custody/owner-gate/github-executor.mjs
var requireThat3 = (value, message) => {
  if (!value) throw new Error(message);
};
function createGithubReleaseExecutor({ policy: sourcePolicy, readApproval, observer, ledger, deployer, verifyDeployment, now = Date.now }) {
  const policy = structuredClone(sourcePolicy);
  requireThat3(policy.controlRepository !== policy.repository && /^[a-f0-9]{40}$/.test(policy.gateSha), "Independent reviewed control source required");
  requireThat3(Array.isArray(policy.requiredChecks) && policy.requiredChecks.length > 0 && new Set(policy.requiredChecks).size === policy.requiredChecks.length && /^[a-f0-9]{64}$/.test(policy.workflowSha256), "Reviewed technical checks required");
  return async ({ rawBundle, runId, expectedBundleSha256 }) => {
    const input = { rawBundle, runId, expectedBundleSha256 };
    const bundle = parseBundle(rawBundle, policy, now());
    requireThat3(digest(rawBundle) === expectedBundleSha256, "Modified release bundle");
    const approval = await readApproval(input);
    const evidence = await observer.collect(bundle);
    assertReleaseTechnicalChecks(bundle, evidence, policy, now());
    const recheckedApproval = await readApproval(input);
    requireThat3(JSON.stringify(recheckedApproval) === JSON.stringify(approval), "Approval changed during technical verification");
    parseBundle(rawBundle, policy, now());
    const claim = await ledger.consume({ rawBundle, approval, evidence });
    requireThat3(claim?.committed === true && claim.consumptionKey === approval.consumptionKey, "Replayed approval or production lease unavailable");
    parseBundle(rawBundle, policy, now());
    const beforePromotion = async () => {
      parseBundle(rawBundle, policy, now());
      requireThat3(JSON.stringify(await readApproval(input)) === JSON.stringify(approval), "Owner approval changed before promotion");
      const freshEvidence = await observer.collect(bundle);
      assertReleaseTechnicalChecks(bundle, freshEvidence, policy, now());
      parseBundle(rawBundle, policy, now());
    };
    const deployed = await deployer.deploy({ bundle, approval, evidence, beforePromotion });
    const verified = await verifyDeployment({ bundle, deploymentId: deployed?.deploymentId });
    requireThat3(verified?.deploymentId === deployed?.deploymentId && /^dpl_[A-Za-z0-9]+$/.test(verified?.deploymentId) && verified.releaseSha === bundle.releaseSha && verified.projectId === bundle.projectId && verified.teamId === bundle.teamId && verified.environment === "production", "Live production receipt mismatch");
    requireThat3(bundle.version !== 2 || verified.artifactSha256 === bundle.artifactSha256, "Live production artifact receipt mismatch");
    requireThat3(await ledger.finish({ consumptionKey: approval.consumptionKey, receipt: verified }) === true, "Deployment audit incomplete; lease remains held");
    return verified;
  };
}

// infrastructure/release-custody/owner-gate/github-evidence.mjs
import { createHash as createHash2 } from "node:crypto";
var requireThat4 = (condition, message) => {
  if (!condition) throw new Error(message);
};
function createGithubEvidenceReader({ repository, workflowPath, readJson }) {
  requireThat4(/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(repository), "Exact repository required");
  requireThat4(/^\.github\/workflows\/[a-zA-Z0-9_.-]+\.ya?ml$/.test(workflowPath), "Exact CI workflow path required");
  const base = `/repos/${repository}`;
  return async function collectGithubEvidence(bundle) {
    requireThat4(bundle.repository === repository && /^[a-f0-9]{40}$/.test(bundle.releaseSha) && Number.isSafeInteger(bundle.ciRunId) && bundle.ciRunId > 0, "Invalid GitHub evidence request");
    const [main, run, workflow] = await Promise.all([
      readJson(`${base}/git/ref/heads/main`),
      readJson(`${base}/actions/runs/${bundle.ciRunId}`),
      readJson(`${base}/contents/${workflowPath}?ref=${bundle.releaseSha}`)
    ]);
    requireThat4(main.object?.type === "commit" && main.object.sha === bundle.releaseSha, "Main SHA changed");
    requireThat4(run.id === bundle.ciRunId && run.head_sha === bundle.releaseSha && run.head_branch === "main" && run.event === "push" && run.status === "completed" && run.conclusion === "success", "Exact-main CI did not pass");
    requireThat4(run.repository?.full_name === repository && run.head_repository?.full_name === repository && run.path === workflowPath, "CI repository/workflow mismatch");
    requireThat4(Number.isSafeInteger(run.run_attempt) && run.run_attempt > 0, "CI run attempt unavailable");
    requireThat4(workflow.type === "file" && workflow.path === workflowPath && workflow.encoding === "base64" && typeof workflow.content === "string", "CI workflow source unavailable");
    const source = Buffer.from(workflow.content.replace(/\s/g, ""), "base64");
    requireThat4(source.length > 0 && source.length === workflow.size, "CI workflow source incomplete");
    const checks = [], ids = /* @__PURE__ */ new Set();
    let complete = false;
    for (let page = 1; page <= 10; page++) {
      const response = await readJson(`${base}/actions/runs/${bundle.ciRunId}/attempts/${run.run_attempt}/jobs?per_page=100&page=${page}`);
      requireThat4(Array.isArray(response.jobs) && Number.isSafeInteger(response.total_count) && response.total_count >= 0, "CI jobs unavailable");
      for (const job of response.jobs) {
        requireThat4(Number.isSafeInteger(job.id) && !ids.has(job.id) && job.run_id === run.id && job.head_sha === bundle.releaseSha && job.status === "completed", "CI job identity/state mismatch");
        ids.add(job.id);
        checks.push({ name: job.name, conclusion: job.conclusion });
      }
      if (checks.length === response.total_count) {
        complete = true;
        break;
      }
      requireThat4(response.jobs.length === 100 && checks.length < response.total_count, "Incomplete CI job list");
    }
    requireThat4(complete && checks.length > 0, "CI job pagination incomplete");
    const latest = await readJson(`${base}/actions/runs/${bundle.ciRunId}`);
    requireThat4(latest.run_attempt === run.run_attempt && latest.status === "completed" && latest.conclusion === "success" && latest.head_sha === bundle.releaseSha, "CI changed during verification");
    return { mainSha: main.object.sha, releaseSha: run.head_sha, ciRunId: run.id, ciConclusion: run.conclusion, ciEvent: run.event, ciBranch: run.head_branch, workflowSha256: createHash2("sha256").update(source).digest("hex"), checks };
  };
}

// infrastructure/release-custody/owner-gate/github-migrations.mjs
import { createHash as createHash3 } from "node:crypto";
var requireThat5 = (condition, message) => {
  if (!condition) throw new Error(message);
};
var oid = (value) => typeof value === "string" && /^[a-f0-9]{40}$/.test(value);
function createGithubMigrationReader({ repository, readJson }) {
  requireThat5(/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(repository), "Pinned repository required");
  const root = `/repos/${repository}`;
  return async (releaseSha) => {
    requireThat5(oid(releaseSha), "Exact source SHA required");
    const commit = await readJson(`${root}/git/commits/${releaseSha}`);
    requireThat5(commit.sha === releaseSha && oid(commit.tree?.sha), "Git commit identity mismatch");
    const tree = await readJson(`${root}/git/trees/${commit.tree.sha}?recursive=1`);
    requireThat5(tree.sha === commit.tree.sha && tree.truncated === false && Array.isArray(tree.tree), "Complete committed Git tree required");
    const directories = /* @__PURE__ */ new Set(), files = /* @__PURE__ */ new Map(), seen = /* @__PURE__ */ new Set();
    for (const entry of tree.tree) {
      requireThat5(typeof entry.path === "string" && !seen.has(entry.path), "Duplicate or invalid Git tree path");
      seen.add(entry.path);
      const directory = entry.path.match(/^prisma\/migrations\/([0-9A-Za-z_-]+)$/);
      if (directory) {
        requireThat5(entry.type === "tree" && entry.mode === "040000", "Migration directory is not a tree");
        directories.add(directory[1]);
      }
      const file = entry.path.match(/^prisma\/migrations\/([0-9A-Za-z_-]+)\/migration\.sql$/);
      if (file) {
        requireThat5(entry.type === "blob" && ["100644", "100755"].includes(entry.mode) && oid(entry.sha) && Number.isSafeInteger(entry.size) && entry.size > 0 && entry.size <= 2e6, "Invalid migration blob");
        files.set(file[1], entry);
      }
    }
    requireThat5(directories.size > 0 && directories.size === files.size && [...directories].every((name) => files.has(name)), "Incomplete migration directory inventory");
    const pending = [...files.entries()].sort(([a], [b]) => a.localeCompare(b));
    const result = new Array(pending.length);
    let cursor = 0;
    await Promise.all(Array.from({ length: Math.min(8, pending.length) }, async () => {
      while (cursor < pending.length) {
        const index = cursor++, [name, entry] = pending[index];
        const blob = await readJson(`${root}/git/blobs/${entry.sha}`);
        requireThat5(blob.sha === entry.sha && blob.encoding === "base64" && blob.size === entry.size && typeof blob.content === "string", "Git blob response mismatch");
        const encoded = blob.content.replace(/\s/g, ""), bytes = Buffer.from(encoded, "base64");
        requireThat5(bytes.length === entry.size && bytes.toString("base64") === encoded, "Noncanonical or incomplete migration bytes");
        const gitSha = createHash3("sha1").update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest("hex");
        requireThat5(gitSha === entry.sha, "Migration bytes differ from committed Git blob");
        result[index] = { name, sha256: createHash3("sha256").update(bytes).digest("hex") };
      }
    }));
    return { releaseSha, entries: result };
  };
}

// infrastructure/release-custody/owner-gate/github-schemas.mjs
import { createHash as createHash4 } from "node:crypto";
var requireThat6 = (value, message) => {
  if (!value) throw new Error(message);
};
var oid2 = (value) => typeof value === "string" && /^[a-f0-9]{40}$/.test(value);
function createGithubSchemaReader({ repository, readJson }) {
  requireThat6(/^[\w.-]+\/[\w.-]+$/.test(repository), "Pinned source repository required");
  return async (releaseSha) => {
    requireThat6(oid2(releaseSha), "Exact candidate commit required");
    const root = `/repos/${repository}`;
    const commit = await readJson(`${root}/git/commits/${releaseSha}`);
    requireThat6(commit.sha === releaseSha && oid2(commit.tree?.sha), "Commit mismatch");
    const tree = await readJson(`${root}/git/trees/${commit.tree.sha}?recursive=1`);
    requireThat6(tree.sha === commit.tree.sha && tree.truncated === false && Array.isArray(tree.tree), "Complete exact tree required");
    const result = { releaseSha };
    for (const [path, field] of [["prisma/schema.prisma", "schemaSha256"], ["prisma/confidential/schema.prisma", "confidentialSchemaSha256"]]) {
      const matches = tree.tree.filter((entry2) => entry2.path === path);
      requireThat6(matches.length === 1, "Unique schema entry required");
      const entry = matches[0];
      requireThat6(entry.type === "blob" && ["100644", "100755"].includes(entry.mode) && oid2(entry.sha) && Number.isSafeInteger(entry.size) && entry.size > 0 && entry.size <= 2e6, "Regular schema blob required");
      const blob = await readJson(`${root}/git/blobs/${entry.sha}`);
      requireThat6(blob.sha === entry.sha && blob.size === entry.size && blob.encoding === "base64" && typeof blob.content === "string", "Blob metadata mismatch");
      const encoded = blob.content.replace(/\s/g, ""), bytes = Buffer.from(encoded, "base64");
      requireThat6(bytes.length === entry.size && bytes.toString("base64") === encoded, "Incomplete schema bytes");
      const blobId = createHash4("sha1").update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest("hex");
      requireThat6(blobId === entry.sha, "Schema content differs from committed blob");
      result[field] = digest(bytes);
    }
    return result;
  };
}

// infrastructure/release-custody/node_modules/pg/esm/index.mjs
var import_lib = __toESM(require_lib2(), 1);
var Client = import_lib.default.Client;
var Pool = import_lib.default.Pool;
var Connection = import_lib.default.Connection;
var types = import_lib.default.types;
var Query = import_lib.default.Query;
var DatabaseError = import_lib.default.DatabaseError;
var escapeIdentifier = import_lib.default.escapeIdentifier;
var escapeLiteral = import_lib.default.escapeLiteral;
var Result = import_lib.default.Result;
var TypeOverrides = import_lib.default.TypeOverrides;
var defaults = import_lib.default.defaults;
var esm_default = import_lib.default;

// infrastructure/release-custody/owner-gate/database-evidence.mjs
import { createHash as createHash7 } from "node:crypto";

// scripts/lib/festival-release-database.mjs
import { createHash as createHash5 } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";

// scripts/lib/forecast-supply-production-guard.mjs
var FORECAST_SUPPLY_MIGRATIONS = Object.freeze([
  Object.freeze({
    name: "20260825131500_forecast_supply_evidence",
    sha256: "9320d4a0616caa2001e9ea334ef3ffc20da7a37980db0572a663c502fdf282d4"
  }),
  Object.freeze({
    name: "20260825160000_forecast_supply_receipt_freeze",
    sha256: "3c035527abf52bac850e0de182ee41b420b897b2cd0e7fd4045572ecdf5144c7"
  }),
  Object.freeze({
    name: "20260825203000_forecast_supply_source_observations",
    sha256: "7834e42e8be49a408cc0cfb11138d17384c8e034c99d3f2fa0c7e2ebadf0e4bd"
  })
]);
var EXCLUDED_FORUM_MIGRATIONS = Object.freeze([
  Object.freeze({ name: "20260825153000_forum_duplicate_canonicalization", sha256: "b08a43a723c7a1afd2385cfcb206aa8e038c88d63b04863e726dd5202fd889ee" }),
  Object.freeze({ name: "20260825213000_forum_composer_drafts", sha256: "2686b388c9a4ec79e2efb14b8ce8211262b29e10325b3f4adf2b3e3c7fe49c84" })
]);
var MAX_RECOVERY_AGE_MS = 2 * 60 * 60 * 1e3;
var REVIEWED_EVIDENCE_SIGNERS = Object.freeze({ authorization: "4c35b68005859dfaf5fe4d6d490210bfa4932448caf5513481dc0f53ff480e15", recovery: "4d27c948719d3a9c439a86f0728ce441374e148bb7ee2c1373546ecf2e004775" });
var MAX_AUTHORIZATION_WINDOW_MS = 2 * 60 * 60 * 1e3;
var EXPECTED_SCHEMA = Object.freeze({
  types: Object.freeze([
    "ForecastSupplyArchiveProvider",
    "ForecastSupplyAuthority",
    "ForecastSupplyEvidenceVerdict",
    "ForecastSupplyFact",
    "ForecastSupplySourceObservationOutcome"
  ]),
  enumLabels: Object.freeze([
    "ForecastSupplyArchiveProvider:INTERNET_ARCHIVE",
    "ForecastSupplyAuthority:DEDUPLICATION_SYSTEM",
    "ForecastSupplyAuthority:ORGANIZATION_OFFICIAL",
    "ForecastSupplyAuthority:PUBLIC_AUTHORITY",
    "ForecastSupplyEvidenceVerdict:CONFIRMS",
    "ForecastSupplyEvidenceVerdict:REFUTES",
    "ForecastSupplyFact:AUTHORITATIVE_DATE",
    "ForecastSupplyFact:CANONICAL_LISTING",
    "ForecastSupplyFact:NON_MINOR_CONTEXT",
    "ForecastSupplyFact:OFFICIAL_PUBLIC_SOURCE",
    "ForecastSupplyFact:ONE_SEAT",
    "ForecastSupplyFact:ORGANIZATION_IDENTITY",
    "ForecastSupplyFact:PROFESSIONAL_PERFORMANCE_ROLE",
    "ForecastSupplyFact:PUBLICATION_STATE",
    "ForecastSupplySourceObservationOutcome:ACCESS_BLOCKED",
    "ForecastSupplySourceObservationOutcome:AVAILABLE",
    "ForecastSupplySourceObservationOutcome:DEFINITIVELY_GONE",
    "ForecastSupplySourceObservationOutcome:SOURCE_IDENTITY_CONFLICT",
    "ForecastSupplySourceObservationOutcome:TRANSIENT_FAILURE",
    "ForecastSupplySourceObservationOutcome:UNSUPPORTED_CONTENT"
  ]),
  tables: Object.freeze(["ForecastSupplyAssessmentEvidenceLink", "ForecastSupplyEvidence", "ForecastSupplySourceObservation"]),
  functions: Object.freeze(["prevent_forecast_supply_evidence_mutation", "prevent_forecast_supply_receipt_extension", "prevent_forecast_supply_source_observation_mutation"]),
  triggers: Object.freeze(["ForecastSupplyAssessmentEvidenceLink_append_only", "ForecastSupplyAssessmentEvidenceLink_freeze_receipt", "ForecastSupplyEvidence_append_only", "ForecastSupplySourceObservation_append_only"]),
  indexes: Object.freeze([
    "ForecastSupplyAssessmentEvidenceLink_evidenceId_idx",
    "ForecastSupplyAssessmentEvidenceLink_pkey",
    "ForecastSupplyEvidence_contentDigest_idx",
    "ForecastSupplyEvidence_eventKey_key",
    "ForecastSupplyEvidence_listingId_fact_verifiedAt_idx",
    "ForecastSupplyEvidence_pkey",
    "ForecastSupplyEvidence_supersedesEvidenceId_key",
    "ForecastSupplySourceObservation_eventKey_key",
    "ForecastSupplySourceObservation_listingId_observedAt_idx",
    "ForecastSupplySourceObservation_outcome_observedAt_idx",
    "ForecastSupplySourceObservation_pkey"
  ]),
  constraints: Object.freeze([
    "ForecastSupplyAssessmentEvidenceLink_assessmentId_fkey",
    "ForecastSupplyAssessmentEvidenceLink_evidenceId_fkey",
    "ForecastSupplyAssessmentEvidenceLink_nonempty_actor_check",
    "ForecastSupplyAssessmentEvidenceLink_pkey",
    "ForecastSupplyEvidence_archive_locator_check",
    "ForecastSupplyEvidence_digest_check",
    "ForecastSupplyEvidence_listingId_fkey",
    "ForecastSupplyEvidence_no_self_supersession_check",
    "ForecastSupplyEvidence_nonempty_excerpt_check",
    "ForecastSupplyEvidence_nonempty_value_check",
    "ForecastSupplyEvidence_pkey",
    "ForecastSupplyEvidence_source_shape_check",
    "ForecastSupplyEvidence_source_time_check",
    "ForecastSupplyEvidence_supersedesEvidenceId_fkey",
    "ForecastSupplyEvidence_verification_time_check",
    "ForecastSupplyEvidence_verifier_check",
    "ForecastSupplySourceObservation_actor_check",
    "ForecastSupplySourceObservation_digest_check",
    "ForecastSupplySourceObservation_listingId_fkey",
    "ForecastSupplySourceObservation_outcome_shape_check",
    "ForecastSupplySourceObservation_pkey",
    "ForecastSupplySourceObservation_status_check",
    "ForecastSupplySourceObservation_url_check"
  ]),
  columns: Object.freeze([
    "ForecastSupplyAssessmentEvidenceLink:assessmentId",
    "ForecastSupplyAssessmentEvidenceLink:createdAt",
    "ForecastSupplyAssessmentEvidenceLink:evidenceId",
    "ForecastSupplyAssessmentEvidenceLink:linkedBy",
    "ForecastSupplyEvidence:archiveOriginalUrl",
    "ForecastSupplyEvidence:archiveProvider",
    "ForecastSupplyEvidence:archiveReference",
    "ForecastSupplyEvidence:assertedValue",
    "ForecastSupplyEvidence:authority",
    "ForecastSupplyEvidence:canonicalUrl",
    "ForecastSupplyEvidence:capturedAt",
    "ForecastSupplyEvidence:contentDigest",
    "ForecastSupplyEvidence:createdAt",
    "ForecastSupplyEvidence:eventKey",
    "ForecastSupplyEvidence:fact",
    "ForecastSupplyEvidence:id",
    "ForecastSupplyEvidence:listingId",
    "ForecastSupplyEvidence:policyVersion",
    "ForecastSupplyEvidence:publisherName",
    "ForecastSupplyEvidence:sourceExcerpt",
    "ForecastSupplyEvidence:sourcePublishedAt",
    "ForecastSupplyEvidence:supersedesEvidenceId",
    "ForecastSupplyEvidence:verdict",
    "ForecastSupplyEvidence:verifiedAt",
    "ForecastSupplyEvidence:verifiedBy",
    "ForecastSupplyEvidence:verifiedByActorType",
    "ForecastSupplySourceObservation:contentDigest",
    "ForecastSupplySourceObservation:contentType",
    "ForecastSupplySourceObservation:createdAt",
    "ForecastSupplySourceObservation:eventKey",
    "ForecastSupplySourceObservation:finalUrl",
    "ForecastSupplySourceObservation:httpStatus",
    "ForecastSupplySourceObservation:id",
    "ForecastSupplySourceObservation:listingId",
    "ForecastSupplySourceObservation:observedAt",
    "ForecastSupplySourceObservation:observedBy",
    "ForecastSupplySourceObservation:observedByActorType",
    "ForecastSupplySourceObservation:outcome",
    "ForecastSupplySourceObservation:policyVersion",
    "ForecastSupplySourceObservation:publisherName",
    "ForecastSupplySourceObservation:requestedUrl"
  ])
});

// scripts/lib/festival-migration-plan.mjs
var FESTIVAL_MIGRATIONS = Object.freeze([
  { name: "20260831120000_audition_canonical_truth_foundation", sha256: "6419b74aae5e06d386bf1b4e07b8eba3e5a9859185cd04fbb282baa80e7f53b5" },
  { name: "20260905021500_restore_hiring_offer_status", sha256: "f22dffd26f073da42c0287fde74c1f8797e679d1c8c7c29fa5fbfc91fa06b343" },
  { name: "20260910040000_add_participant_forms", sha256: "28e01b2aa60ba22ff8fbf41c308aa60e89d9f1a046e798f61ce29b5ce9e1fea4" }
].map(Object.freeze));
var TEMPORARY_PRIVILEGES = Object.freeze([
  ...["Organization", "Instrument", "AuditionRound", "IngestionQueue"].map((table) => [table, "id", "REFERENCES"]),
  ...["id", "orgId"].map((column) => ["ParticipantProfile", column, "REFERENCES"]),
  ...["id", "listingId", "status"].map((column) => ["Application", column, "SELECT"]),
  ...["status", "updatedAt"].map((column) => ["Application", column, "UPDATE"]),
  ...["id", "orgId", "lane"].map((column) => ["Listing", column, "SELECT"]),
  ...["id", "type"].map((column) => ["Organization", column, "SELECT"]),
  ...["applicationId", "orgId", "applicantResponse"].map((column) => ["OfferLetter", column, "SELECT"])
].map(Object.freeze));
var festivalPrivilegeObservationSql = `SELECT table_name, column_name, privilege,
  has_column_privilege('cadenza_migration', format('public.%I',table_name), column_name, privilege) AS allowed
  FROM (VALUES ${TEMPORARY_PRIVILEGES.map((row) => `(${row.map((v) => `'${v}'`).join(",")})`).join(",")})
  AS required(table_name,column_name,privilege)`;

// scripts/lib/festival-release-database.mjs
var hash = (value) => createHash5("sha256").update(value).digest("hex");
var requiredPending = FESTIVAL_MIGRATIONS.map((m) => m.name);
function festivalRepositoryMigrations() {
  return readdirSync("prisma/migrations", { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => ({ name: d.name, sha256: hash(readFileSync(`prisma/migrations/${d.name}/migration.sql`)) })).sort((a, b) => a.name.localeCompare(b.name));
}
var FESTIVAL_LEDGER_SQL = `SELECT id,migration_name,checksum,
  to_char(started_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS started_at,
  to_char(finished_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS finished_at,
  to_char(rolled_back_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS rolled_back_at,
  applied_steps_count,encode(sha256(convert_to(coalesce(logs,''),'UTF8')),'hex') AS logs_sha256
  FROM public."_prisma_migrations" ORDER BY migration_name,started_at,id`;
var FESTIVAL_PRESERVATION_SQL = ["Application", "OfferLetter", "ParticipantProfile"].map((table) => `SELECT '${table}' AS table_name,count(*)::int AS rows,
  encode(sha256(convert_to(coalesce(jsonb_agg(to_jsonb(t) ORDER BY id),'[]')::text,'UTF8')),'hex') AS digest
  FROM public."${table}" t`).join(" UNION ALL ");
function assessFestivalLedger(rows, repository = festivalRepositoryMigrations(), phase = "before") {
  if (!["before", "after"].includes(phase) || !Array.isArray(rows) || !rows.length) throw new Error("Invalid Festival ledger phase or rows");
  const files = new Map(repository.map((m) => [m.name, m.sha256]));
  if (files.size !== repository.length) throw new Error("Duplicate repository migration");
  for (const migration of FESTIVAL_MIGRATIONS) {
    if (files.get(migration.name) !== migration.sha256) throw new Error("Festival migration files differ from the reviewed set");
  }
  const ids = /* @__PURE__ */ new Set();
  const applied = /* @__PURE__ */ new Set();
  let rolledBackCount = 0;
  for (const row of rows) {
    if (!row || typeof row.id !== "string" || !row.id || ids.has(row.id) || typeof row.migration_name !== "string" || !/^[a-f0-9]{64}$/.test(row.checksum) || !/^[a-f0-9]{64}$/.test(row.logs_sha256) || !Number.isSafeInteger(row.applied_steps_count) || row.applied_steps_count < 0) {
      throw new Error("Malformed or duplicate Festival ledger row");
    }
    ids.add(row.id);
    const timestamps = [row.started_at, row.finished_at, row.rolled_back_at];
    if (typeof row.started_at !== "string" || timestamps.some((t) => t !== null && (typeof t !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/.test(t) || Number.isNaN(new Date(t).getTime())))) throw new Error("Invalid Festival ledger timestamps");
    if (row.finished_at === null === (row.rolled_back_at === null)) throw new Error("Unresolved or contradictory Festival migration");
    if ((row.finished_at ?? row.rolled_back_at) < row.started_at) throw new Error("Festival migration completion precedes its start");
    if (row.rolled_back_at !== null) {
      rolledBackCount++;
      continue;
    }
    if (applied.has(row.migration_name)) throw new Error("Duplicate successful Festival migration");
    if (files.get(row.migration_name) !== row.checksum) throw new Error("Applied migration missing or checksum changed");
    if (requiredPending.includes(row.migration_name) && row.applied_steps_count !== 1) throw new Error("Festival migration has an invalid applied step count");
    applied.add(row.migration_name);
  }
  const pending = [...files.keys()].filter((name) => !applied.has(name)).sort();
  if (JSON.stringify(pending) !== JSON.stringify(phase === "before" ? requiredPending : [])) throw new Error("Unexpected Festival pending migration set");
  const ordered = [...rows].sort((a, b) => a.migration_name.localeCompare(b.migration_name) || a.started_at.localeCompare(b.started_at) || a.id.localeCompare(b.id));
  const project = (r) => [
    r.id,
    r.migration_name,
    r.checksum,
    r.started_at,
    r.finished_at,
    r.rolled_back_at,
    r.applied_steps_count,
    r.logs_sha256
  ];
  return {
    ledgerSha256: hash(JSON.stringify(ordered.map(project))),
    historicalLedgerSha256: hash(JSON.stringify(ordered.filter((r) => !requiredPending.includes(r.migration_name)).map(project))),
    successfulCount: applied.size,
    rolledBackCount,
    pending
  };
}

// scripts/lib/code-release-production-ledger.mjs
var REVIEWED_CODE_RELEASE_LEDGER = Object.freeze({
  ledgerSha256: "bda788f2b3c67667d12de05972e088175dc9ece1e382741d101973f6377e1c39",
  successfulCount: 208,
  rolledBackCount: 4
});
function validateCodeReleaseProductionLedger(rows, repository, pin = REVIEWED_CODE_RELEASE_LEDGER) {
  const actual = assessFestivalLedger(rows, repository, "after");
  for (const key of ["ledgerSha256", "successfulCount", "rolledBackCount"]) {
    if (actual[key] !== pin[key]) throw new Error(`Production migration ledger differs from reviewed receipt: ${key}`);
  }
  return rows.filter((row) => row.rolled_back_at === null).map((row) => ({
    migrationName: row.migration_name,
    finishedAt: row.finished_at,
    rolledBackAt: row.rolled_back_at
  }));
}

// scripts/lib/production-runtime-privileges.mjs
import { createHash as createHash6 } from "node:crypto";
var RELATION_PRIVILEGES = Object.freeze(["DELETE", "INSERT", "REFERENCES", "SELECT", "TRIGGER", "TRUNCATE", "UPDATE"]);
var SEQUENCE_PRIVILEGES = Object.freeze(["SELECT", "UPDATE", "USAGE"]);
var RuntimePrivilegeManifestError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "RuntimePrivilegeManifestError";
  }
};
function fail(message) {
  throw new RuntimePrivilegeManifestError(message);
}
function exactKeys(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(`${label} must be an object`);
  if (JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...keys].sort())) fail(`${label} keys do not match the frozen contract`);
}
function identifier(value, label) {
  if (typeof value !== "string" || !/^[A-Za-z_][A-Za-z0-9_$-]{0,127}$/.test(value)) fail(`${label} is invalid`);
  return value;
}
function sortedUnique(values, allowed, label) {
  if (!Array.isArray(values) || values.some((value) => !allowed.includes(value))) fail(`${label} contains an unsupported privilege`);
  const sorted = [...new Set(values)].sort();
  if (JSON.stringify(values) !== JSON.stringify(sorted)) fail(`${label} must be sorted and unique`);
  return sorted;
}
function sortByIdentity(values) {
  return [...values].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
}
function validateRuntimePrivilegeManifest(value, { requireEnrolled = true } = {}) {
  exactKeys(value, ["version", "status", "serverVersionNum", "extensions", "database", "schemas", "relations", "sequences", "types", "routines"], "runtime privilege manifest");
  if (value.version !== 1 || !["reviewed", "not-enrolled"].includes(value.status)) fail("runtime privilege manifest version or status is invalid");
  if (requireEnrolled && value.status !== "reviewed") fail("runtime privilege manifest is not reviewed and enrolled");
  if (!Number.isSafeInteger(value.serverVersionNum) || value.serverVersionNum < (value.status === "reviewed" ? 17e4 : 0)) fail("runtime server version is invalid");
  if (!Array.isArray(value.extensions)) fail("runtime extension inventory is invalid");
  const extensions = value.extensions.map((entry, index) => {
    exactKeys(entry, ["name", "version"], `runtime extension ${index}`);
    if (typeof entry.version !== "string" || entry.version.length === 0 || entry.version !== entry.version.trim()) fail(`runtime extension ${index} is invalid`);
    return { name: identifier(entry.name, `runtime extension ${index}.name`), version: entry.version };
  });
  if (JSON.stringify(extensions) !== JSON.stringify(sortByIdentity(extensions))) fail("runtime extensions must be canonically sorted");
  exactKeys(value.database, ["connect", "create", "temporary"], "runtime database privileges");
  if (value.database.connect !== true || value.database.create !== false || value.database.temporary !== false) fail("runtime database privileges are not least privilege");
  if (!Array.isArray(value.schemas) || !Array.isArray(value.relations) || !Array.isArray(value.sequences) || !Array.isArray(value.types) || !Array.isArray(value.routines)) fail("runtime privilege manifest collections are invalid");
  const schemas = value.schemas.map((entry, index) => {
    exactKeys(entry, ["schema", "usage", "create"], `runtime schema privilege ${index}`);
    if (entry.usage !== true || entry.create !== false) fail(`runtime schema privilege ${index} is not least privilege`);
    return { schema: identifier(entry.schema, `runtime schema privilege ${index}.schema`), usage: true, create: false };
  });
  const relations = value.relations.map((entry, index) => {
    exactKeys(entry, ["schema", "name", "kind", "privileges"], `runtime relation privilege ${index}`);
    if (!["f", "m", "p", "r", "v"].includes(entry.kind)) fail(`runtime relation privilege ${index}.kind is invalid`);
    const schema = identifier(entry.schema, `runtime relation privilege ${index}.schema`);
    const name = identifier(entry.name, `runtime relation privilege ${index}.name`);
    if (schema === "public" && name === "_prisma_migrations") fail("runtime privilege manifest must not grant migration-ledger access");
    return { schema, name, kind: entry.kind, privileges: sortedUnique(entry.privileges, RELATION_PRIVILEGES, `runtime relation privilege ${index}.privileges`) };
  });
  const sequences = value.sequences.map((entry, index) => {
    exactKeys(entry, ["schema", "name", "privileges"], `runtime sequence privilege ${index}`);
    return {
      schema: identifier(entry.schema, `runtime sequence privilege ${index}.schema`),
      name: identifier(entry.name, `runtime sequence privilege ${index}.name`),
      privileges: sortedUnique(entry.privileges, SEQUENCE_PRIVILEGES, `runtime sequence privilege ${index}.privileges`)
    };
  });
  const types2 = value.types.map((entry, index) => {
    exactKeys(entry, ["schema", "name", "usage"], `runtime type privilege ${index}`);
    if (entry.usage !== true) fail(`runtime type privilege ${index} is invalid`);
    return { schema: identifier(entry.schema, `runtime type privilege ${index}.schema`), name: identifier(entry.name, `runtime type privilege ${index}.name`), usage: true };
  });
  const routines = value.routines.map((entry, index) => {
    exactKeys(entry, ["schema", "identity", "execute", "owner", "securityDefiner", "leakproof", "configuration", "language", "kind", "volatility", "parallel", "definitionSha256"], `runtime routine privilege ${index}`);
    if (entry.execute !== true || typeof entry.identity !== "string" || entry.identity.length < 3 || entry.identity.length > 512 || entry.securityDefiner !== false || entry.leakproof !== false || !["a", "f", "p", "w"].includes(entry.kind) || !["i", "s", "v"].includes(entry.volatility) || !["r", "s", "u"].includes(entry.parallel) || !Array.isArray(entry.configuration) || entry.configuration.some((setting) => typeof setting !== "string" || setting.length === 0) || !/^[a-f0-9]{64}$/.test(entry.definitionSha256)) fail(`runtime routine privilege ${index} is invalid`);
    return {
      schema: identifier(entry.schema, `runtime routine privilege ${index}.schema`),
      identity: entry.identity,
      execute: true,
      owner: identifier(entry.owner, `runtime routine privilege ${index}.owner`),
      securityDefiner: entry.securityDefiner,
      leakproof: entry.leakproof,
      configuration: [...entry.configuration],
      language: identifier(entry.language, `runtime routine privilege ${index}.language`),
      kind: entry.kind,
      volatility: entry.volatility,
      parallel: entry.parallel,
      definitionSha256: entry.definitionSha256
    };
  });
  for (const [label, collection] of [["schemas", schemas], ["relations", relations], ["sequences", sequences], ["types", types2], ["routines", routines]]) {
    if (JSON.stringify(collection) !== JSON.stringify(sortByIdentity(collection))) fail(`runtime privilege manifest ${label} must be canonically sorted`);
  }
  return Object.freeze({ version: 1, status: value.status, serverVersionNum: value.serverVersionNum, extensions, database: { ...value.database }, schemas, relations, sequences, types: types2, routines });
}
function canonicalRuntimePrivilegeManifest(value, options) {
  return JSON.stringify(validateRuntimePrivilegeManifest(value, options));
}
function runtimePrivilegeManifestSha256(value, options) {
  return createHash6("sha256").update(canonicalRuntimePrivilegeManifest(value, options)).digest("hex");
}
function assertRuntimePrivilegeSnapshot(actual, expected) {
  const reviewed = validateRuntimePrivilegeManifest(expected);
  const observed = validateRuntimePrivilegeManifest({ ...actual, status: "reviewed" });
  if (JSON.stringify(observed) !== JSON.stringify(reviewed)) fail("effective runtime privileges do not exactly match the reviewed database-wide manifest");
  return { exact: true, manifestSha256: runtimePrivilegeManifestSha256(reviewed) };
}
function assertRuntimeRoleSafety(posture, expectedRole) {
  const keys = [
    "role",
    "superuser",
    "createRole",
    "createDatabase",
    "replication",
    "bypassRls",
    "databaseOwner",
    "ownsApplicationObjects",
    "ownsApplicationSchemas",
    "ownsApplicationRoutines",
    "ownsApplicationTypes",
    "hasGrantOptions",
    "hasReachableRoleMembership",
    "hasPredefinedRoleMembership",
    "hasApplicableDefaultPrivileges",
    "hasUnsupportedObjectPrivileges",
    "hasExplicitSystemAclPrivileges",
    "hasColumnPrivileges",
    "hasMaintainPrivilege"
  ];
  exactKeys(posture, keys, "runtime role safety posture");
  if (posture.role !== expectedRole) fail("connected runtime role does not match signed runtime target");
  for (const key of keys.slice(1)) if (posture[key] !== false) fail(`runtime role has forbidden posture: ${key}`);
  return { leastPrivilege: true };
}
var RUNTIME_PRIVILEGE_SNAPSHOT_SQL = Object.freeze({
  serverVersion: `SELECT current_setting('server_version_num')::int AS "serverVersionNum"`,
  extensions: `SELECT extname::text AS name, extversion::text AS version FROM pg_extension ORDER BY extname,extversion`,
  posture: `
    SELECT current_user::text AS role, r.rolsuper AS superuser, r.rolcreaterole AS "createRole",
      r.rolcreatedb AS "createDatabase", r.rolreplication AS replication, r.rolbypassrls AS "bypassRls",
      EXISTS (SELECT 1 FROM pg_database d WHERE NOT d.datistemplate AND pg_has_role(current_user,d.datdba,'MEMBER')) AS "databaseOwner",
      EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname !~ '^pg_' AND n.nspname<>'information_schema' AND pg_has_role(current_user,c.relowner,'MEMBER')) AS "ownsApplicationObjects",
      EXISTS (SELECT 1 FROM pg_namespace n WHERE n.nspname !~ '^pg_' AND n.nspname<>'information_schema' AND pg_has_role(current_user,n.nspowner,'MEMBER')) AS "ownsApplicationSchemas",
      EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname !~ '^pg_' AND n.nspname<>'information_schema' AND pg_has_role(current_user,p.proowner,'MEMBER')) AS "ownsApplicationRoutines",
      EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname !~ '^pg_' AND n.nspname<>'information_schema' AND pg_has_role(current_user,t.typowner,'MEMBER')) AS "ownsApplicationTypes",
      (EXISTS (SELECT 1 FROM pg_database object CROSS JOIN LATERAL aclexplode(COALESCE(object.datacl,acldefault('d',object.datdba))) acl WHERE object.datname=current_database() AND acl.is_grantable AND (acl.grantee=0 OR pg_has_role(current_user,acl.grantee,'MEMBER')))
       OR EXISTS (SELECT 1 FROM pg_namespace object CROSS JOIN LATERAL aclexplode(COALESCE(object.nspacl,acldefault('n',object.nspowner))) acl WHERE object.nspname !~ '^pg_' AND object.nspname<>'information_schema' AND acl.is_grantable AND (acl.grantee=0 OR pg_has_role(current_user,acl.grantee,'MEMBER')))
       OR EXISTS (SELECT 1 FROM pg_class object JOIN pg_namespace n ON n.oid=object.relnamespace CROSS JOIN LATERAL aclexplode(COALESCE(object.relacl,acldefault(CASE WHEN object.relkind='S' THEN 'S'::"char" ELSE 'r'::"char" END,object.relowner))) acl WHERE n.nspname !~ '^pg_' AND n.nspname<>'information_schema' AND object.relkind IN ('r','p','v','m','f','S') AND acl.is_grantable AND (acl.grantee=0 OR pg_has_role(current_user,acl.grantee,'MEMBER')))
       OR EXISTS (SELECT 1 FROM pg_attribute object JOIN pg_class c ON c.oid=object.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace CROSS JOIN LATERAL aclexplode(object.attacl) acl WHERE n.nspname !~ '^pg_' AND n.nspname<>'information_schema' AND object.attnum>0 AND NOT object.attisdropped AND acl.is_grantable AND (acl.grantee=0 OR pg_has_role(current_user,acl.grantee,'MEMBER')))
       OR EXISTS (SELECT 1 FROM pg_proc object JOIN pg_namespace n ON n.oid=object.pronamespace CROSS JOIN LATERAL aclexplode(COALESCE(object.proacl,acldefault('f',object.proowner))) acl WHERE n.nspname !~ '^pg_' AND n.nspname<>'information_schema' AND acl.is_grantable AND (acl.grantee=0 OR pg_has_role(current_user,acl.grantee,'MEMBER')))) AS "hasGrantOptions",
      EXISTS (SELECT 1 FROM pg_roles member WHERE member.rolname<>current_user AND pg_has_role(current_user,member.oid,'MEMBER')) AS "hasReachableRoleMembership",
      EXISTS (SELECT 1 FROM pg_roles member WHERE pg_has_role(current_user,member.oid,'MEMBER') AND member.rolname=ANY(ARRAY['pg_read_all_data','pg_write_all_data','pg_monitor','pg_read_all_settings','pg_read_all_stats','pg_stat_scan_tables','pg_signal_backend','pg_checkpoint','pg_maintain','pg_use_reserved_connections','pg_create_subscription']::text[])) AS "hasPredefinedRoleMembership",
      EXISTS (SELECT 1 FROM pg_default_acl d CROSS JOIN LATERAL aclexplode(d.defaclacl) acl WHERE acl.grantee=0 OR pg_has_role(current_user,acl.grantee,'MEMBER')) AS "hasApplicableDefaultPrivileges",
      (EXISTS (SELECT 1 FROM pg_largeobject_metadata o WHERE pg_has_role(current_user,o.lomowner,'MEMBER'))
       OR EXISTS (SELECT 1 FROM pg_largeobject_metadata o CROSS JOIN LATERAL aclexplode(o.lomacl) acl WHERE acl.grantee=0 OR pg_has_role(current_user,acl.grantee,'MEMBER'))
       OR EXISTS (SELECT 1 FROM pg_foreign_data_wrapper o WHERE pg_has_role(current_user,o.fdwowner,'MEMBER'))
       OR EXISTS (SELECT 1 FROM pg_foreign_data_wrapper o CROSS JOIN LATERAL aclexplode(o.fdwacl) acl WHERE acl.grantee=0 OR pg_has_role(current_user,acl.grantee,'MEMBER'))
       OR EXISTS (SELECT 1 FROM pg_foreign_server o WHERE pg_has_role(current_user,o.srvowner,'MEMBER'))
       OR EXISTS (SELECT 1 FROM pg_foreign_server o CROSS JOIN LATERAL aclexplode(o.srvacl) acl WHERE acl.grantee=0 OR pg_has_role(current_user,acl.grantee,'MEMBER'))
       OR EXISTS (SELECT 1 FROM pg_tablespace o WHERE pg_has_role(current_user,o.spcowner,'MEMBER'))
       OR EXISTS (SELECT 1 FROM pg_tablespace o CROSS JOIN LATERAL aclexplode(o.spcacl) acl WHERE acl.grantee=0 OR pg_has_role(current_user,acl.grantee,'MEMBER'))
       OR EXISTS (SELECT 1 FROM pg_parameter_acl o CROSS JOIN LATERAL aclexplode(o.paracl) acl WHERE acl.grantee=0 OR pg_has_role(current_user,acl.grantee,'MEMBER'))
       OR EXISTS (SELECT 1 FROM pg_user_mappings o WHERE o.umuser=0 OR o.usename=current_user)
       OR EXISTS (SELECT 1 FROM pg_extension o WHERE pg_has_role(current_user,o.extowner,'MEMBER'))
       OR EXISTS (SELECT 1 FROM pg_collation o WHERE pg_has_role(current_user,o.collowner,'MEMBER'))
       OR EXISTS (SELECT 1 FROM pg_conversion o WHERE pg_has_role(current_user,o.conowner,'MEMBER'))
       OR EXISTS (SELECT 1 FROM pg_operator o WHERE pg_has_role(current_user,o.oprowner,'MEMBER'))
       OR EXISTS (SELECT 1 FROM pg_opclass o WHERE pg_has_role(current_user,o.opcowner,'MEMBER'))
       OR EXISTS (SELECT 1 FROM pg_opfamily o WHERE pg_has_role(current_user,o.opfowner,'MEMBER'))
       OR EXISTS (SELECT 1 FROM pg_ts_config o WHERE pg_has_role(current_user,o.cfgowner,'MEMBER'))
       OR EXISTS (SELECT 1 FROM pg_ts_dict o WHERE pg_has_role(current_user,o.dictowner,'MEMBER'))
       OR EXISTS (SELECT 1 FROM pg_event_trigger o WHERE pg_has_role(current_user,o.evtowner,'MEMBER'))
       OR EXISTS (SELECT 1 FROM pg_publication o WHERE pg_has_role(current_user,o.pubowner,'MEMBER'))
       OR EXISTS (SELECT 1 FROM pg_subscription o WHERE pg_has_role(current_user,o.subowner,'MEMBER'))
       OR EXISTS (SELECT 1 FROM pg_statistic_ext o WHERE pg_has_role(current_user,o.stxowner,'MEMBER'))
       OR EXISTS (SELECT 1 FROM pg_language o WHERE pg_has_role(current_user,o.lanowner,'MEMBER'))
       OR EXISTS (SELECT 1 FROM pg_language o LEFT JOIN pg_init_privs ip ON ip.objoid=o.oid AND ip.classoid='pg_language'::regclass AND ip.objsubid=0 CROSS JOIN LATERAL aclexplode(COALESCE(o.lanacl,acldefault('l',o.lanowner))) acl WHERE o.lanname NOT IN ('sql','plpgsql') AND (acl.grantee=0 OR pg_has_role(current_user,acl.grantee,'MEMBER')) AND NOT EXISTS (SELECT 1 FROM aclexplode(COALESCE(ip.initprivs,acldefault('l',o.lanowner))) base WHERE base.grantee=acl.grantee AND base.privilege_type=acl.privilege_type AND (NOT acl.is_grantable OR base.is_grantable)))) AS "hasUnsupportedObjectPrivileges",
      (EXISTS (SELECT 1 FROM pg_namespace o LEFT JOIN pg_init_privs ip ON ip.objoid=o.oid AND ip.classoid='pg_namespace'::regclass AND ip.objsubid=0 CROSS JOIN LATERAL aclexplode(COALESCE(o.nspacl,acldefault('n',o.nspowner))) acl WHERE (o.nspname~'^pg_' OR o.nspname='information_schema') AND (acl.grantee=0 OR pg_has_role(current_user,acl.grantee,'MEMBER')) AND NOT (o.nspname='information_schema' AND o.nspowner=10 AND acl.grantee=0 AND acl.privilege_type='USAGE' AND NOT acl.is_grantable) AND NOT EXISTS (SELECT 1 FROM aclexplode(COALESCE(ip.initprivs,acldefault('n',o.nspowner))) base WHERE base.grantee=acl.grantee AND base.privilege_type=acl.privilege_type AND (NOT acl.is_grantable OR base.is_grantable)))
       OR EXISTS (SELECT 1 FROM pg_class o JOIN pg_namespace n ON n.oid=o.relnamespace LEFT JOIN pg_init_privs ip ON ip.objoid=o.oid AND ip.classoid='pg_class'::regclass AND ip.objsubid=0 CROSS JOIN LATERAL aclexplode(COALESCE(o.relacl,acldefault(CASE WHEN o.relkind='S' THEN 'S'::"char" ELSE 'r'::"char" END,o.relowner))) acl WHERE (n.nspname~'^pg_' OR n.nspname='information_schema') AND (acl.grantee=0 OR pg_has_role(current_user,acl.grantee,'MEMBER')) AND NOT (n.nspname='information_schema' AND o.relowner=10 AND acl.grantee=0 AND acl.privilege_type='SELECT' AND NOT acl.is_grantable) AND NOT EXISTS (SELECT 1 FROM aclexplode(COALESCE(ip.initprivs,acldefault(CASE WHEN o.relkind='S' THEN 'S'::"char" ELSE 'r'::"char" END,o.relowner))) base WHERE base.grantee=acl.grantee AND base.privilege_type=acl.privilege_type AND (NOT acl.is_grantable OR base.is_grantable)))
       OR EXISTS (SELECT 1 FROM pg_proc o JOIN pg_namespace n ON n.oid=o.pronamespace LEFT JOIN pg_init_privs ip ON ip.objoid=o.oid AND ip.classoid='pg_proc'::regclass AND ip.objsubid=0 CROSS JOIN LATERAL aclexplode(COALESCE(o.proacl,acldefault('f',o.proowner))) acl WHERE (n.nspname~'^pg_' OR n.nspname='information_schema') AND (acl.grantee=0 OR pg_has_role(current_user,acl.grantee,'MEMBER')) AND NOT EXISTS (SELECT 1 FROM aclexplode(COALESCE(ip.initprivs,acldefault('f',o.proowner))) base WHERE base.grantee=acl.grantee AND base.privilege_type=acl.privilege_type AND (NOT acl.is_grantable OR base.is_grantable)))
       OR EXISTS (SELECT 1 FROM pg_type o JOIN pg_namespace n ON n.oid=o.typnamespace LEFT JOIN pg_init_privs ip ON ip.objoid=o.oid AND ip.classoid='pg_type'::regclass AND ip.objsubid=0 CROSS JOIN LATERAL aclexplode(COALESCE(o.typacl,acldefault('T',o.typowner))) acl WHERE (n.nspname~'^pg_' OR n.nspname='information_schema') AND (acl.grantee=0 OR pg_has_role(current_user,acl.grantee,'MEMBER')) AND NOT EXISTS (SELECT 1 FROM aclexplode(COALESCE(ip.initprivs,acldefault('T',o.typowner))) base WHERE base.grantee=acl.grantee AND base.privilege_type=acl.privilege_type AND (NOT acl.is_grantable OR base.is_grantable)))) AS "hasExplicitSystemAclPrivileges",
      EXISTS (SELECT 1 FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace CROSS JOIN LATERAL aclexplode(a.attacl) acl WHERE n.nspname !~ '^pg_' AND n.nspname<>'information_schema' AND a.attnum>0 AND NOT a.attisdropped AND (acl.grantee=0 OR pg_has_role(current_user,acl.grantee,'MEMBER'))) AS "hasColumnPrivileges"
      , EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname !~ '^pg_' AND n.nspname<>'information_schema' AND c.relkind IN ('r','p','v','m','f') AND has_table_privilege(current_user,c.oid,'MAINTAIN')) AS "hasMaintainPrivilege"
    FROM pg_roles r WHERE r.rolname=current_user`,
  database: `SELECT has_database_privilege(current_user,current_database(),'CONNECT') AS connect, has_database_privilege(current_user,current_database(),'CREATE') AS create, has_database_privilege(current_user,current_database(),'TEMP') AS temporary`,
  schemas: `SELECT n.nspname::text AS schema, has_schema_privilege(current_user,n.oid,'USAGE') AS usage, has_schema_privilege(current_user,n.oid,'CREATE') AS create FROM pg_namespace n WHERE n.nspname !~ '^pg_' AND n.nspname<>'information_schema' AND (has_schema_privilege(current_user,n.oid,'USAGE') OR has_schema_privilege(current_user,n.oid,'CREATE')) ORDER BY n.nspname`,
  relations: `SELECT n.nspname::text AS schema, c.relname::text AS name, c.relkind::text AS kind, ARRAY_REMOVE(ARRAY[CASE WHEN has_table_privilege(current_user,c.oid,'DELETE') THEN 'DELETE' END,CASE WHEN has_table_privilege(current_user,c.oid,'INSERT') THEN 'INSERT' END,CASE WHEN has_table_privilege(current_user,c.oid,'REFERENCES') THEN 'REFERENCES' END,CASE WHEN has_table_privilege(current_user,c.oid,'SELECT') THEN 'SELECT' END,CASE WHEN has_table_privilege(current_user,c.oid,'TRIGGER') THEN 'TRIGGER' END,CASE WHEN has_table_privilege(current_user,c.oid,'TRUNCATE') THEN 'TRUNCATE' END,CASE WHEN has_table_privilege(current_user,c.oid,'UPDATE') THEN 'UPDATE' END],NULL)::text[] AS privileges FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind IN ('r','p','v','m','f') AND n.nspname !~ '^pg_' AND n.nspname<>'information_schema' AND (has_table_privilege(current_user,c.oid,'DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE')) ORDER BY n.nspname,c.relname,c.relkind`,
  sequences: `SELECT n.nspname::text AS schema, c.relname::text AS name, ARRAY_REMOVE(ARRAY[CASE WHEN has_sequence_privilege(current_user,c.oid,'SELECT') THEN 'SELECT' END,CASE WHEN has_sequence_privilege(current_user,c.oid,'UPDATE') THEN 'UPDATE' END,CASE WHEN has_sequence_privilege(current_user,c.oid,'USAGE') THEN 'USAGE' END],NULL)::text[] AS privileges FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind='S' AND n.nspname !~ '^pg_' AND n.nspname<>'information_schema' AND has_sequence_privilege(current_user,c.oid,'SELECT,UPDATE,USAGE') ORDER BY n.nspname,c.relname`,
  types: `SELECT n.nspname::text AS schema, t.typname::text AS name, true AS usage FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname !~ '^pg_' AND n.nspname<>'information_schema' AND has_type_privilege(current_user,t.oid,'USAGE') ORDER BY n.nspname,t.typname`,
  routines: `SELECT n.nspname::text AS schema, p.oid::regprocedure::text AS identity, true AS execute, owner.rolname::text AS owner, p.prosecdef AS "securityDefiner", p.proleakproof AS leakproof, COALESCE(p.proconfig,ARRAY[]::text[]) AS configuration, l.lanname::text AS language, p.prokind::text AS kind, p.provolatile::text AS volatility, p.proparallel::text AS parallel, pg_get_functiondef(p.oid)::text AS definition FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_roles owner ON owner.oid=p.proowner JOIN pg_language l ON l.oid=p.prolang WHERE n.nspname !~ '^pg_' AND n.nspname<>'information_schema' AND has_function_privilege(current_user,p.oid,'EXECUTE') ORDER BY n.nspname,p.oid::regprocedure::text`
});
function runtimePrivilegeSnapshotClientForRole(client, role) {
  if (typeof role !== "string" || !/^[a-z_][a-z0-9_]{0,62}$/.test(role)) fail("runtime role name is not a plain lowercase PostgreSQL identifier");
  const literal = `'${role}'::name`;
  const rewrite = (sql) => sql.replace(/current_user/g, literal).replace(/has_sequence_privilege\(([^,()]+),c\.oid,'([A-Z,]+)'\)/g, (match, subject, privilege) => `(CASE WHEN c.relkind='S' THEN has_sequence_privilege(${subject},c.oid,'${privilege}') ELSE false END)`);
  return { $queryRawUnsafe: (sql, ...params) => client.$queryRawUnsafe(rewrite(sql), ...params) };
}
async function inspectRuntimePrivilegeSnapshotForRole(client, role) {
  return inspectRuntimePrivilegeSnapshot(runtimePrivilegeSnapshotClientForRole(client, role));
}
async function inspectRuntimePrivilegeSnapshot(client) {
  const versions = await client.$queryRawUnsafe(RUNTIME_PRIVILEGE_SNAPSHOT_SQL.serverVersion);
  if (versions.length !== 1 || !Number.isSafeInteger(versions[0].serverVersionNum) || versions[0].serverVersionNum < 17e4) {
    fail("runtime privilege inspection requires the reviewed PostgreSQL 17 catalog contract");
  }
  const [extensions, postures, databases, schemas, relations, sequences, types2, routineRows] = await Promise.all([
    client.$queryRawUnsafe(RUNTIME_PRIVILEGE_SNAPSHOT_SQL.extensions),
    client.$queryRawUnsafe(RUNTIME_PRIVILEGE_SNAPSHOT_SQL.posture),
    client.$queryRawUnsafe(RUNTIME_PRIVILEGE_SNAPSHOT_SQL.database),
    client.$queryRawUnsafe(RUNTIME_PRIVILEGE_SNAPSHOT_SQL.schemas),
    client.$queryRawUnsafe(RUNTIME_PRIVILEGE_SNAPSHOT_SQL.relations),
    client.$queryRawUnsafe(RUNTIME_PRIVILEGE_SNAPSHOT_SQL.sequences),
    client.$queryRawUnsafe(RUNTIME_PRIVILEGE_SNAPSHOT_SQL.types),
    client.$queryRawUnsafe(RUNTIME_PRIVILEGE_SNAPSHOT_SQL.routines)
  ]);
  if (postures.length !== 1 || databases.length !== 1) fail("runtime privilege inspection returned an invalid identity cardinality");
  const routines = routineRows.map(({ definition, ...routine }) => ({
    ...routine,
    definitionSha256: createHash6("sha256").update(definition).digest("hex")
  }));
  return {
    posture: postures[0],
    manifest: {
      version: 1,
      status: "reviewed",
      serverVersionNum: versions[0].serverVersionNum,
      extensions: sortByIdentity(extensions),
      database: databases[0],
      schemas: sortByIdentity(schemas),
      relations: sortByIdentity(relations),
      sequences: sortByIdentity(sequences),
      types: sortByIdentity(types2),
      routines: sortByIdentity(routines)
    }
  };
}

// infrastructure/release-custody/owner-gate/database-evidence.mjs
var requireThat7 = (condition, message) => {
  if (!condition) throw new Error(message);
};
function productionReaderConfig(rawUrl, policy) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("Invalid production reader connection");
  }
  requireThat7(url.protocol === "postgresql:" || url.protocol === "postgres:", "PostgreSQL reader required");
  const allowedPooler = policy.hostname.replace(".", "-pooler.");
  requireThat7([policy.hostname, allowedPooler].includes(url.hostname) && (url.port === "" || url.port === "5432") && decodeURIComponent(url.pathname.slice(1)) === policy.database && decodeURIComponent(url.username) === policy.readerRole, "Production database identity differs from reviewed policy");
  requireThat7(policy.readerRole === "cadenza_census_ro" && /^[a-z0-9.-]+\.neon\.tech$/.test(policy.hostname) && url.password.length > 0, "Dedicated production census credential required");
  return { host: policy.hostname, port: 5432, database: policy.database, user: policy.readerRole, password: decodeURIComponent(url.password), ssl: { rejectUnauthorized: true }, options: "-c default_transaction_read_only=on", statement_timeout: 1e4, query_timeout: 15e3, connectionTimeoutMillis: 1e4, application_name: "cadenza-owner-release-observer" };
}
function createDatabaseEvidenceReader({ policy: sourcePolicy, readConnection, readCandidateMigrations, clientFactory = (config) => new esm_default.Client(config) }) {
  const policy = structuredClone(sourcePolicy);
  return async (bundle) => {
    const candidate = await readCandidateMigrations(bundle.releaseSha);
    requireThat7(candidate?.releaseSha === bundle.releaseSha && Array.isArray(candidate.entries) && candidate.entries.length > 0, "Exact source migration inventory required");
    const entries = candidate.entries.map((entry) => {
      requireThat7(entry && Object.keys(entry).sort().join(",") === "name,sha256" && /^[0-9A-Za-z_-]+$/.test(entry.name) && /^[a-f0-9]{64}$/.test(entry.sha256), "Invalid candidate migration");
      return { name: entry.name, sha256: entry.sha256 };
    }).sort((a, b) => a.name.localeCompare(b.name));
    const manifestSha256 = createHash7("sha256").update(JSON.stringify(entries.map((entry) => [entry.name, entry.sha256]))).digest("hex");
    requireThat7(manifestSha256 === bundle.manifestSha256 && bundle.ledgerSha256 === REVIEWED_CODE_RELEASE_LEDGER.ledgerSha256, "Release migration digests differ from reviewed state");
    const client = clientFactory(productionReaderConfig(await readConnection(), policy));
    try {
      await client.connect();
      await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
      const identity = await client.query("SELECT current_database() AS database,current_user AS role,current_setting('default_transaction_read_only') AS default_read_only,current_setting('transaction_read_only') AS transaction_read_only,current_setting('transaction_isolation') AS isolation");
      const row = identity.rows[0];
      requireThat7(identity.rows.length === 1 && row.database === policy.database && row.role === policy.readerRole && row.default_read_only === "on" && row.transaction_read_only === "on" && row.isolation === "repeatable read", "Consistent read-only production identity required");
      const ledger = await client.query(FESTIVAL_LEDGER_SQL);
      validateCodeReleaseProductionLedger(ledger.rows, entries);
      let queue = Promise.resolve();
      const adapter = { $queryRawUnsafe: (sql, ...params) => {
        const result = queue.then(() => client.query(sql, params)).then((value) => value.rows);
        queue = result;
        return result;
      } };
      const runtime = await inspectRuntimePrivilegeSnapshotForRole(adapter, policy.runtimeRole);
      assertRuntimeRoleSafety(runtime.posture, policy.runtimeRole);
      assertRuntimePrivilegeSnapshot(runtime.manifest, policy.runtimeManifest);
      await client.query("ROLLBACK");
      return { ledgerSha256: bundle.ledgerSha256, manifestSha256, pendingMigrations: 0, failedMigrations: 0, runtimePermissionsValid: true };
    } finally {
      await client.end();
    }
  };
}

// infrastructure/release-custody/owner-gate/schema-catalog.mjs
var catalogQueries = (() => {
  const enumSql = `SELECT format('CREATE TYPE public.%I AS ENUM (%s);',t.typname,string_agg(quote_literal(e.enumlabel),', ' ORDER BY e.enumsortorder)) AS ddl FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace JOIN pg_enum e ON e.enumtypid=t.oid WHERE n.nspname='public' GROUP BY t.oid,t.typname ORDER BY t.typname`;
  const tablesSql = `SELECT format('CREATE TABLE public.%I (%s);',c.relname,string_agg(format('%I %s%s%s',a.attname,format_type(a.atttypid,a.atttypmod),CASE WHEN a.attnotnull THEN ' NOT NULL' ELSE '' END,CASE WHEN d.oid IS NULL THEN '' ELSE ' DEFAULT '||pg_get_expr(d.adbin,d.adrelid) END),', ' ORDER BY a.attnum)) AS ddl FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped LEFT JOIN pg_attrdef d ON d.adrelid=c.oid AND d.adnum=a.attnum WHERE n.nspname='public' AND c.relkind='r' GROUP BY c.oid,c.relname ORDER BY c.relname`;
  const functionsSql = "SELECT pg_get_functiondef(p.oid)||';' AS ddl FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang WHERE n.nspname='public' AND p.prokind IN ('f','p') AND l.lanname IN ('sql','plpgsql') AND NOT EXISTS(SELECT 1 FROM pg_depend d WHERE d.classid='pg_proc'::regclass AND d.objid=p.oid AND d.deptype='e') ORDER BY p.oid";
  const constraintsSql = `SELECT format('ALTER TABLE public.%I ADD CONSTRAINT %I %s;',c.relname,k.conname,pg_get_constraintdef(k.oid,true)) AS ddl FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND k.contype IN ('p','u','f','c','x') ORDER BY CASE WHEN k.contype='f' THEN 1 ELSE 0 END,c.relname,k.conname`;
  const indexesSql = `SELECT pg_get_indexdef(i.indexrelid)||';' AS ddl FROM pg_index i JOIN pg_class c ON c.oid=i.indrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT EXISTS(SELECT 1 FROM pg_constraint k WHERE k.conindid=i.indexrelid AND k.contype IN ('p','u','x')) ORDER BY c.relname,i.indexrelid`;
  return [["enums", enumSql], ["tables", tablesSql], ["functions", functionsSql], ["constraints", constraintsSql.replace("('p','u','f','c','x')", "('p','u','c','x')")], ["indexes", indexesSql], ["foreignKeys", constraintsSql.replace("('p','u','f','c','x')", "('f')")]];
})();
var unsupportedCatalogQuery = `SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind NOT IN ('r','i') UNION ALL SELECT c.relname FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND (a.attidentity<>'' OR a.attgenerated<>'')`;

// infrastructure/release-custody/owner-gate/schema-evidence.mjs
var requireThat8 = (value, message) => {
  if (!value) throw new Error(message);
};
var sha256 = (value) => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
function createSchemaEvidenceReader({ policy: sourcePolicy, readConnection, readCandidateSchemas, clientFactory = (config) => new esm_default.Client(config) }) {
  const policy = structuredClone(sourcePolicy);
  const proof = policy.schemaProof;
  requireThat8(proof?.classification === "EXACT_REVIEWED_BASELINE" && [proof.schemaSha256, proof.confidentialSchemaSha256, proof.catalogDdlSha256, proof.classifierSha256].every(sha256), "Proven schema pairing required");
  return async (bundle) => {
    const candidate = await readCandidateSchemas(bundle.releaseSha);
    requireThat8(candidate?.releaseSha === bundle.releaseSha && candidate.schemaSha256 === proof.schemaSha256 && candidate.confidentialSchemaSha256 === proof.confidentialSchemaSha256, "Candidate schema differs from proven migration-free pairing");
    const client = clientFactory(productionReaderConfig(await readConnection(), policy));
    try {
      await client.connect();
      await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
      const identity = await client.query("SELECT current_database() AS database,current_user AS role,current_setting('transaction_read_only') AS read_only,current_setting('transaction_isolation') AS isolation");
      const row = identity.rows[0];
      requireThat8(identity.rows.length === 1 && row.database === policy.database && row.role === policy.readerRole && row.read_only === "on" && row.isolation === "repeatable read", "Consistent read-only schema observer required");
      requireThat8((await client.query(unsupportedCatalogQuery)).rows.length === 0, "Unproven catalog object shape");
      const ddl = [], counts = {};
      for (const [name, sql] of catalogQueries) {
        const rows = (await client.query(sql)).rows;
        requireThat8(Array.isArray(rows) && rows.every((item) => typeof item.ddl === "string" && item.ddl.length > 0), "Incomplete catalog projection");
        counts[name] = rows.length;
        ddl.push(...rows.map((item) => item.ddl));
      }
      const catalogDdlSha256 = digest(ddl.join("\n"));
      requireThat8(catalogDdlSha256 === proof.catalogDdlSha256 && Object.entries(proof.counts).every(([name, count]) => counts[name] === count), "Production schema catalog differs from proven pairing");
      await client.query("ROLLBACK");
      return { releaseSha: bundle.releaseSha, schemaMatches: true, schemaSha256: candidate.schemaSha256, confidentialSchemaSha256: candidate.confidentialSchemaSha256, catalogDdlSha256, scope: "Proven Prisma-model pairing; excludes behavioral verification of routines/triggers/RLS/data" };
    } finally {
      await client.end();
    }
  };
}

// infrastructure/release-custody/owner-gate/migration-free-observer.mjs
var requireThat9 = (value, message) => {
  if (!value) throw new Error(message);
};
function createMigrationFreeObserver({ github, database, schema, vercel, readCandidateSchemas, now = Date.now }) {
  return {
    async collect(bundle) {
      requireThat9(["OWNER_APPROVED_MIGRATION_FREE", "AUTOMATED_MIGRATION_FREE"].includes(bundle.mode), "Migration-free mode required");
      const observedAt = now();
      const [ci, ledger, shape, before, rollbackSchemas] = await Promise.all([
        github(bundle),
        database(bundle),
        schema(bundle),
        vercel.baseline(bundle),
        readCandidateSchemas(bundle.baselineSha)
      ]);
      requireThat9(ci.releaseSha === bundle.releaseSha && ci.ciRunId === bundle.ciRunId, "CI source mismatch");
      requireThat9(ledger.ledgerSha256 === bundle.ledgerSha256 && ledger.manifestSha256 === bundle.manifestSha256 && ledger.pendingMigrations === 0 && ledger.failedMigrations === 0 && ledger.runtimePermissionsValid === true, "Migration-free database proof required");
      requireThat9(shape.releaseSha === bundle.releaseSha && shape.schemaMatches === true && /^[a-f0-9]{64}$/.test(shape.schemaSha256) && /^[a-f0-9]{64}$/.test(shape.confidentialSchemaSha256), "Actual candidate schema proof required");
      requireThat9(rollbackSchemas.releaseSha === bundle.baselineSha && rollbackSchemas.schemaSha256 === shape.schemaSha256 && rollbackSchemas.confidentialSchemaSha256 === shape.confidentialSchemaSha256, "Baseline schema is not proven compatible for code-only rollback");
      const after = await vercel.baseline(bundle);
      for (const value of [before, after]) {
        requireThat9(value.baselineDeploymentId === bundle.baselineDeploymentId && value.baselineSha === bundle.baselineSha && value.projectId === bundle.projectId && value.teamId === bundle.teamId && value.environment === "production" && value.health === "healthy", "Healthy exact rollback deployment required");
      }
      requireThat9(before.baselineUrl === after.baselineUrl && typeof after.baselineUrl === "string" && after.baselineUrl.length > 0, "Rollback target changed while observing");
      requireThat9(now() >= observedAt && now() - observedAt <= 3e4, "Technical collection exceeded freshness window");
      return {
        observedAt,
        releaseSha: bundle.releaseSha,
        projectId: bundle.projectId,
        teamId: bundle.teamId,
        environment: "production",
        baselineDeploymentId: bundle.baselineDeploymentId,
        baselineSha: bundle.baselineSha,
        ledgerSha256: ledger.ledgerSha256,
        manifestSha256: ledger.manifestSha256,
        ciRunId: ci.ciRunId,
        mainSha: ci.mainSha,
        ciConclusion: ci.ciConclusion,
        ciEvent: ci.ciEvent,
        ciBranch: ci.ciBranch,
        workflowSha256: ci.workflowSha256,
        checks: ci.checks,
        pendingMigrations: 0,
        failedMigrations: 0,
        runtimePermissionsValid: true,
        schemaMatches: true,
        health: "healthy",
        recoveryEvidenceValid: true,
        schemaProof: shape,
        recovery: { kind: "APPLICATION_ROLLBACK_IDENTICAL_MODEL_NO_MIGRATIONS", baselineDeploymentId: bundle.baselineDeploymentId, baselineSha: bundle.baselineSha, baselineUrl: after.baselineUrl, schemaSha256: rollbackSchemas.schemaSha256, confidentialSchemaSha256: rollbackSchemas.confidentialSchemaSha256, databaseRestoreVerified: false }
      };
    }
  };
}

// scripts/lib/production-deployment-verification.mjs
var ProductionDeploymentVerificationError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "ProductionDeploymentVerificationError";
  }
};
function fail2(message) {
  throw new ProductionDeploymentVerificationError(message);
}
function parseJson(raw, context) {
  if (typeof raw !== "string" || raw.length === 0) fail2(`${context} must be exact JSON`);
  try {
    return JSON.parse(raw);
  } catch {
    fail2(`${context} must be exact JSON`);
  }
}
function parseVercelDeployJson(raw) {
  const parsed = parseJson(raw, "Vercel deploy --format=json output");
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    fail2("Vercel deploy --format=json output is not a pinned v50.38.2 deployment object");
  }
  const isWrapper = parsed.deployment !== void 0 || parsed.status !== void 0;
  if (isWrapper && (parsed.status !== "ok" || !parsed.deployment || typeof parsed.deployment !== "object" || Array.isArray(parsed.deployment))) {
    fail2("Vercel deploy --format=json output is not the pinned v50.38.2 success wrapper");
  }
  const deployment = isWrapper ? parsed.deployment : parsed;
  if (deployment.error !== void 0) fail2("Vercel deploy --format=json output reports a deployment error");
  if (deployment.readyState !== void 0 && !/^(READY|QUEUED|BUILDING|INITIALIZING)$/.test(String(deployment.readyState))) {
    fail2("Vercel deploy --format=json output reports a non-success ready state");
  }
  const { id, url, deploymentApiUrl } = deployment;
  if (typeof id !== "string" || !/^dpl_[A-Za-z0-9]+$/.test(id)) fail2("Vercel deploy output deployment ID is invalid");
  let immutable;
  let api;
  try {
    immutable = new URL(url);
    api = new URL(deploymentApiUrl);
  } catch {
    fail2("Vercel deploy output URLs are invalid");
  }
  if (immutable.protocol !== "https:" || immutable.username || immutable.password || immutable.port || immutable.pathname !== "/" || immutable.search || immutable.hash || !immutable.hostname.endsWith(".vercel.app")) fail2("Vercel deploy output immutable URL is invalid");
  if (api.origin !== "https://api.vercel.com" || api.username || api.password || api.port || api.pathname !== `/v13/deployments/${id}` || api.search || api.hash) {
    fail2("Vercel deploy output trusted deployment API URL is invalid");
  }
  return Object.freeze({ deploymentId: id, deploymentUrl: immutable.hostname, deploymentApiUrl: api.href });
}
function parseTrustedVercelApiJson(raw, context = "Vercel deployment API response") {
  const value = parseJson(raw, context);
  deploymentId(value, context);
  if (value.projectId === void 0 || value.teamId === void 0 && value.team?.id === void 0 || value.gitSource?.sha === void 0 && value.meta?.githubCommitSha === void 0) {
    fail2(`${context} omits project, team, or release SHA and is not trusted deployment metadata`);
  }
  return value;
}
function requiredString(value, context) {
  if (typeof value !== "string" || value.length === 0 || value !== value.trim()) {
    fail2(`${context} must be a non-empty exact string`);
  }
  return value;
}
function deploymentId(deployment, context) {
  if (!deployment || typeof deployment !== "object" || Array.isArray(deployment)) {
    fail2(`${context} must be trusted Vercel deployment metadata`);
  }
  if (deployment.id !== void 0 && deployment.uid !== void 0 && deployment.id !== deployment.uid) {
    fail2(`${context} contains conflicting deployment IDs`);
  }
  const id = deployment.id ?? deployment.uid;
  if (typeof id !== "string" || !/^dpl_[A-Za-z0-9]+$/.test(id)) {
    fail2(`${context} deployment ID is invalid`);
  }
  return id;
}
function deploymentUrl(deployment, context) {
  const url = deployment?.url;
  if (typeof url !== "string" || url.length === 0 || url !== url.trim()) {
    fail2(`${context} immutable deployment URL is invalid`);
  }
  let parsed;
  try {
    parsed = new URL(`https://${url}`);
  } catch {
    fail2(`${context} immutable deployment URL is invalid`);
  }
  if (parsed.hostname !== url || parsed.protocol !== "https:" || !parsed.hostname.endsWith(".vercel.app")) {
    fail2(`${context} immutable deployment URL must be an exact Vercel hostname without a scheme, path, query, or fragment`);
  }
  return url;
}
function deploymentTeamId(deployment, context) {
  const nestedTeamId = deployment?.team?.id;
  if (deployment?.teamId !== void 0 && nestedTeamId !== void 0 && deployment.teamId !== nestedTeamId) {
    fail2(`${context} contains conflicting team IDs`);
  }
  return deployment?.teamId ?? nestedTeamId;
}
function deploymentSha(deployment, context) {
  const gitSourceSha = deployment?.gitSource?.sha;
  const metadataSha = deployment?.meta?.githubCommitSha;
  if (gitSourceSha !== void 0 && metadataSha !== void 0 && gitSourceSha !== metadataSha) {
    fail2(`${context} contains conflicting release SHAs`);
  }
  return gitSourceSha ?? metadataSha;
}
function verifyExactDeployment({
  deployment,
  context,
  expectedDeploymentId,
  expectedDeploymentUrl,
  expectedProjectId,
  expectedTeamId,
  expectedReleaseSha
}) {
  const id = deploymentId(deployment, context);
  const url = deploymentUrl(deployment, context);
  if (id !== expectedDeploymentId || url !== expectedDeploymentUrl) {
    fail2(`${context} does not match the expected immutable deployment identity`);
  }
  if (deployment.readyState !== "READY" || deployment.target !== "production") {
    fail2(`${context} is not a READY production deployment`);
  }
  if (deployment.projectId !== expectedProjectId || deploymentTeamId(deployment, context) !== expectedTeamId) {
    fail2(`${context} does not match the exact Vercel project and team`);
  }
  if (deploymentSha(deployment, context) !== expectedReleaseSha) {
    fail2(`${context} does not match the exact release SHA`);
  }
  return { id, url };
}
function verifyInputs({
  expectedDeploymentId,
  expectedDeploymentUrl,
  expectedProjectId,
  expectedTeamId,
  expectedReleaseSha
}) {
  if (!/^dpl_[A-Za-z0-9]+$/.test(requiredString(expectedDeploymentId, "expected deployment ID"))) {
    fail2("expected deployment ID is invalid");
  }
  deploymentUrl({ url: requiredString(expectedDeploymentUrl, "expected deployment URL") }, "expected");
  requiredString(expectedProjectId, "expected project ID");
  requiredString(expectedTeamId, "expected team ID");
  if (!/^[a-f0-9]{40}$/.test(requiredString(expectedReleaseSha, "expected release SHA"))) {
    fail2("expected release SHA must be a full lowercase Git commit SHA");
  }
}
function verifyDeploymentAndAlias(input, label) {
  verifyInputs(input);
  const expected = {
    expectedDeploymentId: input.expectedDeploymentId,
    expectedDeploymentUrl: input.expectedDeploymentUrl,
    expectedProjectId: input.expectedProjectId,
    expectedTeamId: input.expectedTeamId,
    expectedReleaseSha: input.expectedReleaseSha
  };
  const direct = verifyExactDeployment({ deployment: input.deployment, context: `${label} deployment`, ...expected });
  const alias = verifyExactDeployment({ deployment: input.aliasDeployment, context: `${label} production alias`, ...expected });
  if (alias.id !== direct.id) fail2(`${label} production alias does not resolve to the exact deployment ID`);
  return Object.freeze({
    deploymentId: direct.id,
    deploymentUrl: direct.url,
    releaseSha: input.expectedReleaseSha,
    projectId: input.expectedProjectId,
    teamId: input.expectedTeamId,
    readyState: "READY",
    target: "production"
  });
}
function verifyNewProductionDeployment(input) {
  const previousDeploymentId = requiredString(input?.previousDeploymentId, "previous deployment ID");
  const previousDeploymentUrl = requiredString(input?.previousDeploymentUrl, "previous deployment URL");
  deploymentId({ id: previousDeploymentId }, "previous");
  deploymentUrl({ url: previousDeploymentUrl }, "previous");
  if (input?.expectedDeploymentId === previousDeploymentId || input?.expectedDeploymentUrl === previousDeploymentUrl) {
    fail2("new production deployment must have a new immutable deployment ID and URL");
  }
  return verifyDeploymentAndAlias(input, "new");
}
function verifyProductionRollback(input) {
  const verified = verifyDeploymentAndAlias(input, "rollback");
  return Object.freeze({ ...verified, aliasDeploymentId: verified.deploymentId });
}

// infrastructure/release-custody/owner-gate/vercel-evidence.mjs
var requireThat10 = (value, message) => {
  if (!value) throw new Error(message);
};
function createVercelEvidenceReader({ projectId, teamId, productionHost, readToken, fetchImpl = fetch, now = Date.now, wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)), completionTimeoutMs = 45 * 6e4, pollIntervalMs = 15e3 }) {
  requireThat10(/^prj_[a-zA-Z0-9]+$/.test(projectId) && /^team_[a-zA-Z0-9]+$/.test(teamId), "Pinned Vercel target required");
  requireThat10(/^[a-z0-9]+(?:[.-][a-z0-9]+)*\.[a-z]{2,}$/.test(productionHost), "Pinned production hostname required");
  requireThat10(Number.isInteger(completionTimeoutMs) && completionTimeoutMs > 0 && completionTimeoutMs <= 45 * 6e4 && Number.isInteger(pollIntervalMs) && pollIntervalMs > 0 && pollIntervalMs <= 6e4, "Bounded provider observation required");
  async function deployment(id) {
    requireThat10(id === productionHost || /^dpl_[a-zA-Z0-9]+$/.test(id), "Invalid deployment lookup");
    const token = await readToken();
    requireThat10(typeof token === "string" && token.length > 0, "Vercel reader credential unavailable");
    const result = await fetchImpl(`https://api.vercel.com/v13/deployments/${encodeURIComponent(id)}?teamId=${encodeURIComponent(teamId)}`, { method: "GET", redirect: "error", cache: "no-store", signal: AbortSignal.timeout(3e4), headers: { authorization: `Bearer ${token}`, accept: "application/json" } });
    requireThat10(result.ok, "Vercel deployment lookup failed");
    return parseTrustedVercelApiJson(await result.text());
  }
  async function health() {
    const result = await fetchImpl(`https://${productionHost}/api/health`, { method: "GET", redirect: "error", cache: "no-store", signal: AbortSignal.timeout(1e4), headers: { accept: "application/json" } });
    requireThat10(result.status === 200, "Production health failed");
    const body = await result.json(), timestamp = Date.parse(body.time);
    requireThat10(body.ok === true && body.status === "ok" && body.services?.database === "ok" && Number.isFinite(timestamp) && timestamp <= now() + 5e3 && now() - timestamp < 3e4, "Fresh database health required");
    return "healthy";
  }
  function target(bundle) {
    requireThat10(bundle.projectId === projectId && bundle.teamId === teamId && bundle.environment === "production", "Wrong production target");
  }
  return {
    async baseline(bundle) {
      target(bundle);
      const observedAt = now();
      const [direct, healthy] = await Promise.all([deployment(bundle.baselineDeploymentId), health()]);
      const alias = await deployment(productionHost);
      const verified = verifyProductionRollback({ deployment: direct, aliasDeployment: alias, expectedDeploymentId: bundle.baselineDeploymentId, expectedDeploymentUrl: direct.url, expectedProjectId: projectId, expectedTeamId: teamId, expectedReleaseSha: bundle.baselineSha });
      return { observedAt, projectId, teamId, environment: "production", baselineDeploymentId: verified.deploymentId, baselineSha: verified.releaseSha, baselineUrl: verified.deploymentUrl, health: healthy };
    },
    async verifyNew(bundle, deploymentId2, previousDeploymentUrl) {
      target(bundle);
      requireThat10(deploymentId2 !== bundle.baselineDeploymentId, "Expected a new immutable deployment");
      const deadline = now() + completionTimeoutMs;
      let verified;
      for (let attempt = 0; ; attempt++) {
        const direct = await deployment(deploymentId2);
        requireThat10((direct.id ?? direct.uid) === deploymentId2 && direct.projectId === projectId && (direct.teamId ?? direct.team?.id) === teamId && (direct.teamId === void 0 || direct.team?.id === void 0 || direct.teamId === direct.team.id) && direct.target === "production", "Pending deployment target mismatch");
        requireThat10((direct.gitSource?.sha ?? direct.meta?.githubCommitSha) === bundle.releaseSha && (direct.gitSource?.sha === void 0 || direct.meta?.githubCommitSha === void 0 || direct.gitSource.sha === direct.meta.githubCommitSha), "Pending deployment source mismatch");
        if (bundle.version === 2) requireThat10(direct.meta?.cadenzaArtifactSha256 === bundle.artifactSha256, "Production artifact digest mismatch");
        requireThat10(["QUEUED", "INITIALIZING", "BUILDING", "READY"].includes(direct.readyState), "Provider deployment failed or has an unknown state");
        if (direct.readyState === "READY") {
          const alias = await deployment(productionHost);
          if ((alias.id ?? alias.uid) === deploymentId2) {
            verified = verifyNewProductionDeployment({ deployment: direct, aliasDeployment: alias, expectedDeploymentId: deploymentId2, expectedDeploymentUrl: direct.url, expectedProjectId: projectId, expectedTeamId: teamId, expectedReleaseSha: bundle.releaseSha, previousDeploymentId: bundle.baselineDeploymentId, previousDeploymentUrl });
            if (bundle.version === 2) requireThat10(alias.meta?.cadenzaArtifactSha256 === bundle.artifactSha256, "Production alias artifact digest mismatch");
            await health();
            break;
          }
          verifyProductionRollback({ deployment: alias, aliasDeployment: alias, expectedDeploymentId: bundle.baselineDeploymentId, expectedDeploymentUrl: previousDeploymentUrl, expectedProjectId: projectId, expectedTeamId: teamId, expectedReleaseSha: bundle.baselineSha });
        }
        requireThat10(now() < deadline && attempt < Math.ceil(completionTimeoutMs / pollIntervalMs), "Provider completion timed out; retain claim and reconcile existing deployment");
        await wait(Math.min(pollIntervalMs, deadline - now()));
      }
      return { deploymentId: verified.deploymentId, releaseSha: verified.releaseSha, projectId, teamId, environment: "production", ...bundle.version === 2 ? { artifactSha256: bundle.artifactSha256 } : {} };
    }
  };
}

// infrastructure/release-custody/owner-gate/postgres-ledger.mjs
var requireThat11 = (value, message) => {
  if (!value) throw new Error(message);
};
function createPostgresReleaseLedger({ query, policy: sourcePolicy, now = Date.now }) {
  const policy = structuredClone(sourcePolicy);
  const target = `${policy.teamId}/${policy.projectId}/production`;
  return {
    async consume({ rawBundle, approval, evidence }) {
      const bundle = parseBundle(rawBundle, policy, now());
      requireThat11(approval?.provider === "github" && approval.controlRepository === policy.controlRepository && approval.gateSha === policy.gateSha && approval.ownerId === policy.ownerId && approval.environmentId === policy.environmentId, "Wrong approval authority");
      requireThat11(Number.isSafeInteger(approval.runId) && approval.runId > 0 && approval.runAttempt === 1 && approval.consumptionKey === `${policy.controlRepository}:${approval.runId}:1`, "Invalid consumption binding");
      requireThat11(approval.releaseSha === bundle.releaseSha && approval.bundleSha256 === digest(rawBundle) && approval.expiresAt === bundle.expiresAt, "Wrong approved bundle");
      requireThat11(evidence && typeof evidence === "object" && !Array.isArray(evidence), "Verified evidence required");
      const result = await query("SELECT release_gate.consume($1,$2,$3,$4,$5,$6,$7,$8,$9) AS committed", [approval.consumptionKey, target, bundle.releaseSha, approval.bundleSha256, bundle.nonce, digest(JSON.stringify(evidence)), digest(JSON.stringify(approval)), bundle.issuedAt, bundle.expiresAt]);
      requireThat11(result.rows?.length === 1 && typeof result.rows[0].committed === "boolean", "Invalid ledger response");
      return { committed: result.rows[0].committed, consumptionKey: approval.consumptionKey };
    },
    async finish({ consumptionKey, receipt }) {
      requireThat11(receipt?.teamId === policy.teamId && receipt.projectId === policy.projectId && receipt.environment === "production" && /^[a-f0-9]{40}$/.test(receipt.releaseSha) && /^dpl_[A-Za-z0-9]+$/.test(receipt.deploymentId), "Wrong deployment receipt target");
      const result = await query("SELECT release_gate.finish($1,$2,$3,$4::jsonb) AS committed", [consumptionKey, target, receipt.releaseSha, JSON.stringify(receipt)]);
      requireThat11(result.rows?.length === 1 && typeof result.rows[0].committed === "boolean", "Invalid ledger response");
      return result.rows[0].committed;
    }
  };
}

// infrastructure/release-custody/owner-gate/artifact-provenance.mjs
import { readFile } from "node:fs/promises";
import { isAbsolute } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
var execute = promisify(execFile);
var requireThat12 = (value, message) => {
  if (!value) throw new Error(message);
};
function createArtifactProvenanceVerifier({ policy: sourcePolicy, manifestPath, attestationPath, runVerifier }) {
  const policy = structuredClone(sourcePolicy);
  requireThat12(/^[\w.-]+\/[\w.-]+$/.test(policy.controlRepository) && /^[a-f0-9]{40}$/.test(policy.gateSha), "Reviewed attester identity required");
  requireThat12(policy.attesterWorkflow === ".github/workflows/prebuilt-builder.yml", "Pinned attester workflow required");
  requireThat12(isAbsolute(manifestPath) && isAbsolute(attestationPath), "Private absolute artifact paths required");
  return async (bundle) => {
    const raw = await readFile(manifestPath, "utf8");
    const manifest = JSON.parse(raw);
    requireThat12(bundle.version === 2 && manifest.version === 1 && manifest.releaseSha === bundle.releaseSha && manifest.target === "production" && Array.isArray(manifest.files) && digest(raw) === bundle.artifactSha256, "Manifest differs from approved artifact");
    const args = [
      "attestation",
      "verify",
      manifestPath,
      "--bundle",
      attestationPath,
      "--repo",
      policy.controlRepository,
      "--signer-workflow",
      `${policy.controlRepository}/${policy.attesterWorkflow}`,
      "--signer-digest",
      policy.gateSha,
      "--source-digest",
      policy.gateSha,
      "--source-ref",
      "refs/heads/main",
      "--deny-self-hosted-runners",
      "--cert-oidc-issuer",
      "https://token.actions.githubusercontent.com",
      "--predicate-type",
      "https://slsa.dev/provenance/v1",
      "--format",
      "json"
    ];
    const verified = JSON.parse(await runVerifier(args));
    requireThat12(Array.isArray(verified) && verified.length > 0, "No verified provider attestation");
    requireThat12(verified.some((entry) => entry.verificationResult?.statement?.subject?.some((subject) => subject.digest?.sha256 === bundle.artifactSha256)), "Verified attestation does not cover approved manifest");
    return Object.freeze({ verified: true, releaseSha: bundle.releaseSha, artifactSha256: bundle.artifactSha256, attesterRepository: policy.controlRepository, attesterSha: policy.gateSha });
  };
}

// infrastructure/release-custody/owner-gate/vercel-prebuilt.mjs
import { mkdtemp, mkdir, cp, writeFile, rm } from "node:fs/promises";
import { join as join2, isAbsolute as isAbsolute2 } from "node:path";
import { tmpdir } from "node:os";
import { execFile as execFile2 } from "node:child_process";
import { promisify as promisify2 } from "node:util";

// infrastructure/release-custody/owner-gate/prebuilt-artifact.mjs
import { lstat, readdir, open, realpath, readFile as readFile2 } from "node:fs/promises";
import { join, relative, basename } from "node:path";
import { constants } from "node:fs";
import { createHash as createHash8 } from "node:crypto";
var requireThat13 = (value, message) => {
  if (!value) throw new Error(message);
};
async function inspectPrebuiltArtifact({ outputRoot, releaseSha }) {
  requireThat13(/^[a-f0-9]{40}$/.test(releaseSha), "Exact artifact source required");
  const rootStat = await lstat(outputRoot);
  requireThat13(rootStat.isDirectory() && !rootStat.isSymbolicLink(), "Materialized artifact root required");
  const root = await realpath(outputRoot), files = [];
  let totalBytes = 0;
  async function visit(directory) {
    for (const name of await readdir(directory)) {
      const path = join(directory, name), stat = await lstat(path);
      const key = relative(root, path).split("\\").join("/");
      requireThat13(!stat.isSymbolicLink(), `Artifact symlink refused: ${key}`);
      requireThat13(!key.startsWith("../") && !/[\u0000-\u001f\u007f]/.test(key) && !name.includes("\\"), "Invalid artifact path");
      requireThat13(!/^\.env(?:\.|$)/i.test(basename(path)), "Environment file in artifact");
      if (stat.isDirectory()) {
        await visit(path);
        continue;
      }
      requireThat13(stat.isFile() && stat.nlink === 1, "Regular non-shared artifact file required");
      requireThat13(files.length < 1e5 && (totalBytes += stat.size) <= 8 * 1024 ** 3, "Artifact resource limit exceeded");
      const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
      try {
        const before = await handle.stat();
        requireThat13(before.ino === stat.ino && before.dev === stat.dev && before.size === stat.size, "Artifact changed while opening");
        const hash2 = createHash8("sha256");
        for await (const bytes of handle.createReadStream({ autoClose: false })) hash2.update(bytes);
        const after = await handle.stat();
        requireThat13(after.size === before.size && after.mtimeMs === before.mtimeMs && after.ctimeMs === before.ctimeMs, "Artifact changed while hashing");
        files.push({ path: key, size: before.size, sha256: hash2.digest("hex"), executable: (before.mode & 73) !== 0 });
      } finally {
        await handle.close();
      }
    }
  }
  await visit(root);
  files.sort((a, b) => Buffer.compare(Buffer.from(a.path), Buffer.from(b.path)));
  requireThat13(files.length > 0 && files.some((file) => file.path === "config.json"), "Build Output API configuration missing");
  const filePaths = new Set(files.map((file) => file.path));
  for (const file of files.filter((item) => basename(item.path) === ".vc-config.json")) {
    const functionConfig = JSON.parse(await readFile2(join(root, file.path), "utf8"));
    if (functionConfig.filePathMap === void 0) continue;
    requireThat13(functionConfig.filePathMap !== null && typeof functionConfig.filePathMap === "object" && !Array.isArray(functionConfig.filePathMap), "Invalid function dependency map");
    for (const dependency of Object.values(functionConfig.filePathMap)) {
      requireThat13(typeof dependency === "string" && dependency.startsWith(".vercel/output/") && !dependency.includes("\\") && !dependency.split("/").includes(".."), "Function dependency outside standalone output; build with --standalone");
      const key = dependency.slice(".vercel/output/".length);
      requireThat13(filePaths.has(key), "Function dependency missing from artifact");
    }
  }
  const manifest = { version: 1, releaseSha, target: "production", files };
  return { manifest, artifactSha256: digest(JSON.stringify(manifest)), fileCount: files.length, totalBytes };
}
async function verifyApprovedPrebuiltArtifact({ outputRoot, bundle }) {
  requireThat13(bundle?.version === 2 && /^[a-f0-9]{64}$/.test(bundle.artifactSha256), "Artifact-bound approval required; legacy bundle refused");
  const result = await inspectPrebuiltArtifact({ outputRoot, releaseSha: bundle.releaseSha });
  requireThat13(result.artifactSha256 === bundle.artifactSha256, "Prebuilt artifact differs from approved bundle");
  return result;
}

// infrastructure/release-custody/owner-gate/vercel-prebuilt.mjs
var requireThat14 = (value, message) => {
  if (!value) throw new Error(message);
};
var execute2 = promisify2(execFile2);
function createVercelPrebuiltDeployer({ policy: sourcePolicy, outputRoot, verifyProvenance, runCli, baseline, now = Date.now }) {
  const policy = structuredClone(sourcePolicy);
  requireThat14(/^prj_[A-Za-z0-9]+$/.test(policy.projectId) && /^team_[A-Za-z0-9]+$/.test(policy.teamId), "Pinned provider target required");
  requireThat14(typeof verifyProvenance === "function" && typeof runCli === "function", "Trusted provenance and upload adapters required");
  return {
    async deploy({ bundle, approval, beforePromotion }) {
      const raw = JSON.stringify(bundle);
      parseBundle(raw, policy, now());
      requireThat14(bundle.version === 2 && approval?.bundleSha256 === digest(raw) && approval.releaseSha === bundle.releaseSha && typeof beforePromotion === "function", "Exact consumed artifact approval required");
      const provenance = await verifyProvenance(bundle);
      requireThat14(provenance?.releaseSha === bundle.releaseSha && provenance.artifactSha256 === bundle.artifactSha256 && provenance.verified === true, "Trusted artifact provenance missing");
      await verifyApprovedPrebuiltArtifact({ outputRoot, bundle });
      const workspace = await mkdtemp(join2(tmpdir(), "cadenza-protected-upload-"));
      try {
        const cwd = join2(workspace, "project"), home = join2(workspace, "home");
        await mkdir(join2(cwd, ".vercel"), { recursive: true, mode: 448 });
        await mkdir(home, { mode: 448 });
        await cp(outputRoot, join2(cwd, ".vercel/output"), { recursive: true, dereference: false, errorOnExist: true, force: false });
        await verifyApprovedPrebuiltArtifact({ outputRoot: join2(cwd, ".vercel/output"), bundle });
        await writeFile(join2(cwd, ".vercel/project.json"), JSON.stringify({ orgId: policy.teamId, projectId: policy.projectId }), { flag: "wx", mode: 384 });
        await beforePromotion();
        await baseline(bundle);
        parseBundle(raw, policy, now());
        const args = [
          "deploy",
          "--prebuilt",
          "--archive=tgz",
          "--no-wait",
          "--prod",
          "--yes",
          "--format=json",
          "--scope",
          policy.teamId,
          "--meta",
          `githubCommitSha=${bundle.releaseSha}`,
          "--meta",
          `cadenzaArtifactSha256=${bundle.artifactSha256}`,
          "--meta",
          `cadenzaBundleSha256=${approval.bundleSha256}`
        ];
        const result = parseVercelDeployJson(await runCli({ cwd, home, args, beforeStart: () => parseBundle(raw, policy, now()) }));
        requireThat14(result.deploymentId !== bundle.baselineDeploymentId, "Provider returned baseline deployment");
        return { ...result, artifactSha256: bundle.artifactSha256 };
      } finally {
        await rm(workspace, { recursive: true, force: true });
      }
    }
  };
}

// infrastructure/release-custody/owner-gate/github-permissions.mjs
var requireThat15 = (value, message) => {
  if (!value) throw new Error(message);
};
function assertOwnerControlledPolicy(policy) {
  requireThat15(policy?.governanceModel === "AUTOMATED_OWNER_POLICY", "Owner-controlled governance is not enrolled");
  requireThat15(Number.isSafeInteger(policy.ownerId) && policy.ownerId > 0, "Explicit release owner required");
  requireThat15(policy.controlRepository !== policy.repository && policy.approvalEnvironment === "owner-release", "Protected release boundary required");
  return true;
}

// infrastructure/release-custody/owner-gate/control-runtime.mjs
function createControlReleaseRuntime({
  policy: sourcePolicy,
  productionPolicy,
  readSourceJson,
  readControlJson,
  readProductionConnection,
  readVercelObserverToken,
  ledgerQuery,
  outputRoot,
  manifestPath,
  attestationPath,
  runAttestationVerifier,
  runPrebuiltCli,
  fetchImpl = fetch,
  now = Date.now
}) {
  const policy = structuredClone(sourcePolicy);
  if (policy.enabled !== true || policy.deploymentCredentialsAttached !== true) throw Error("Control enrollment disabled");
  assertOwnerControlledPolicy(policy);
  const readCandidateSchemas = createGithubSchemaReader({ repository: policy.repository, readJson: readSourceJson });
  const readCandidateMigrations = createGithubMigrationReader({ repository: policy.repository, readJson: readSourceJson });
  const vercel = createVercelEvidenceReader({
    projectId: policy.projectId,
    teamId: policy.teamId,
    productionHost: policy.productionHost,
    readToken: readVercelObserverToken,
    fetchImpl,
    now
  });
  const composedObserver = createMigrationFreeObserver({
    github: createGithubEvidenceReader({ repository: policy.repository, workflowPath: ".github/workflows/ci.yml", readJson: readSourceJson }),
    database: createDatabaseEvidenceReader({ policy: productionPolicy, readConnection: readProductionConnection, readCandidateMigrations }),
    schema: createSchemaEvidenceReader({ policy: productionPolicy, readConnection: readProductionConnection, readCandidateSchemas }),
    vercel,
    readCandidateSchemas,
    now
  });
  let baselineUrl;
  const observer = { async collect(bundle) {
    const evidence = await composedObserver.collect(bundle);
    baselineUrl = evidence.recovery.baselineUrl;
    return evidence;
  } };
  const readApproval = createGithubReleaseRunReader({ policy, readJson: readControlJson, now });
  const verifyProvenance = createArtifactProvenanceVerifier({ policy, manifestPath, attestationPath, runVerifier: runAttestationVerifier });
  const deployer = createVercelPrebuiltDeployer({
    policy,
    outputRoot,
    verifyProvenance,
    runCli: runPrebuiltCli,
    baseline: (bundle) => vercel.baseline(bundle),
    now
  });
  return createGithubReleaseExecutor({
    policy,
    readApproval,
    observer,
    ledger: createPostgresReleaseLedger({ policy, query: ledgerQuery, now }),
    deployer,
    verifyDeployment: async ({ bundle, deploymentId: deploymentId2 }) => {
      if (!baselineUrl) throw Error("Verified rollback baseline unavailable");
      return vercel.verifyNew(bundle, deploymentId2, baselineUrl);
    },
    now
  });
}
export {
  createControlReleaseRuntime
};
